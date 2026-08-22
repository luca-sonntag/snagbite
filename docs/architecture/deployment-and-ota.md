# 🚀 Deployment, Play Store Releases & OTA Updates

## 1. Native Build & Release-Pipeline (Google Play Store)

### Gradle & Dev-Port-Forwarding
* **Automatisches Live-Reload Port-Forwarding:** In `frontend/android/app/build.gradle` führt die Task `reversePorts` vor jedem Build (`preBuild.dependsOn reversePorts`) automatisch `adb reverse tcp:5173 tcp:5173` aus. Dies stellt sicher, dass der Android Emulator/das Testgerät im Live-Reload-Modus stets Verbindung zum Vite-Dev-Server auf dem Host hat.

### Splash-Screen-Hang Diagnosen & Schutz
* **Fehlender Vite-Dev-Server (`cap:live`-Builds):** Live-Reload-APKs rendern Inhalte zur Laufzeit vom Vite-Dev-Server (`SplashScreen.launchAutoHide: false`). Läuft der Vite-Dev-Server nicht (`localhost:5173`), bleibt die App unendlich auf dem Splash-Screen hängen. **Fix:** `cd frontend && npm run dev`. Statische Release-APKs (`frontend/dist/`) sind davon unbetroffen.
* **JS-Runtime-Fehler im React-Mount:** React-Hydrationsfehler (z.B. `<p>` mit verschachteltem `<div>` aus Popover) können das Render unterbrechen. **Schutz:** `MainActivity.java` setzt einen 3-Sekunden-Safety-Timeout, der den Splash via `Capacitor.Plugins.SplashScreen.hide()` zwangsweise ausblendet.

### Auto-Versioning & Fastlane in Docker
* **Signing:** Keystore-Credentials liegen in der gitignorten `keystore.properties`-Datei.
* **Versionierung (Single Source of Truth):** `versionCode` und `versionName` werden aus `version.properties` gelesen. `frontend/vite.config.ts` injiziert diese als `__APP_VERSION__`/`__APP_BUILD__` in den Client (`frontend/src/version.ts`).
* **Release-Skripte:**
  * `frontend/scripts/release.ps1`: Inkrementiert `versionCode`, bumpt optional `versionName` (`-Bump patch|minor|major`), baut Frontend, synct Capacitor und baut signierte `.aab`.
  * `frontend/scripts/deploy-playstore.ps1`: Baut und lädt die `.aab` via Fastlane in Docker (`ruby:3.3-slim`) auf den gewählten Play Store Track (`internal`, `alpha`, `beta`, `production`).
  * `deploy.ps1` (Root): Orchestriert Backend-Deploy (Git Merge `develop` -> `master` + Tagging für Railway) und Play Store App-Release nacheinander oder parallel.

### AdMob Konfiguration & Native Android Setup
* **`AndroidManifest.xml`:** Konfiguriert die Google Mobile Ads App-ID via `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-..." />`.
* **Umgebungsvariablen (`frontend/.env.production`):**
  * `VITE_ADMOB_BANNER_ID`: Live Ad-Unit-ID für Standard- & MREC-Banner (fällt bei fehlender Angabe auf Googles öffentliche Test-Ad-Unit zurück).
  * `VITE_ADMOB_REWARDED_ID`: Live Ad-Unit-ID für Rewarded Video Ads.
  * `VITE_ADMOB_TEST_DEVICES`: Kommagetrennte Liste registrierter Test-Device-IDs, um versehentliche Eigen-Impressionen während des Debuggings zu verhindern.
* **WebView Overscroll Fix (`MainActivity.java`):** Das standardmäßige Android 12+ Stretch-Overscroll-Verhalten der WebView wurde deaktiviert (`setOverScrollMode(View.OVER_SCROLL_NEVER)`), um unruhige Verschiebungen fixierter nativer AdMob-Banner bei Scroll-Gesten zu verhindern.

---

## 2. Self-Hosted OTA Live Updates (Capgo)

Web-Assets der nativen App können Over-The-Air (OTA) aktualisiert werden, ohne ein neues Play-Store-Release zu erzwingen (gilt **nur** für den Web-Layer; native Plugin-Änderungen erfordern ein APK/AAB-Release).

* **Plugin:** `@capgo/capacitor-updater` im **Manual-Mode** (`autoUpdate: false` in `capacitor.config.ts`, `resetWhenUpdate: true`, `appReadyTimeout: 10000`).
* **Kanäle:** `production`, `alpha` + `internal` (spiegeln Play-Tracks). `production` und `alpha` zielen auf `snagbite-prod`, `internal` zielt auf `snagbite-dev` & Dev-Backend. Kanalwahl: `localStorage['snagbite.otaChannel']` -> sonst `alpha` bei `tier === 'alpha'` -> sonst `production`.

### Supabase Storage & Datenbank
* **Bucket `app-bundles` (public):** Speichert Zips unter `{channel}/{version}.zip`.
* **Tabelle `app_bundles`:** `channel`, `version` (`{VERSION_NAME}-ota.{n}`), `storage_path`, `checksum` (sha256 hex), `min_version_code`, `max_version_code`, `active`, `notes`.
* Ein partieller Unique-Index erzwingt **max. ein aktives Bundle pro Kanal**. `min_version_code` / `max_version_code` verhindern Inkompatibilitäten mit nativen Shells.

### Backend & Client Workflow
* **Endpoint `POST /api/app-updates/check` (`backend/src/appUpdates.ts`):** Vor auth-gated Router gemountet. Erhält `{ channel, versionCode, currentBundleVersion }` und antwortet mit Update-Metadaten oder `{ update: false }`.
* **Client Updater (`frontend/src/utils/otaUpdater.ts`):** Inert auf Web/Dev. Beim Boot sofort `CapacitorUpdater.notifyAppReady()` (Anti-Brick-Contract: verhindert Revert zum vorherigen Bundle). Lädt bei Update das Zip herunter (`download`) und setzt `next({id})` für die Anwendung beim nächsten Relaunch.
* **Zentrale Git-Utilities (`frontend/scripts/git-utils.ps1`):** Bündelt wiederverwendbare Git-Hilfsfunktionen (`Assert-GitClean`, `Invoke-GitMasterMergeAndTag`, `Cap-StaleAppBundles`). Bei jedem nativeren Play Store Build (`release.ps1` / `deploy-playstore.ps1`) deckelt `Cap-StaleAppBundles` automatisch alte, nach oben offene OTA-Bundles in Supabase (`max_version_code = newVersionCode - 1`), damit neu installierte native App-Releases nicht auf ältere OTA-Assets zurückgesetzt werden.
* **Deploy-Skript (`frontend/scripts/deploy-ota.ps1` / `npm run deploy:ota`):** Baut Frontend (`npm run build`), ermittelt nächste Bundle-Version (`{VERSION_NAME}-ota.{n}`), packt Zip per `tar.exe`, berechnet SHA256-Checksum, lädt ins Storage hoch, aktiviert die Row in Supabase, mergt `develop` -> `master` und erstellt/pusht automatisch ein Git Tag (`v{VERSION_NAME}-ota.{n}`).

### Rollback-Ebenen
1. **Server-Rollback:** `active`-Flags flippen via Admin-PATCH (`/api/admin/app-bundles/:id`) oder Supabase Dashboard.
2. **Device Auto-Revert:** Fehlendes `notifyAppReady()` innerhalb 10 Sekunden veranlasst das Plugin zum automatischen Fallback auf das vorherige funktionierende Bundle.
3. **Play-Store-Release Reset & OTA-Guard:** `resetWhenUpdate: true` löscht alle gecachten OTA-Bundles auf dem Gerät bei jedem Play-Store-App-Update. `Cap-StaleAppBundles` verhindert, dass neuere Native-Shells alte ungepinnte OTA-Bundles vom Server anfordern.

---

## 3. Containerized Server Deployment (Railway & Docker)

* **Multi-Stage Dockerfile:** Multi-stage Build (`node:22-alpine`). Installiert systemseitig `ffmpeg`, `python3` (für yt-dlp) und `ttf-dejavu`.
* **Stateless Deployment:** Backend und Frontend-Assets statisch gebündelt.
