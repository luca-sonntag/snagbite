# 🚀 Projekt: Instagram Reel Rezept-Extraktor (Google Antigravityx)

> Wenn nur eine Frage gestellt wird, anstworte einfach, anstatt direkt Änderungen vorzunehmen. Ich werde dann sagen, ob ich die Änderung haben möchte oder nicht.
>
> **🔁 Commit-Strategie:** Während JEDER Session musst du kontinuierlich atomic commits machen. Nach jedem abgeschlossenen logischen Änderungsblock (Feature, Fix, Refactor, Datei-Addition) sofort `git add` der betroffenen Dateien und `git commit` mit einer [Conventional Commits](https://www.conventionalcommits.org/) Nachricht (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`). Niemals `git add -A` — nur selektiv die Dateien staggen, die zum aktuellen logischen Change gehören. Siehe Skill `atomic-commits` für vollständige Regeln.
>
> **📝 Doku & OBSOLETE.md aktuell halten:** Nach JEDER relevanten Code-Änderung (neues Feature, Architekturänderung, neue Komponente, etc.) musst du prüfen, ob die Dokumentation angepasst werden muss. Wenn durch Refactorings oder neue Ansätze alter Code, Heuristiken oder Hilfsfunktionen obsolet werden, musst du diese im Dokument [`docs/OBSOLETE.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/OBSOLETE.md) festhalten.
>
> **⚠️ Abwärtskompatibilität (Breaking Changes Guard):** Wenn eine geplante Änderung möglicherweise **nicht abwärtskompatibel** ist (z. B. Breaking API/Schema-Changes zwischen Frontend und Backend, Datenbank-Inkompatibilitäten oder kaputte Altdaten), darfst du diese NIEMALS eigenmächtig umsetzen. Du musst den Benutzer im `implementation_plan.md` explizit und auffällig (mit `[!WARNING]` / `[!CAUTION]`) darauf hinweisen, das Risiko genau erklären und erst nach ausdrücklicher Rückfrage und Bestätigung durch den Benutzer fortfahren bzw. den Plan anpassen.

---

## 📌 Architektur- & Technik-Dokumentation (Index)

Die detaillierte technische Dokumentation wurde modular in den Ordner [`docs/architecture/`](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture) ausgelagert. Greife gezielt auf die entsprechenden Dateien zu, wenn du an den jeweiligen Modulen arbeitest:

1. 📸 [**Scraping-Layer & Import-Kanäle**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/scraping-and-imports.md)
   * RapidAPI Scraper Provider (Primary), local `yt-dlp` & Apify Actor Fallbacks
   * Bilderkarussell-Posts (Multi-Image Slides) & Handle-Extraktion
   * Foto-Import (Rezeptkarten/Kochbuchseiten OCR, `photo://` synthetische URLs, Supabase `recipe-photos` Storage Hand-off)

2. ⚙️ [**Backend & Datenbank**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/backend-and-database.md)
   * Express.js API, Node 22+ & Supabase Postgres (RLS-Policies & Auth JWTs)
   * Admin-Bereich (`/api/admin/*`), RLS-Bypass, Metriken & Failed Jobs Drilldown
   * Security Hardening (Helmet, Rate Limits, CORS) & Health Check (`/health`)
   * Rolling Timeframe Rate Limiting & Subscription Tiers (`free`, `premium`, `alpha`)
   * Health Check & Push Monitoring (`healthcheck/`, ntfy.sh / Telegram)

3. 🤖 [**KI-Layer (Google Gemini Integration)**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/ai-gemini.md)
   * `@google/generative-ai` SDK, Structured JSON Schemas, Kategorisierung & Mengennormalisierung
   * Mehrfachrezept-Erkennung (`containsMultipleRecipes` & `MULTIPLE_RECIPES` 422 Error Code)
   * Recipe Copilot (AI Function Calling, Two-Phase Remix Confirmation, LLM Quick Chips)
   * Dynamische Frame-Extraktion & Persistentes Gemini Logging (`gemini_logs` DB Table)

4. 🎨 [**Frontend-Layer (React 19 & HeroUI v3)**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/frontend.md)
   * React 19, HeroUI v3, Tailwind CSS v4 PWA & Capacitor Android-App Shell
   * Centralized Contexts (`AuthContext`, `DialogContext`, `I18nContext`) & App-weite Hooks
   * Error-Code Registry (`errorCodes.ts`) & Lokalisierung (DE/EN)
   * 3-Ebenen-Katalog (`CookbookHome`, List-Ebene mit Facetten-Filtern, Detail-Ansicht)
   * Client-seitiges Image Caching (IndexedDB `recipe-image-cache` + `/api/image` Proxy)
   * In-App Koch-Timer (`TimerContext`, `TimerBanner`, `TimerConfirmSheet`) & Share Target Integration
   * In-App Bug-Reports & Feedback (`FeedbackDrawer.tsx` & Console Ring Buffer)

5. 🚀 [**Deployment, Play Store & OTA Updates**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/deployment-and-ota.md)
   * Play Store Build Pipeline (Fastlane in Docker, `version.properties`, `release.ps1`, `deploy-playstore.ps1`)
   * Self-Hosted Capgo OTA Live Updates (`@capgo/capacitor-updater`, Supabase `app_bundles`, Rollback-Strategien)
   * Gradle `reversePorts` Task & Splash Screen Hang Diagnosen

6. 🎮 [**Gamification (Koch-Belohnungen, XP, Streaks)**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/gamification.md)
   * `cook_events` / `point_ledger` / `user_stats` / `user_badges` & `cook-photos` Bucket
   * Server-autoritative Punkte-Engine (`gamification.ts`), tunebare JSON-Formel in `global_settings`
   * `POST /api/jobs/:id/cooked` & `GET /api/me/gamification`, RewardOverlay & Fortschritt-Tab

---

## 🏗️ System- & Workflow-Kurzübersicht

Dieses Projekt analysiert Rezept-Reels (Instagram, TikTok, YouTube Shorts, Websites) sowie abfotografierte Kochbuchseiten via Google Gemini Vision, strukturiert diese in ein präzises JSON-Schema und stellt sie in einem modernen React PWA Dashboard zur Verfügung.

1. **Eingabe:** Share Target / Link-Eingabe oder Foto-Upload (`POST /api/extract-recipe/photos`).
2. **Auth & Jobs:** Supabase JWT Auth Middleware `requireAuth`, Erstellung von `pending`-Jobs in Postgres `jobs`-Tabelle.
3. **Queue & Processing:** Worker claimt Job atomar (`claim_next_job`), führt Scraping/Downloader oder Photo-Fetch durch, baut Video-Grid und ruft Gemini Multimodal API auf.
4. **Structured Recipe Output:** Gemini liefert standardisierte Zutaten, Supermarktkategorien, Nährwerte per Portion und Schritte.
5. **Dashboard & PWA:** Interaktive Checklisten, Portionsrechner, In-App Timers, 3-Ebenen-Katalog mit Sammlungen/Labels, Einkaufsliste, Offline-Bildercache & Recipe Copilot Chat.
