# Dev-Environment & Mobile-Preview-Loop

Ziel: **Unterwegs per Claude Code ein Feature entwickeln → das Ergebnis direkt am Smartphone
testen → bei Erfolg den PR mergen.**

Dafür gibt es eine geteilte **Dev-Umgebung** (Dev-Backend + Dev-Supabase)
und ein **statisches Web-Preview** des Frontends, das im Handy-Browser geöffnet wird. Ein
Test-User-Auto-Login überspringt den Login-Screen, sodass die App sofort im eingeloggten Zustand
gerendert wird.

```
Claude pusht Branch/PR
        │
        ▼
Railway baut  ──►  Dev-Backend (API)          ─┐
              └►  statisches Frontend-Preview  ─┤──►  Dev-Supabase (self-hosted, geteilt)
        │                                        │        (Test-User Account)
        ▼                                        │
Preview-URL am PR  ──►  am Handy öffnen  ──►  Test-User bereits eingeloggt  ──►  testen  ──►  mergen
```

Der native Android-Build (Play Store) ist davon **unberührt** — der Web-Preview ist nur der
schnelle Test-Loop. Native-only Funktionen (nativer Google-Login, RevenueCat-Kauf, lokale
Notifications) laufen im Browser nicht; der Test-User-Login deckt das für Feature-Tests ab.

---

## Repo-Bausteine (bereits im Code)

| Baustein | Datei | Zweck |
|----------|-------|-------|
| Env-Flags | `frontend/src/env.ts` | `VITE_TEST_LOGIN` + Test-User-Creds, ein Ort für den Auth-Bypass |
| Auto-Login | `frontend/src/context/AuthContext.tsx` | Bei `TEST_LOGIN_ENABLED` automatischer `signInWithPassword` → echtes JWT |
| Dev-Env | `frontend/.env.development` | Nicht-geheime Flags (`VITE_TEST_LOGIN=true`); URLs/Keys via Railway/`.local` |
| Web-Serve | `frontend/railway.json`, Script `build:dev` / `serve:dev`, Dev-Dep `serve` | Statisches Hosting des `dist` (`serve -s dist -l $PORT`) |
| Seed | `backend/src/scripts/seedDev.ts`, Script `seed:dev` | Provisionierung des Test-Users in Dev-Supabase |

**Sicherheit:** Der Auto-Login ist hart hinter `VITE_TEST_LOGIN` — im Prod/Play-Store-Build ist die
Flag ungesetzt und der Code inaktiv. Test-Credentials stehen **nie** im Repo, sondern nur in
Railway-Build-Variablen bzw. in `frontend/.env.development.local` (git-ignored via `.env*.local`).

---

## Einmalige Einrichtung (Dashboards)

### 1. DB-Schema anwenden (Supabase CLI Migrations)

Das Projekt nutzt ab Release 1.1.9 das offizielle **Supabase CLI Migrationssystem** (`supabase/migrations/`).
Alle Änderungen liegen als versionierte, chronologische SQL-Dateien vor.

* **Befehle (`package.json`):**
  * `npm run db:status`: Zeigt den Status lokaler vs. angewendeter Migrationen an.
  * `npm run db:push`: Wendet alle ausstehenden Migrationen auf die konfigurierte Datenbank an.
  * `npm run db:new <name>`: Erstellt eine neue leere Migrationsdatei mit aktuellem Zeitstempel.
  * `npm run db:repair -- --status applied <version>`: Markiert eine Migration manuell als angewendet.
  * `npm run db:backup:prod`: Sichert alle Tabellen der Production-DB per Service-Key in eine lokale JSON-Datei (Free-Tier-kompatibel).
  * `npm run db:backup:dev`: Sichert alle Tabellen der Dev-DB per Service-Key in eine lokale JSON-Datei.
  * `npm run db:restore:prod -- [--confirm]`: Stellt Tabellen aus dem neuesten Production-Backup wieder her (Dry-Run ohne `--confirm`).
  * `npm run db:restore:dev -- [--confirm]`: Stellt Tabellen aus dem neuesten Dev-Backup wieder her (Dry-Run ohne `--confirm`).

* **Frische Datenbank (Dev oder Test):**
  Einfach alle Migrationen von Anfang an durchlaufen lassen:
  ```powershell
  npx supabase db push --db-url "$DATABASE_URL"
  ```
  *(Durchläuft automatisch `20260807000000_baseline_v1_1_9.sql` bis zur aktuellsten Migration).*

* **Bestehende Produktions-Datenbank (Stand Release v1.1.9):**
  Da der Stand `v1.1.9` in Production bereits existiert, wird die Baseline zuerst als `applied` markiert und anschließend das Delta gepusht:
  ```powershell
  # 1. Baseline als bereits ausgeführt registrieren:
  npx supabase migration repair --status applied 20260807000000 --db-url "$PROD_DATABASE_URL"

  # 2. Alle nachfolgenden Migrationen (Split, Frames, Mappings, Meal Plans, Pantry, Nutrition) transaktional ausführen:
  npx supabase db push --db-url "$PROD_DATABASE_URL"

  # 3. Falls die Datenbank über PostgREST/Service-Key statt CLI migriert wird:
  npm run migrate:flatten-ingredients -w backend
  ```
  `jobs_legacy` bleibt als Rollback in der DB erhalten. Verification-Queries können mit `backend/db/migrations/001_verify.sql` gegen `jobs_legacy` ausgeführt werden.

### 2. Dev-Supabase self-hosted auf Railway

- Neues Railway-**Dev-Environment** (getrennt von Prod) anlegen.
- Supabase über das **offizielle Supabase-Railway-Template** deployen (Postgres, GoTrue, PostgREST,
  Storage, Kong).
- Schema einspielen: zuerst `backend/db/schema.sql`, dann `backend/supabase_schema.sql`
  (frische DB — sonst die Migrations-Reihenfolge aus Schritt 1 oben).

### 3. Dev-Backend auf Railway

Service im Dev-Environment mit Repo-Root als Build-Context:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` → Dev-Supabase
- `GEMINI_API_KEY`, `APIFY_TOKEN` → müssen gesetzt sein
- `ROLE=web`
- `CORS_ORIGIN` auf Preview-Domain(s).

### 4. Frontend-Preview auf Railway

- Service mit Root-Directory `frontend` (`frontend/railway.json`).
- Build-Variablen: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_TEST_LOGIN=true`, `VITE_TEST_USER_EMAIL`, `VITE_TEST_USER_PASSWORD`.

### 5. Test-User anlegen (Seed)

```bash
cd backend
SUPABASE_URL=<dev> SUPABASE_SECRET_KEY=<dev-service-key> \
SEED_TEST_USER_EMAIL=test@dev.snagbite.local SEED_TEST_USER_PASSWORD=<pw> \
npm run seed:dev
```

Legt den Test-User (email-confirmed) in GoTrue Auth an. Idempotent. Verweigert die Ausführung bei
Produktions-URLs.

---

## Lokal testen (ohne Railway)

```bash
# 1. Secrets für den lokalen Lauf (git-ignored)
cat > frontend/.env.development.local <<'EOF'
VITE_SUPABASE_URL=<dev-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<dev-anon-key>
VITE_API_BASE_URL=<dev-backend-url-oder-leer-für-proxy>
VITE_TEST_USER_EMAIL=test@dev.snagbite.local
VITE_TEST_USER_PASSWORD=<pw>
EOF

# 2. Dev-Server (auto-login als Test-User)
npm run dev -w frontend
# 3. Production-artiger Build wie in Prod servieren
```bash
npm run build:dev -w frontend
npm run serve:dev -w frontend   # http://localhost:4173
```

Erwartung: Die App landet **direkt in der Haupt-UI** (Katalog mit Seed-Rezepten), nicht auf dem
Login-Screen.

## Regression / Sicherheit prüfen

- `npm run build -w frontend` (ohne `VITE_TEST_LOGIN`) baut unverändert; der Auto-Login-Code ist
  inaktiv → Play-Store-Build ist nicht betroffen.
- Test-Credentials tauchen nie im Repo auf (nur `.env*.local` / Railway-Variablen).
