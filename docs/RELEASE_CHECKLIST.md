# 🚀 Release-Checkliste: Next Release & Deployment To-Dos

> **Pflicht-Dokument für Entwickler & KI-Agenten:**  
> Dieses Dokument sammelt alle ausstehenden Aufgaben, Datenbank-Migrationen, Umgebungsvariablen, Backfills und Verifikationsschritte, die **vor oder während des nächsten Releases** (`develop` → `master` / Railway Production / Google Play Store) zwingend ausgeführt werden müssen.
>
> ⚠️ **Agenten-Regel:** Sobald eine Änderung implementiert wird, die beim Release eine Aktion erfordert (z. B. `drizzle-kit push`, Backfill-Skript, neue Environment-Variable, Capacitor-Plugin etc.), **MUSS** dies sofort in diese Checkliste eingetragen werden.

---

## 📌 Nächstes Release (v1.2.x / Upcoming Release)

**Status:** Offen für neue Features auf `develop`  
**Letztes Update:** 2026-10-28  

### 🗄️ 1. Datenbank & Schema-Updates (Railway PostgreSQL)
- [ ] **Tabelle `households` in Production bereitstellen:**
  - **Befehl:** `npm run db:push:prod` im `backend/`-Verzeichnis ausführen.
  * **Grund:** Neue Tabelle `households` für den Household-Modus (1:1 Partner-Verknüpfung, 7-Tage-Trial, Cooldowns & Partner-Anstupsen).
  * **Dringlichkeit:** Zwingend vor oder zeitgleich mit dem Backend-Deploy.

### 🔐 2. Umgebungsvariablen & Secrets (Railway & Frontend)
- [ ] **Operator Alerts (ntfy) auf Railway konfigurieren (optional, Master-Switch standardmäßig aus):**
  - ALERTS_ENABLED: auf true setzen, um Benachrichtigungen zu aktivieren.
  - NTFY_ALERTS_TOPIC: ein eigenes, geheimes Topic für Admin-Alerts eintragen (z. B. snagbite-admin-alerts-<random-uuid>).
  - NTFY_TOKEN: optionales Access-Token eintragen, falls ein reserviertes ntfy-Topic genutzt wird.
  - ALERTS_INCLUDE_PII: optional auf true, falls maskierte E-Mails und Feedback-Auszüge mitgeschickt werden sollen (standardmäßig false zur DSGVO-Datenminimierung).
  - Commits: d7a7c58b, ee8cea2f, 7df42e75, a174048, 5323b67e.
- [ ] **Tigris S3 Endpoint & Credentials auf Railway prüfen (Vereinheitlichung auf AWS_*):**
  - Storage-Umgebungsvariablen wurden auf native `AWS_*`-Variablen vereinheitlicht (`AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BUCKET_NAME`).
  - `AWS_ENDPOINT_URL_S3` (oder Fallback `S3_ENDPOINT`) muss auf `https://t3.storage.dev` zeigen (nicht `storageapi.dev`).
  - Redundante manuelle `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET_NAME` im Railway Dashboard können entfernt werden, da das Backend nun direkt die nativen Tigris-Plugin-Variablen verwendet.
  - Commits: `068b6859`, `5fde45c8`, `bff0f4dd`.

### ☁️ 3. Externe Dienste & Cloudflare
*Keine offenen Tasks.*

### 📦 4. Dependencies & Pakete
*Keine offenen Packages.*

### 📱 5. Deployment-Strategie & Mobile App
*Keine offenen nativen Änderungen.*

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
