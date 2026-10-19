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
*Keine offenen Secrets.*

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
