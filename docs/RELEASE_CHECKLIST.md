# 🚀 Release-Checkliste: Next Release & Deployment To-Dos

> **Pflicht-Dokument für Entwickler & KI-Agenten:**  
> Dieses Dokument sammelt alle ausstehenden Aufgaben, Datenbank-Migrationen, Umgebungsvariablen, Backfills und Verifikationsschritte, die **vor oder während des nächsten Releases** (`develop` → `master` / Railway Production / Google Play Store) zwingend ausgeführt werden müssen.
>
> ⚠️ **Agenten-Regel:** Sobald eine Änderung implementiert wird, die beim Release eine Aktion erfordert (z. B. `drizzle-kit push`, Backfill-Skript, neue Environment-Variable, Capacitor-Plugin etc.), **MUSS** dies sofort in diese Checkliste eingetragen werden.

---

## 📌 Nächstes Release (v1.2.x / Upcoming Release)

**Status:** Offen für neue Features auf `develop`  
**Letztes Update:** 2026-10-20  

### 🗄️ 1. Datenbank & Schema-Updates (Railway PostgreSQL)
*Keine offenen DB-Aufgaben.*

### 🔐 2. Umgebungsvariablen & Secrets (Railway & Frontend)
- [ ] **Operator Alerts (ntfy) auf Railway konfigurieren (optional, Master-Switch standardmäßig aus):**
  - ALERTS_ENABLED: auf 	rue setzen, um Benachrichtigungen zu aktivieren.
  - NTFY_ALERTS_TOPIC: ein eigenes, geheimes Topic für Admin-Alerts eintragen (z. B. snagbite-admin-alerts-<random-uuid>).
  - NTFY_TOKEN: optionales Access-Token eintragen, falls ein reserviertes ntfy-Topic genutzt wird.
  - ALERTS_INCLUDE_PII: optional auf 	rue, falls maskierte E-Mails und Feedback-Auszüge mitgeschickt werden sollen (standardmäßig alse zur DSGVO-Datenminimierung).
  - Commits: d7a7c58b, ee8cea2f, 7df42e75, a174048, 5323b67e.
- [ ] **Tigris S3 Endpoint & Credentials auf Railway prüfen:**
  - `S3_ENDPOINT` muss auf `https://t3.storage.dev` zeigen (nicht `storageapi.dev`).
  - Im Railway Dashboard prüfen, ob `S3_ACCESS_KEY_ID` und `S3_SECRET_ACCESS_KEY` im Backend-Service mit den aktiven Keys des Tigris-Storage-Plugins übereinstimmen. Alternativ können sie entfernt werden, damit das Backend automatisch auf die nativen Plugin-Variablen `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` und `BUCKET_NAME` zurückgreift.
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
   - Erledigte Punkte abhaken.
   - Den Block unten in `## 📜 Archivierte Releases` verschieben.
   - Einen neuen leeren Block für das nächste Release anlegen.

---

## 📜 Archivierte Releases

### 🏁 Release v1.2.0 (Code 33) – 2026-10-20 (Google Play Production & Railway Backend)

- [x] **`npm run db:push:prod` ausgeführt:**
  - Neue JSONB-Spalte `user.metadata` in `backend/src/db/schema/auth.ts`.
  - Spalten `source_url_normalized`, `language` und Index `recipes_source_normalized_lang_idx` in `recipes.ts`.
  - Spalte `language` in `jobs.ts`.
  - Additive Tabellen `recipe_shares` und `cook_event_reactions` in `social.ts`.
  - Dropped `collections.emoji`.
- [x] **`npm run db:functions:prod` ausgeführt:**
  - Aktualisierte Postgres Stored Procedure `complete_job` mit `pipeline_version := COALESCE(v_recipe.pipeline_version, 1)`.
- [x] **Rezept-URLs & Sprache Backfill ausgeführt:**
  - `npm run db:backfill-recipe-urls:prod -w backend` erfolgreich ausgeführt.
- [x] **Legacy-Sektionen Backfill ausgeführt:**
  - `npm run backfill:sections:prod -w backend` erfolgreich ausgeführt.
- [x] **Tigris S3 Synchronisation:**
  - Master-Icons via `npm run icons:sync:s3:prod` synchronisiert.
  - Open Food Facts SQLite Dump via `npm run off:sync:s3:prod -w backend` synchronisiert.
- [x] **Cloudflare Whisper-Proxy & Secrets:**
  - Cloudflare Worker mit neuem Header aktualisiert.
  - Secrets auf Railway und Cloudflare (`WHISPER_HMAC_SECRET`, etc.) abgeglichen.
- [x] **Native Android Shell & Google Play Release:**
  - `@capacitor/filesystem` hinzugefügt für Cover-Bild Übergabe beim WhatsApp/Messenger Rezept-Sharing.
  - Release Notes für `de-DE` und `en-US` in Fastlane-Metadaten hinterlegt.
  - AAB Version 1.2.0 (Code 33) in der Google Play Console zur Produktions-Überprüfung eingereicht.
- [x] **Backend Deploy:**
  - `develop` erfolgreich in `master` gemergt und auf Railway Production bereitgestellt.
