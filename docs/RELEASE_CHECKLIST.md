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

- [ ] **`WHISPER_HMAC_SECRET` auf Railway setzen (`backend` & `worker` Services):**
  - **Zweck:** Geheimer Schlüssel zum Signieren der flüchtigen HMAC-SHA256 Tickets (`whisperTicket`). Ohne diesen Key kann der Client keine autorisierten Transkriptionen beim Cloudflare Edge Proxy anfordern.
  - **Ausführung:** In `backend/.env.production` eintragen und via `npm run railway:env:prod` synchronisieren (oder direkt im Railway Dashboard).
- [ ] **`CLOUDFLARE_WHISPER_ENDPOINT` auf Railway setzen:**
  - **Wert:** `https://snagbite-whisper-proxy.snagbite.workers.dev`
  - **Zweck:** URL des Edge Workers, die dem Client für die Audio-Transkription übergeben wird.
- [ ] **`HEALTHCHECK_WHISPER_URL` im Railway `healthcheck`-Service (Optional):**
  - *(Optional, da im Code bereits ein Default auf `https://snagbite-whisper-proxy.snagbite.workers.dev` hinterlegt ist).*

---

### ☁️ 3. Externe Dienste: Cloudflare Worker (`snagbite-whisper-proxy`)

- [ ] **Cloudflare Worker Secrets prüfen:**
  - Sicherstellen, dass im Cloudflare Worker `snagbite-whisper-proxy` folgende Secrets hinterlegt sind:
    - `CLOUDFLARE_ACCOUNT_ID`
    - `CF_AIG_TOKEN`
    - `WHISPER_HMAC_SECRET` *(muss exakt mit Railway übereinstimmen!)*
    - `GROQ_API_KEY` *(falls nicht direkt im Cloudflare AI Gateway gespeichert)*
- [ ] **Cloudflare Worker Update deployen (`npm run deploy --prefix cloudflare-workers/whisper-proxy`):**
  - **Zweck:** Neuer Header `cf-aig-collect-log-payload: false` (Commit `8d12b9f4`), um Payload-Logging im Cloudflare AI Gateway zu deaktivieren.
  - *(Hinweis: Vor dem Release mit `npm run deploy --prefix cloudflare-workers/whisper-proxy` deployen).*

---

### 📦 4. Dependencies & Pakete

- [x] **`driver.js` Frontend-Dependency:**
  - In `frontend/package.json` hinzugefügt für die NUX Spotlight Tours.
  - Wird per Vite dynamisch (`import('driver.js')`) in das Frontend-Bundle kompiliert. Kein nativer Build zwingend erforderlich; läuft vollständig über Web-Assets.

---

### 📱 5. Deployment-Strategie & Mobile App

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

### 🧪 6. Pre-Release Smoke Tests (Staging / Dev & Prod)

- [ ] **Spotlight Tours verifizieren:**
  - In den Einstellungen unter *Hilfe & Feedback* auf *„Screen-Touren & Tipps zurücksetzen“* tippen.
  - Bildschirme aufrufen (`/` Extrakt, `history` Katalog, `recipeDetails`, `cookingMode`, `shoppingList`, `mealPlanner`) und prüfen, ob die Touren zentriert und ohne Layout-Fehler angezeigt werden.
- [ ] **Metadata Sync testen:**
  - Prüfen, ob `PATCH /api/me/metadata` den Status `tourDismissed` dauerhaft im Backend speichert, sodass Touren nach Abschluss nicht erneut aufpoppen.
- [ ] **Whisper-Proxy Healthcheck verifizieren:**
  - `curl https://snagbite-whisper-proxy.snagbite.workers.dev/health` muss HTTP 200 `{ status: "ok", upstream: "groq" }` liefern.
- [ ] **Single-Use Ticket Replay-Schutz testen:**
  - Nach einem ersten erfolgreichen Aufruf muss derselbe Ticket-Header beim zweiten Versuch mit HTTP 401 `TICKET_ALREADY_USED` abgewiesen werden.
- [ ] **End-to-End Client-Payload & Kosten-Aggregation prüfen:**
  - Video-Reel mit Tonspur extrahieren.
  - Prüfen, ob der Client `videoDurationSeconds`, `videoSizeBytes` und `whisperModel` an `/api/extract-recipe/client-payload` sendet.
  - Sicherstellen, dass im Backend `jobs.media_bytes` gespeichert wird und in `llmUsage.whisper` sowie `gemini_logs` (`requestType: 'transcribe_audio'`) die dynamischen Groq-Whisper-Kosten verbucht werden (ohne hardcodiertes Modell).

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
