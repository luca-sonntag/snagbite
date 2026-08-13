# ⚙️ Backend & Datenbank (Node.js & Supabase Postgres)

## 1. Processing- & Database-Layer

* **Technologie:** Express.js, TypeScript (ausgeführt über `tsx` / Direct-Node execution), Node.js 22+ (erforderlich für `@supabase/supabase-js` native WebSockets).
* **Datenbank:** Supabase Postgres (`backend/src/db.ts`) mit Row-Level Security (RLS) über `@supabase/supabase-js`. Alle benutzerbezogenen Queries filtern mit `.eq('user_id', userId)`, um mandantenfähige Isolation zu gewährleisten. Interne Queue-Operationen (`getNextPendingJob`, `updateJob`) arbeiten ohne User-Scoping.
* **Authentifizierung:** Supabase Auth JWT-Verifikation (`backend/src/auth.ts`). Die Middleware `requireAuth` validiert den `Authorization: Bearer <token>` Header, extrahiert die User-ID via `auth.getUser(token)` und reicht sie als `req.userId` an alle Route-Handler weiter. Unterstützt sowohl E-Mail/Passwort- als auch Google OAuth-Authentifizierung nahtlos.
* **RLS-Policies:** Die `jobs`-Tabelle ist mit vier RLS-Policies abgesichert: `SELECT`/`INSERT`/`UPDATE`/`DELETE` – alle an `auth.uid() = user_id` gebunden. Der `user_id`-Fremdschlüssel referenziert `auth.users.id`.
* **Funktion:** Das Backend dient als asynchroner Job-Orchestrator, verwaltet Jobs und lädt Audiodateien temporär herunter.

### History, ID-Vergabe & Verwaltung
* Bietet Helper-Funktionen (`getAllJobs(userId)` und `deleteJob(id, userId)`) zur persistenten Abfrage und Bereinigung von Extraktionen – stets benutzerbezogen.
* Stellt REST-Endpunkte bereit: `GET /api/jobs` (liefert den Extraktionsverlauf des authentifizierten Users), `DELETE /api/jobs/:id` (löscht ein bestimmtes Rezept des Users) und `DELETE /api/users/me` (löscht das Benutzerkonto über die Supabase Admin API).
* **Eindeutige Identifikation:** Normalisiert Rezepte bei Abfragen und versieht sie mit einer eindeutigen `id` (entspricht der `jobId`), um Kollisionen zwischen Rezepten mit gleichem Titel zu unterbinden.
* **Caching-Deaktivierung:** Setzt explizit `Cache-Control` Header (`no-store, no-cache, must-revalidate, proxy-revalidate`) für dynamic endpoints (`/api/jobs` und `/api/jobs/:id`), um zu verhindern, dass Browser veraltete/gecachte Job-Zustände ausliefern.

### Admin-Bereich & RLS-Bypass
Exponiert administrative API-Routen unter `/api/admin/*`, die über die Middleware `requireAdmin` abgesichert sind. Diese Middleware prüft, ob die E-Mail des authentifizierten Nutzers in der kommagetrennten Liste `ADMIN_EMAILS` (in `.env` konfiguriert) enthalten ist.
* **Endpunkte:**
  * `GET /api/admin/check`: Prüft Admin-Status.
  * `GET /api/admin/settings` & `PATCH /api/admin/settings`: Liefert und aktualisiert Werte in `global_settings` (invalidiert den internen Cache).
  * `GET /api/admin/feedback`: Ruft alle In-App Bug-Reports und Feedback chronologisch ab.
  * `GET /api/admin/metrics`: Aggregiert Benutzerzahlen, Rezept-Queue-Status inklusive `failedJobs` Details, sowie Gemini-Token- und Kostenstatistiken. Acceptiert einen `range`-Query-Parameter (`all`, `today`, `3d`, `7d`, `30d`).
* Klickt der Admin in der Queue-Status-Karte auf "Fehlgeschlagen", klappt im Frontend eine Details-Karte mit Fehlergründen, User-E-Mail, Reel-Link und Zeitstempel aller gescheiterten Jobs im ausgewählten Zeitfenster auf.

### Security-Hardening (`backend/src/index.ts`)
* **`helmet`:** Setzt Security-Header. `crossOriginResourcePolicy` ist auf `cross-origin` gesetzt, damit `recipe-images` aus anderen Origins geladen werden können. CSP wird in Production aktiviert.
* **`express-rate-limit`:** Limitiert `/api/*`-Endpunkte auf 100 Requests pro 15-Minuten-Fenster pro IP (`standardHeaders: true`).
* **CORS-Hardening:** In Development permissiv (`http://localhost:5173`), in Production restriktiv über `CORS_ORIGIN` steuerbar. Nur `GET`, `POST`, `DELETE`, `PATCH`, `PUT` erlaubt.
* **`trust proxy`:** Auf `1` gesetzt für korrekte Rate-Limiting-Erkennung hinter Reverse-Proxies.
* **Body-Limit:** `express.json({ limit: '1mb' })` schützt vor Memory-Exhaustion durch große Payloads (Foto-Import nutzt pfad-spezifischen 12MB Parser davor).

### Health-Check (`/health`)
Erweiterter Endpunkt prüft Supabase-Datenbankverbindung via `checkDbHealth()` (HEAD-Request auf `jobs`-Tabelle). Antwortet `200 OK` bei gesunder DB, `503 Service Unavailable` bei Problemen. Liefert `uptime`, `nodeEnv` und `dbConnected`-Status.

---

## 2. Rolling Timeframe Rate Limiting (Extraktionsbegrenzung)

* **Globale Limits:** Gesteuert über `.env`-Umgebungsvariablen / `global_settings`:
  * `EXTRACTION_LIMIT_WINDOW_DAYS` (Default: `1`): Größe des rollierenden Fensters in Tagen.
  * `FREE_MAX_EXTRACTIONS_PER_WINDOW` (Default: `3`): Maximale Anzahl an Extraktionen für Free-User.
  * `PREMIUM_MAX_EXTRACTIONS_PER_WINDOW` (Default: `50`): Maximale Anzahl an Extraktionen für Premium-User.
* **Subscription Tiers:** Standardmäßig im `free` Tier. Sobald Premium gekauft wird, wird das Tier in `app_metadata.tier` auf `premium` gesetzt. Im Alpha-Modus werden Nutzer automatisch in `alpha` eingestuft.
* **Benutzerbezogene Overrides:** In Supabase Auth `app_metadata` gesteuert (`custom_extraction_limit` bzw. `max_extractions_per_window`, z. B. `-1` für unbegrenzt).
* **Nutzererfahrung:** Bei Erreichen des Limits berechnet das Backend die verbleibende Wartezeit minutengenau. Das Frontend übersetzt dies dynamisch und zeigt die genaue Restdauer an.

---

## 3. Cloud-Infrastruktur (Supabase & Railway)

### Supabase (Backend-as-a-Service)
* **Tabelle `jobs`:** Speichert Rezept-Extraktionsjobs und fertige Rezepte (`id`, `url`, `url_normalized`, `status`, `error`, `recipe`, `user_id`, `parent_job_id`, `prompt`, `created_at`, `updated_at`, `locked_at`, `locked_by`).
* **Tabelle `feedback`:** Speichert In-App Bug-Reports & Feedback (`id`, `user_id`, `type`, `message`, `context`, `screenshot_urls`, `created_at`).
* **Storage Buckets:**
  * `recipe-frames` (öffentlich): Extrahierter Frame per Job (`${jobId}/${index}.jpg`).
  * `feedback-screenshots` (privat): Screenshots für Bug-Reports (`${userId}/${feedbackId}/${index}.jpg`, 10-Jahres Signed URL).
  * `recipe-photos` (privat, service-role only): Transienter Foto-Import (`${userId}/${uploadId}/${index}.jpg`).
* **Authentifizierung:** Token-Verifikation erfolgt **lokal** im Backend via JWKS (JSON Web Key Set) über `${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json` mithilfe der `jose`-Bibliothek (kein DB-Roundtrip pro Request).

### Railway (Anwendungs-Hosting)
* Hostet die containerisierte Anwendung stateless.
* **Stateless Scaling (Web vs. Worker):** Gesteuert über Umgebungsvariable `ROLE` (`web` | `worker` | `both`).
  * `web`: Serviert API und Frontend-Assets.
  * `worker`: Führt die asynchrone Queue-Schleife aus (`claimNextJob`, Frame-Extraktion, Gemini-Upload).

---

## 5. Smart AI Push-Benachrichtigungen & FCM Services

* **Hybrid Selection & Copy Generation:** Abendliches Worker-Intervall (`backend/src/notifications/worker.ts`) wählt deterministisch den besten Kandidaten (`pickBestCandidate`) basierend auf Inaktivität, Lieblings-Kategorien oder Rezept-Sammlungen aus. Gemini formuliert anschließend kurze, persönliche Push-Texte (`generateNotificationCopy`) mit Emoji & Gradient-Theme.
* **FCM High-Priority Data-Only Payloads & Icon Generator:** `sendToToken` in `backend/src/push/fcm.ts` versendet reine Data-Payloads mit `title`, `body`, `iconUrl` (`GET /api/push-icon`) und `jobId`. Der PNG-Generator (`bannerGenerator.ts`) isoliert das erste valide Emoji, unterstützt Noto/Twemoji-Hex-Varianten (inkl. `\uFE0F` & ZWJ-Sequenzen) und fällt bei fehlendem Emoji auf themenspezifische Standard-Food-Emojis zurück.
* **Nativer Android FCM Empfänger:** `MyFirebaseMessagingService.java` übernimmt den Empfang auf Android (sowohl im Vordergrund, Hintergrund als auch bei beendeter App via `tools:node="replace"`). Er erzeugt eine native Android-Notifikation mit `setLargeIcon()` (256x256 quadratisches Farbverlauf-PNG), `BigTextStyle`, folgt HTTP➔HTTPS-Redirects manuell und verwendet ein 10s-Timeout. Klick-Payloads werden an Capacitor für direkte Rezept-Navigation weitergereicht.
