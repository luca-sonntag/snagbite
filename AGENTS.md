# 🚀 Projekt: Instagram Reel Rezept-Extraktor (Google Antigravityx)

> Wenn nur eine Frage gestellt wird, anstworte einfach, anstatt direkt Änderungen vorzunehmen. Ich werde dann sagen, ob ich die Änderung haben möchte oder nicht.
>
> **🔁 Commit-Strategie:** Während JEDER Session musst du kontinuierlich atomic commits machen. Nach jedem abgeschlossenen logischen Änderungsblock (Feature, Fix, Refactor, Datei-Addition) sofort `git add` der betroffenen Dateien und `git commit` mit einer [Conventional Commits](https://www.conventionalcommits.org/) Nachricht (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`). Niemals `git add -A` — nur selektiv die Dateien staggen, die zum aktuellen logischen Change gehören. Siehe Skill `atomic-commits` für vollständige Regeln.
>
> **🛑 Keine Remote-Aktionen / Kein Push ohne Erlaubnis:** Führe NIEMALS eigenmächtig Git-Aktionen auf `origin` oder anderen Remotes aus (insbesondere `git push`, Force-Pushes, Remote-Branches löschen etc.). Push-Befehle dürfen AUSSCHLIESSLICH dann ausgeführt werden, wenn der Benutzer dies explizit anordnet oder ausdrücklich erlaubt.
>
> **🧼 Clean Code & Modularisierung (TypeScript & React):** Halte dich ausnahmslos an die Richtlinien in [`docs/clean-code.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/clean-code.md). Feste Dateigrößen-Grenzen: **Ziel 50–150 Zeilen, Soft Limit 200 Zeilen, Hard Limit 300 Zeilen**. Größere Konstrukte und Komponenten **MÜSSEN** zwingend in Subkomponenten aufgeteilt, State- und Effektlogik in Custom Hooks (`use<Feature>.ts`) ausgelagert und Hilfsfunktionen in Module separiert werden. Strikte Typensicherheit (0x `any`), Early Returns statt tiefer Verschachtelung und Einhaltung des UI Styleguides ([`docs/styleguide.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/styleguide.md)).
>
> **🔀 Merge- & Rebase-Strategie (Ausschließlich lokale Branches):** Wenn der Benutzer `rebase` oder `merge` anweist, betrifft dies AUSSCHLIESSLICH lokale Branches (z. B. lokaler `main`, lokale Feature-Branches), NIEMALS `origin` oder Remote-Tracking-Branches. Branches dürfen NIEMALS als Fast-Forward gemergt werden. Verwende IMMER einen expliziten Merge-Commit: `git merge --no-ff <branch> -m "Merge branch '<branch>' into <target>"`.
>
> **📝 Doku & OBSOLETE.md aktuell halten:** Nach JEDER relevanten Code-Änderung (neues Feature, Architekturänderung, neue Komponente, etc.) musst du prüfen, ob die Dokumentation angepasst werden muss. Wenn durch Refactorings oder neue Ansätze alter Code, Heuristiken oder Hilfsfunktionen obsolet werden, musst du diese im Dokument [`docs/OBSOLETE.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/OBSOLETE.md) festhalten.
>
> **⚠️ Abwärtskompatibilität (Breaking Changes Guard):** Wenn eine geplante Änderung möglicherweise **nicht abwärtskompatibel** ist (z. B. Breaking API/Schema-Changes zwischen Frontend und Backend, Datenbank-Inkompatibilitäten oder kaputte Altdaten), darfst du diese NIEMALS eigenmächtig umsetzen. Du musst den Benutzer im `implementation_plan.md` explizit und auffällig (mit `[!WARNING]` / `[!CAUTION]`) darauf hinweisen, das Risiko genau erklären und erst nach ausdrücklicher Rückfrage und Bestätigung durch den Benutzer fortfahren bzw. den Plan anpassen.
>
> **🚫 Keine sprach- oder inhalts-spezifischen String-Heuristiken (Anti-Fragility):** Schreibe NIEMALS sprachabhängige Keyword- oder Substring-Prüfungen (z. B. `if (name.includes('käse') || name.includes('hähnchen'))`) in UI-, Rendering-, Business- oder Normalisierungs-Logik, um Kategorien, Icons oder Eigenschaften zu erraten. Löse solche Anforderungen IMMER über sauberen Datenfluss (Prop-Passing aus Elternelementen wie `group.name`), strukturierte Enums, zentrale typisierte Taxonomie-Lookups oder Upstream-Datenanreicherung.

---

## 🧼 Code-Standards & Design-System (Global)

* 🧼 [**TypeScript & React Clean Code Guidelines**](file:///c:/Users/lucas/source/repos/cookbook/docs/clean-code.md): Verbindliche Regeln zu Dateigrößen (**max. 150–200 Zeilen, Hard Limit 300**), Modularisierung, Custom Hooks, Subkomponenten-Extraktion & 0x `any`.
* 🎨 [**UI & Design Styleguide**](file:///c:/Users/lucas/source/repos/cookbook/docs/styleguide.md): Vorgaben zu Clean Flat Style, Farbpalette, Typografie, Radien & rahmenlosen Oberflächen (`border-none`).
* 📱 [**Mobile UX & Native App Feeling Guidelines**](file:///c:/Users/lucas/source/repos/cookbook/docs/mobile-ux-rules.md): Verbindliche Richtlinien für Touch-Targets (≥ 44×44px), Haptics, Gesten, Empty States, Transitions & selektierte Zustände.

---

## 📌 Architektur- & Technik-Dokumentation (Index)

Die detaillierte technische Dokumentation wurde modular in den Ordner [`docs/architecture/`](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture) ausgelagert. Greife gezielt auf die entsprechenden Dateien zu, wenn du an den jeweiligen Modulen arbeitest:

1. 📸 [**Scraping-Layer & Import-Kanäle**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/scraping-and-imports.md)
   * RapidAPI Metadata Provider (Metadata & Image Carousel Only, ToS/Copyright-sicher)
   * Bilderkarussell-Posts (Multi-Image Slides) & Handle-Extraktion
   * Foto-Import (Rezeptkarten/Kochbuchseiten OCR, `photo://` synthetische URLs, Supabase `recipe-photos` Storage Hand-off)

2. ⚙️ [**Backend & Datenbank**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/backend-and-database.md)
   * Express.js API, Node 22+ & Supabase Postgres (RLS-Policies & Auth JWTs)
   * Admin-Bereich (`/api/admin/*`), RLS-Bypass, Metriken & Failed Jobs Drilldown
   * Security Hardening (Helmet, Rate Limits, CORS) & Health Check (`/health`)
   * Rolling Timeframe Rate Limiting & Subscription Tiers (`free`, `premium`, `alpha`)
   * Rewarded Video Ad Credits (`app_metadata.bonus_credits`, `POST /api/me/rewarded-ad-claimed`, Quota-Verrechnung)
   * Health Check & Push Monitoring (`healthcheck/`, ntfy.sh / Telegram)

3. 🤖 [**KI-Layer (Google Gemini Integration)**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/ai-gemini.md)
   * `@google/generative-ai` SDK, Structured JSON Schemas, Kategorisierung & Mengennormalisierung
   * Anti-Halluzination & Teaser-Post-Erkennung (`isRecipe: false` & `NOT_A_RECIPE` Error Code)
   * Mehrfachrezept-Erkennung (`containsMultipleRecipes` & `MULTIPLE_RECIPES` 422 Error Code)
   * Recipe Copilot (AI Function Calling, Deterministische Operations-Engine, LLM Quick Chips)
   * Kanonische Zutaten-Auflösung & Open Food Facts Resolver (SQLite FTS5, Exact-Match/Length-Penalty Ranking, 15 Kandidaten)
   * Gamification Foto-Prüfung (`verifyCookedDishPhoto`), Smart Push-Notifications & Persistentes Logging (`gemini_logs`)

4. 🎨 [**Frontend-Layer (React 19 & HeroUI v3)**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/frontend.md)
   * React 19, HeroUI v3, Tailwind CSS v4 PWA & Capacitor Android-App Shell
   * Centralized Contexts (`AuthContext`, `DialogContext`, `ToastContext`, `I18nContext`, `OverlayStackContext`) & App-weite Hooks
   * Error-Code Registry (`errorCodes.ts`) & Lokalisierung (DE/EN)
   * 3-Ebenen-Katalog (`CookbookHome`, List-Ebene mit Facetten-Filtern, Detail-Ansicht)
   * Wochenplaner (`MealPlanner/`, `/#/meal-planner`, Mo–So Mahlzeiten-Slots, Batch-Zutaten-Übernahme in Einkaufsliste)
   * Client-seitiges Image Caching (IndexedDB `recipe-image-cache` + `/api/image` Proxy)
   * In-App Koch-Timer (`TimerContext`, `TimerBanner`, `TimerConfirmSheet`) & Share Target Integration
   * In-App Bug-Reports & Feedback (`FeedbackDrawer.tsx` & Console Ring Buffer)
   * In-App DevTools & Overlay-Controller (`DevTools/`, `window.dev.show` / `dev.help`, 1-Klick Eruda Snippets, `DevOverlayHost`)
   * AdMob Monetarisierung (MREC `ExtractionAdCard`, App-Open Interstitial beim Start, Rewarded Video Ads, UMP Consent, Patched Plugin)

5. 🚀 [**Deployment, Play Store & OTA Updates**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/deployment-and-ota.md)
   * Play Store Build Pipeline (Fastlane in Docker, `version.properties`, `release.ps1`, `deploy-playstore.ps1`)
   * Self-Hosted Capgo OTA Live Updates (`@capgo/capacitor-updater`, Supabase `app_bundles`, Rollback-Strategien)
   * Gradle `reversePorts` Task, AdMob App-ID Setup & Splash Screen Hang Diagnosen
   * [🏁 Google Play Store Go-Live Checklist](file:///c:/Users/lucas/source/repos/cookbook/docs/go-live-checklist.md) (Compliance, AdMob, Billing & Quality Gate)

6. 🎮 [**Gamification (Koch-Belohnungen, XP, Streaks)**](file:///c:/Users/lucas/source/repos/cookbook/docs/architecture/gamification.md)
   * `cook_events` / `point_ledger` / `user_stats` / `user_badges` & `cook-photos` Bucket
   * Server-autoritative Punkte-Engine (`gamification.ts`), tunebare JSON-Formel in `global_settings`
   * `POST /api/recipes/:id/cooked` & `GET /api/me/gamification`, RewardOverlay & Fortschritt-Tab

7. 🥗 [**Ernährungsphysiologische Grundlagen & Nährwerte**](file:///c:/Users/lucas/source/repos/cookbook/docs/nutrition.md)
   * Atwater-Faktoren (4/4/9 kcal/g), Energieverteilung (% kcal) im Makrobalken & Rundung
   * Portionsskalierung, Plausibilitätsprüfungen gegen Creator-Angaben & Wochenplaner-Aggregation

8. 📊 [**Wirtschaftlichkeit, Monetarisierung & Unit Economics**](file:///c:/Users/lucas/source/repos/cookbook/docs/unit-economics.md)
   * Vollständige P&L-Simulation für 100 bis 100.000 Nutzer (Free vs. Premium-Abonnements via RevenueCat)
   * Detaillierte Kostenaufstellung aller LLM-Calls (Gemini 3.1/2.5 Flash-Lite & FLUX.1 [schnell] Cover)
   * Reale AdMob-Monetarisierungsmodelle (Rewarded Video Arbitrage, App-Open Interstitial & MREC)

---

## 🏗️ System- & Workflow-Kurzübersicht

Dieses Projekt analysiert Rezept-Reels (Instagram, TikTok, YouTube Shorts, Websites) sowie abfotografierte Kochbuchseiten via Google Gemini Vision, strukturiert diese in ein präzises JSON-Schema und stellt sie in einem modernen React PWA Dashboard zur Verfügung.

1. **Eingabe:** Share Target / Link-Eingabe oder Foto-Upload (`POST /api/extract-recipe/photos`).
2. **Auth & Jobs:** Supabase JWT Auth Middleware `requireAuth`, Erstellung von `pending`-Jobs in der Postgres-`jobs`-Tabelle (reiner Task; der Inhalt landet über `complete_job()` in `recipes`, der Kochbuch-Eintrag in `user_recipes`).
3. **Queue & Processing:** Worker claimt Job atomar (`claim_next_job`), führt Scraping/Downloader oder Photo-Fetch durch, baut Video-Grid und ruft Gemini Multimodal API auf.
4. **Structured Recipe Output:** Gemini liefert standardisierte Zutaten, Supermarktkategorien, Nährwerte per Portion und Schritte.
5. **Dashboard & PWA:** Interaktive Checklisten, Portionsrechner, In-App Timers, 3-Ebenen-Katalog mit Sammlungen/Labels, Einkaufsliste, Offline-Bildercache & Recipe Copilot Chat.
6. **Monetarisierung & Freemium:** AdMob-Integration (Extraktions-MREC & App-Open Interstitial beim Start), Rewarded Video Ads für Extraktions-Aufstockung (+1 Credit) und RevenueCat In-App Purchases für das werbefreie Premium-Abonnement.
