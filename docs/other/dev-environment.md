# Dev-Environment & Mobile-Preview-Loop

Ziel: **Unterwegs per Claude Code ein Feature entwickeln → das Ergebnis direkt am Smartphone
testen → bei Erfolg den PR mergen.**

Dafür gibt es eine geteilte **Dev-Umgebung** (Dev-Backend + Railway Dev-PostgreSQL)
und ein **statisches Web-Preview** des Frontends, das im Handy-Browser geöffnet wird. Ein
Test-User-Auto-Login überspringt den Login-Screen, sodass die App sofort im eingeloggten Zustand
gerendert wird.

```
Claude pusht Branch/PR
        │
        ▼
Railway baut  ──►  Dev-Backend (API)          ─┐
              └►  statisches Frontend-Preview  ─┤──►  Railway Dev-PostgreSQL (Drizzle ORM)
        │                                        │        (Better-Auth Test-User Account)
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
| Auto-Login | `frontend/src/context/AuthContext.tsx` | Bei `TEST_LOGIN_ENABLED` automatischer Better-Auth Login |
| Dev-Env | `frontend/.env.development` | Nicht-geheime Flags (`VITE_TEST_LOGIN=true`); URLs/Keys via Railway/`.local` |
| Web-Serve | `frontend/railway.json`, Script `build:dev` / `serve:dev`, Dev-Dep `serve` | Statisches Hosting des `dist` (`serve -s dist -l $PORT`) |
| Seed | `backend/src/scripts/seed/seedDev.ts`, Script `seed:dev` | Provisionierung des Test-Users in Dev-PostgreSQL via Better-Auth |

**Sicherheit:** Der Auto-Login ist hart hinter `VITE_TEST_LOGIN` — im Prod/Play-Store-Build ist die
Flag ungesetzt und der Code inaktiv. Test-Credentials stehen **nie** im Repo, sondern nur in
Railway-Build-Variablen bzw. in `frontend/.env.development.local` (git-ignored via `.env*.local`).

---

## Einmalige Einrichtung (Dashboards)

### 1. DB-Schema anwenden (Drizzle ORM)

Das Projekt nutzt Drizzle ORM (`backend/src/db/schema/`).
Alle Änderungen liegen als typsichere TypeScript-Schemadefinitionen vor.

* **Befehle (`package.json`):**
  * `npm run db:push`: Wendet Schema-Änderungen auf die DEV-Datenbank an.
  * `npm run db:push:prod`: Wendet Schema-Änderungen auf die Production-Datenbank an.
  * `npm run db:generate`: Generiert SQL-Migrationsdateien (falls benötigt).
  * `npm run db:studio`: Startet Drizzle Studio zur visuellen Dateninspektion.
  * `npm run db:backup:prod`: Sichert alle Tabellen der Production-DB in eine lokale JSON-Datei.
  * `npm run db:backup:dev`: Sichert alle Tabellen der Dev-DB in eine lokale JSON-Datei.
  * `npm run db:restore:prod -- [--confirm]`: Stellt Tabellen aus dem neuesten Production-Backup wieder her.
  * `npm run db:restore:dev -- [--confirm]`: Stellt Tabellen aus dem neuesten Dev-Backup wieder her.
  * `npm run use:prod`: Schaltet die lokale Entwicklungsumgebung auf die Production-Datenbank um (`.env.local`).
  * `npm run use:dev`: Schaltet die lokale Entwicklungsumgebung zurück auf die Dev-Datenbank (entfernt `.env.local`).
  * `npm run use:status`: Zeigt an, mit welcher Datenbank die lokale Entwicklungsumgebung aktuell verbunden ist.

### 2. Dev-PostgreSQL auf Railway

- Postgres Plugin im Railway Dev-Environment deployen.
- Schema einspielen:
  ```powershell
  npm run db:push
  ```

### 3. Dev-Backend auf Railway

Service im Dev-Environment mit Repo-Root als Build-Context:

- `DATABASE_URL` → Railway Dev-Postgres-URL
- `BETTER_AUTH_SECRET` & `APP_URL`
- `GEMINI_API_KEY`, `APIFY_TOKEN` → müssen gesetzt sein
- `ROLE=web`
- `CORS_ORIGIN` auf Preview-Domain(s).

### 4. Frontend-Preview auf Railway

- Service mit Root-Directory `frontend` (`frontend/railway.json`).
- Build-Variablen: `VITE_API_BASE_URL`,
  `VITE_TEST_LOGIN=true`, `VITE_TEST_USER_EMAIL`, `VITE_TEST_USER_PASSWORD`.

### 5. Test-User anlegen (Seed)

```bash
cd backend
DATABASE_URL=<dev-postgres-url> \
SEED_TEST_USER_EMAIL=test@dev.snagbite.local SEED_TEST_USER_PASSWORD=<pw> \
npm run seed:dev
```

Legt den Test-User in Better-Auth (`user` + `account` Tabelle) an. Idempotent. Verweigert die Ausführung bei
Produktions-URLs.

---

## Lokal testen (ohne Railway)

```bash
# 1. Secrets für den lokalen Lauf (git-ignored)
cat > frontend/.env.development.local <<'EOF'
VITE_API_BASE_URL=http://localhost:3000
VITE_TEST_USER_EMAIL=test@dev.snagbite.local
VITE_TEST_USER_PASSWORD=<pw>
EOF

# 2. Dev-Server (auto-login als Test-User)
npm run dev -w frontend
# 3. Production-artiger Build wie in Prod servieren
npm run build:dev -w frontend
npm run serve:dev -w frontend   # http://localhost:4173
```

Erwartung: Die App landet **direkt in der Haupt-UI** (Katalog mit Seed-Rezepten), nicht auf dem
Login-Screen.

## Regression / Sicherheit prüfen

- `npm run build -w frontend` (ohne `VITE_TEST_LOGIN`) baut unverändert; der Auto-Login-Code ist
  inaktiv → Play-Store-Build ist nicht betroffen.
- Test-Credentials tauchen nie im Repo auf (nur `.env*.local` / Railway-Variablen).
