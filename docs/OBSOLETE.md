# 🗑️ Obsolete Code & Deprecated References Tracking

Dieses Dokument protokolliert veralteten Code, ersetzte Heuristiken, alte Hilfsfunktionen und ausgemusterte Architekturen im Projekt. Es dient als Referenz, um Wieder-Einführungen alter Anti-Pattern zu verhindern.

---

## 📜 Chronologische Übersicht

### 2026-08-14: Emojis in Einkaufslisten-Kategorien durch schlanke Farb-Pills ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Emojis in den Kategorie-Headern der Einkaufsliste ([`ShoppingListGroup.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ShoppingList/ShoppingListGroup.tsx) mit `getCategoryIcon`).
* **Ersetzt durch:**
  - Schmale, langgezogene abgerundete Farb-Rechtecke (`w-8 h-1 rounded-full`) über den Kategorie-Überschriften mit dedizierten harmonischen Farbwerten pro Supermarkt-Kategorie (`categoryColors` & `getCategoryTheme` in [`frontend/src/i18n.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/i18n.ts)).
* **Betroffene Dateien:** `frontend/src/components/ShoppingList/ShoppingListGroup.tsx`, `frontend/src/i18n.ts`.

---

### 2026-08-13: Legacy `removeExtractionBanner` Tab-Switch Effect in `App.tsx`

* **Ersetzter Code / Anti-Pattern:**
  - Dediziertes `useEffect` in `App.tsx` (`if (activeView !== 'extract' || recipe) void removeExtractionBanner();`), das die Werbung jedes Mal manuell zerstörte, wenn man den `extract`-Tab verließ.
* **Ersetzt durch:**
  - Integrierter Werbe-Slot in der Bottom-Bar ([`ExtractionAdCard`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ExtractionAdCard.tsx)), der sein eigenes Banner-Lifecycle autonom über den Prop `isActive` (`shouldShowBannerAd && !isBottomBarHidden`) steuert.
* **Betroffene Dateien:** `frontend/src/App.tsx`.

---

### 2026-08-05: Photo-Bonus (`photoBonusPct`) aus der Gamification-Formel entfernt

* **Ersetzter Code / Anti-Pattern:**
  - `photoBonusPct` (50 %) in `GamificationConfig` + der entsprechende `+X%`-Block in `computeAward` (`gamificationFormula.ts`), der bei `hasPhoto` die XP um 50 % erhöhte.
  - Der Key im `gamification_config`-Seed-Row (`supabase_schema.sql`) und in `DEFAULT_GAMIFICATION_CONFIG` (`types.ts`).
* **Grund der Ausmusterung:**
  - Ein Fertig­gericht-Foto ist jetzt **Pflicht** (Gemini-Verifizierung in `POST /api/jobs/:id/cooked` vor Akzeptanz). Ein Bonus auf etwas, das ohnehin 100 % der Cooks erfüllen, wäre nur ein versteckter, immer-aktiver Multiplikator — keine echte Belohnung.
  - Die Trust/Verifikations-Flags (`verified`, `leaderboardEligible`, `trustScore`) bleiben an `hasPhoto` gekoppelt; nur der XP-Bonus entfällt.
* **Betroffene Dateien:** `backend/src/types.ts`, `backend/src/gamificationFormula.ts`, `backend/src/gamificationFormula.test.ts`, `backend/supabase_schema.sql`.
* **Achtung:** Nicht wieder einführen, solange das Foto Pflicht bleibt. Falls später ein *optionaler* No-Photo-Modus kommt, kann ein Bonus für freiwillige Fotos sinnvoll sein — dann aber als echter Anreiz, nicht als Default.

### 2026-08-04: FCM Push-Benachrichtigung BigPictureStyle-Banner durch quadratisches Emoji-Icon ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Standard Android `NotificationCompat.BigPictureStyle` mit großem 800x400 PNG Banner (`/api/push-banner`).
* **Ersetzt durch:**
  - Quadratisches 256x256 `setLargeIcon()` PNG mit Theme-Farbverlauf und centered Google Noto Color Emoji (`/api/push-icon`) für sauberes, konsistentes Inline-Layout auf mobilen Geräten.
* **Betroffene Dateien:** `backend/src/notifications/worker.ts`, `frontend/android/app/src/main/java/at/snagbite/app/MyFirebaseMessagingService.java`.

---

### 2026-07-29: Zutaten-Koch-Checkliste & Auto-Check von Vorratsartikeln (Staples)

* **Ersetzter Code / Anti-Pattern:**
  - `checkedIngredients` und `toggleIngredient` zur Nachverfolgung abgehakter Zutaten direkt in der Rezeptansicht.
  - Voreinstellungen für Vorratsartikel (wie Salz, Öl, Pfeffer) über `buildStapleDefaults` in `useRecipeProgress.ts` (führte beim ersten Öffnen zu bereits durchgestrichenen Zutaten und Verwirrung).
* **Ersetzt durch:**
  - Rein informative Zutaten-Listenansicht (ohne Checkboxen, Klick-Trigger oder Durchstreichungen) in `RecipeIngredients.tsx`.
  - Dediziertes `ShoppingConfirmSheet.tsx` beim Klick auf „Zur Einkaufsliste hinzufügen“, in dem Vorratsartikel vorausgefüllt abgewählt, aber manuell steuerbar sind.
* **Betroffene Dateien:** `frontend/src/hooks/useRecipeProgress.ts`, `frontend/src/components/RecipeDetails/RecipeIngredients.tsx`, `frontend/src/components/RecipeDetails/index.tsx`.

---

### 2026-07-27: LLM-basiertes Inline-Tagging & Refactoring der Zeit- Parsing-Heuristik

* **Ersetzter Code / Anti-Pattern:**
  - `parseTimeToSeconds` in `RecipeInstructionText.tsx` (25-zeiliges Regex-Hilfsmittel für 15+ Sprachen).
  - `timePattern` Regex-String in `RecipeInstructionText.tsx` für Zeitwörter (`Minuten`, `hours`, `godziny`, `dakika`, etc.).
  - Naives String-Matching (`includes()`) & sprachspezifische Suffix-Toleranz (`[\p{L}]{0,2}`) für deutsche Endungen (`Zwiebel` $\rightarrow$ `Zwiebeln`) in `ingredientMatch.ts`.
* **Ersetzt durch:**
  - Gemini Inline-Tagging: `[Wort](ing:baseName)` für Zutaten und `[Zeit](timer:seconds)` für Zeitangaben direkt aus dem KI-Layer.
  - Universelles `extractInlineIngredientTags` & `extractInlineTimerTags` in `frontend/src/utils/ingredientMatch.ts`.
* **Betroffene Dateien:** `frontend/src/components/RecipeInstructionText.tsx`, `frontend/src/utils/ingredientMatch.ts`, `backend/src/gemini.ts`.

---

### Prior: Apify Media Downloader Actor Migration

* **Ersetzter Code:**
  - Drittanbieter-Actor `rover-omniscraper/media-downloader-actor`.
* **Ersetzt durch:**
  - Eigener Apify-Actor `social-video-downloader` (Quellcode im Nachbar-Repo `../apify-actor`) basierend auf `yt-dlp` mit Residential Proxies.
* **Betroffene Dateien:** `backend/src/scrapers/providers/index.ts`.
