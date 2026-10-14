# 🚀 Release-Checkliste: Next Release & Deployment To-Dos

> **Pflicht-Dokument für Entwickler & KI-Agenten:**  
> Dieses Dokument sammelt alle ausstehenden Aufgaben, Datenbank-Migrationen, Umgebungsvariablen, Backfills und Verifikationsschritte, die **vor oder während des nächsten Releases** (`develop` → `master` / Railway Production / Google Play Store) zwingend ausgeführt werden müssen.
>
> ⚠️ **Agenten-Regel:** Sobald eine Änderung implementiert wird, die beim Release eine Aktion erfordert (z. B. `drizzle-kit push`, Backfill-Skript, neue Environment-Variable, Capacitor-Plugin etc.), **MUSS** dies sofort in diese Checkliste eingetragen werden.

---

## 📌 Nächstes Release (v1.0.x / Upcoming Production Release)

**Status:** In Vorbereitung auf `develop`  
**Letztes Update:** 2026-10-14  

### 🗄️ 1. Datenbank & Schema-Updates (Railway PostgreSQL)

- [ ] **`npm run db:push:prod` ausführen (Zwingend vor Backend-Deploy)**
  - **Grund:** In Commit `4c5eb9d4` (`feat(backend): add user metadata column and patch endpoint`) wurde in [`backend/src/db/schema/auth.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/db/schema/auth.ts) die neue JSONB-Spalte `metadata` zur Tabelle `user` hinzugefügt:
    ```ts
    metadata: jsonb('metadata')
    ```
  - **Betroffene Endpunkte & Features:**
    - `GET /api/me/metadata` & `PATCH /api/me/metadata` (Persistenz für NUX-Spotlight-Tours, WelcomeGuide-Status & UI-Präferenzen).
  - **Ausführung:**
    ```powershell
    npm run db:push:prod
    ```
  - **Verifikation:** In der CLI-Ausgabe sicherstellen, dass Drizzle die neue Spalte `metadata` auf der Production-Datenbank anlegt und keine unvorhergesehenen Tabellenänderungen anstehen.

---

### 🔐 2. Umgebungsvariablen & Secrets (Railway & Frontend)

- [x] Keine neuen Secrets oder Environment-Variablen für den aktuellen Stand auf `develop` erforderlich.
  - *(Falls neue Variablen hinzukommen: `backend/.env.production` pflegen und `npm run railway:env:prod` ausführen).*

---

### 📦 3. Dependencies & Pakete

- [x] **`driver.js` Frontend-Dependency:**
  - In `frontend/package.json` hinzugefügt für die NUX Spotlight Tours.
  - Wird per Vite dynamisch (`import('driver.js')`) in das Frontend-Bundle kompiliert. Kein nativer Build zwingend erforderlich; läuft vollständig über Web-Assets.

---

### 📱 4. Deployment-Strategie & Mobile App

- [ ] **Release-Kanal bestimmen:**
  - **Option A (Nur Web/OTA – Empfohlen falls keine nativen Plugin-Änderungen):**
    ```powershell
    npm run deploy:ota
    ```
    *Aktualisiert die Web-Assets der App blitzschnell Over-The-Air für alle installierten Apps und Web-Nutzer.*
  - **Option B (Vollständiges Play Store Release via `deploy.ps1`):**
    ```powershell
    .\deploy.ps1 -All -Bump patch
    ```
    *Baut neue signierte AAB, lädt auf Google Play hoch und mergt `develop` -> `master` für Railway Backend.*

---

### 🧪 5. Pre-Release Smoke Tests (Staging / Dev & Prod)

- [ ] **Spotlight Tours verifizieren:**
  - In den Einstellungen unter *Hilfe & Feedback* auf *„Screen-Touren & Tipps zurücksetzen“* tippen.
  - Bildschirme aufrufen (`/` Extrakt, `history` Katalog, `recipeDetails`, `cookingMode`, `shoppingList`, `mealPlanner`) und prüfen, ob die Touren zentriert und ohne Layout-Fehler angezeigt werden.
- [ ] **Metadata Sync testen:**
  - Prüfen, ob `PATCH /api/me/metadata` den Status `tourDismissed` dauerhaft im Backend speichert, sodass Touren nach Abschluss nicht erneut aufpoppen.

---

## 🚀 Standard-Ablauf beim Release

Sobald alle offenen Punkte abgearbeitet werden sollen:

1. **Vorbereitung (DB & Secrets):**
   ```powershell
   npm run db:push:prod
   ```
2. **Backend & App Deploy ausführen:**
   ```powershell
   # Für vollständiges Release (Backend + Play Store AAB):
   .\deploy.ps1 -All -Bump patch

   # ODER für reines Backend-Deploy:
   .\deploy.ps1 -Backend

   # ODER für schnelles Web/OTA-Deploy:
   npm run deploy:ota
   ```
3. **Checkliste archivieren:**
   - Erledigte Punkte abhaken.
   - Den Block unten in `## 📜 Archivierte Releases` verschieben.
   - Einen neuen leeren Block für das nächste Release anlegen.

---

## 📜 Archivierte Releases

*(Bisher keine archivierten Releases in dieser Datei. Erfolgreich durchgeführte Releases werden hier mit Datum, Version und durchgeführten Schritten protokolliert.)*
