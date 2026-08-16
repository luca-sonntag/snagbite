# 🗑️ Obsolete Code & Deprecated References Tracking

Dieses Dokument protokolliert veralteten Code, ersetzte Heuristiken, alte Hilfsfunktionen und ausgemusterte Architekturen im Projekt. Es dient als Referenz, um Wieder-Einführungen alter Anti-Pattern zu verhindern.

---

## 📜 Chronologische Übersicht

### 2026-08-16: Hardcodierte Stück-Gewichts-Heuristiken durch schema-autoritatives `gramsPerUnit` & BLS `standard_units` ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Hardcodierte TypeScript-Heuristik-Funktionen `getPieceWeightGrams`, `getSliceWeightGrams` und `getPackWeightGrams` mit über 150 Zeilen String-Checks in `backend/src/matching/ingredientMatcher.ts`.
  - Pauschale 100g-Fallbacks für Einheiten wie `Stück` oder `Scheiben`, die bei Lebensmitteln wie Fischstäbchen (30g), Toastbrotscheiben (25g) oder Eigelb (20g) zu drastisch überhöhten Kalorien führten.
* **Ersetzt durch:**
  - **Schema-autoritatives `gramsPerUnit` im Gemini-Extraktionsschema (`backend/src/gemini.ts`):** Gemini liefert für jede Zutat das exakte, kontextbezogene Einzelgewicht der Einheit ($1\text{ Fischstäbchen} = 30\text{g}$, $1\text{ Scheibe Toast} = 25\text{g}$, $1\text{ Eigelb} = 20\text{g}$, $1\text{ Ei} = 55\text{g}$, $1\text{ Zwiebel} = 80\text{g}$, $1\text{ Dose} = 400\text{g}$).
  - **Kuratierte BLS `standard_units` im Offline-Datensatz (`buildBLSIngredients.ts` & `canonicalIngredientsData.json`):** Schlagwort-unabhängige Stück- und Scheibengewichte direkt im kanonischen Datensatz als robuster Fallback.
  - **Deterministische Multiplikation im Matcher:** `weightGrams = amount * gramsPerUnit`.
* **Betroffene Dateien:** `backend/src/matching/ingredientMatcher.ts`, `backend/src/gemini.ts`, `backend/src/types.ts`, `frontend/src/types.ts`, `backend/src/scripts/buildBLSIngredients.ts`, `backend/src/data/canonicalIngredientsData.json`.

---

### 2026-08-16: 87 MB Vektor-Embeddings (`canonicalEmbeddings.bin`) durch Universal BaseNameMap + MiniSearch BM25 + Gemini Batch-Reranker ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `canonicalEmbeddings.bin` (87 MB Float32-Array Binärdatei im Git-Repo) & `canonicalEmbeddingsMeta.json`.
  - `gemini-embedding-001` Laufzeit-API-Calls (200–500 ms Extra-Latenz pro Fallback).
  - Vektor-Kosinusähnlichkeit als Blind-Ranking: Vektorräume neigen bei ungelisteten/seltenen Begriffen (z. B. Gewürzen) zu False Positives, da sie geometrisch immer einen "nächstgelegenen" Vektor wählen (z. B. *Rauchpaprika -> Räucherforelle*), statt sauber `null` zu liefern.
  - Skript `backend/src/scripts/buildBLSEmbeddings.ts`.
* **Ersetzt durch:**
  - **Stage 0 Fast-Path (`baseNameMap.ts` mit `toEnglishSingular`):** 338+ handkuratierte, geprüfte Standard-Lebensmittel lösen ~92 % aller Matches sofort deterministisch in $O(1)$ (0 ms) auf.
  - **Stage 1 Fast-Path (Direkt-Aliase):** Exakte deutsche Markennamen und BLS-Produktaliase ($O(1)$).
  - **Stage 2 (MiniSearch BM25 Sparse Search):** Schnelle Wortstamm-Vorselektion der Top 5–8 BLS-Kandidaten im RAM.
  - **Stage 3 (Batch Gemini Flash-Lite Multiple-Choice Reranker):** Für alle im Rezept verbleibenden ungematchten Zutaten wird genau **ein einziger gebündelter Multiple-Choice-Call** (< 300 Token, < 0,00001 $) an `gemini-3.1-flash-lite` geschickt. Das LLM versteht echte kulinarische Semantik und setzt bei ungelisteten Exoten/Gewürzen zuverlässig `null` (100 % Anti-Halluzination).
* **Betroffene Dateien:** `backend/src/matching/ingredientMatcher.ts`, `backend/src/matching/baseNameMap.ts`, `backend/src/config.ts`, `backend/src/data/canonicalEmbeddings.bin` (gelöscht), `backend/src/scripts/buildBLSEmbeddings.ts` (gelöscht).

---

### 2026-08-15: Schweizer Nährwertdatenbank & komplexe manuelle TS-Regex-Heuristiken durch BLS 4.0 & Fuse.js ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Schweizer Nährwertdatenbank V7.1 (~1.200 Einträge): Zu geringe Marktabdeckung für moderne deutsche Social-Media-Zutaten, viele falsche Treffer durch Dialektunterschiede (*Poulet, Rahm*).
  - Komplexe handgeschriebene TypeScript-Heuristiken (Hunderte Zeilen Komposita-Guards, manuelle Head-Noun-Extraktion, Dairy-Flavor-Guards) in `backend/src/matching/ingredientMatcher.ts`.
* **Ersetzt durch:**
  - **Bundeslebensmittelschlüssel (BLS 4.0 mit 7.140 Einträgen):** Umfassender deutscher Standard-Datensatz mit genauen Nährwerten.
  - **Gemini Search-Queries Kaskade (`searchQueries: string[]`):** Gemini generiert 2–3 priorisierte deutsche Suchbegriffe pro Zutat (vom spezifischen Produkt zum Grundlebensmittel).
  - **Kategorie-basierte Fuse.js Matching-Engine:** Schnelle, mathematische Ähnlichkeitssuche mit Konfidenz-Scoring und 96%+ Trefferquote.
* **Betroffene Dateien:** `backend/src/matching/ingredientMatcher.ts`, `backend/src/data/canonicalIngredientsData.json`, `backend/src/gemini.ts`, `backend/src/scripts/buildBLSIngredients.ts`.

---

### 2026-08-15: pgvector & Cosine Similarity Embeddings durch deterministische Nährwertdatenbank ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Experimentelle pgvector-Vektorsuche und `text-embedding-004` Embeddings pro Einzelzutat (Branch `feature/food-data-nutritions`).
  - Führte zu 8–15 sequenziellen LLM- & Embedding-API-Aufrufen pro Rezept, unvorhersehbarer Latenz (+8 bis +20 Sekunden) und Supabase Statement-Timeouts.
* **Ersetzt durch:**
  - **Deterministische Schweizer Nährwertdatenbank V7.1 (`backend/src/matching/ingredientMatcher.ts`):** 1.216 laborgeprüfte generische Lebensmittel mit bilingualem Mapping (DE/EN), kulinarischen Stückgewichten (`standard_units`) und O(1) Memory-Indexierung (< 1ms Matching-Latenz).
* **Betroffene Dateien:** `backend/src/matching/ingredientMatcher.ts`, `backend/src/data/canonicalIngredients.ts`, `backend/src/queue.ts`.

---

### 2026-08-15: Video-Download-Pipeline & fehlerhafte Textlängen-Heuristik (`caption.length < 40`) entfernt

* **Ersetzter Code / Anti-Pattern:**
  - `rapidApiProvider` und Video-Download-Fallback in `backend/src/scrapers/providers/index.ts`.
  - Naive Längenprüfung `caption.length < 40` in [`rapidApiMetadata.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/scrapers/providers/rapidApiMetadata.ts), die bei längeren Teaser-Posts (> 40 Zeichen, aber ohne Zutaten) zu Rezept-Halluzinationen in Gemini führte.
  - "Infer Missing Ingredients"-Regel im Prompt, die Gemini dazu verleitete, aus reinen Titeln/Teasern ganze Rezepte zu erfinden.
* **Ersetzt durch:**
  - Ausschließlicher Metadaten- & Bildkarussell-Modus (`rapidApiMetadataProvider` mit `media: { kind: 'none' }` bzw. `images`).
  - Strenge Anti-Halluzinations-Constraint im Gemini-Prompt (`isRecipe: false` bei Teasern, DM-Bait und fehlenden Mengenangaben/Schritten -> Fehlercode `NOT_A_RECIPE`).
* **Betroffene Dateien:** `backend/src/gemini.ts`, `backend/src/scrapers/providers/index.ts`, `backend/src/scrapers/providers/rapidApiMetadata.ts`, `frontend/src/i18n.ts`.

---

### 2026-08-14: Verstreute Organisations-Elemente (Favoriten-Shelf & Bottom-Labels) durch einheitlichen Top-Hub ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Unteres Favoriten-Shelf (`shelves.favorites.total > 5` in [`CookbookHome.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CookbookHome.tsx)), das bei $\le 5$ Favoriten gar nicht sichtbar war.
  - Separater Labels-Block ganz unten am Seitenende (`allFlags.length > 0`), der langes Scrollen erforderte.
* **Ersetzt durch:**
  - **Einheitlicher Organisations-Hub ganz oben auf der Startseite:**
    1. ⭐ **Favoriten als permanenter Smart-Folder (Kachel #1)** im gleichen 2:1 Split-Cover-Format wie Sammlungen.
    2. 📂 **Eigene Sammlungen & ➕ "Neue Sammlung"** nahtlos in der gleichen horizontalen Zeile.
    3. 🏷️ **Labels / Tags** direkt unter den Sammlungs-Kacheln als kompakte, horizontal scrollbare Chip-Leiste mit Rezept-Anzahl.
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/CookbookHome.tsx`, `frontend/src/components/SavedCatalog/CollectionTile.tsx`, `frontend/src/components/SavedCatalog/index.tsx`, `frontend/src/hooks/useSavedCatalog.ts`.

---

### 2026-08-14: Verschachtelter vertikaler Scroll im Cookbook-Home durch 2-reihiges horizontales Karussell ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Verschachtelter vertikaler 2-Spalten-Scrollcontainer (`VerticalRecipeShelf.tsx` mit `overflow-y-auto max-h-[...]`) auf der Rezept-Übersichtsseite.
  - Führte zu "Scroll-Traps" (Abfangen der vertikalen Wischgeste beim Durchblättern des Dashboards) und unruhigem Scrollbalken mitten auf der Seite.
* **Ersetzt durch:**
  - 2-reihiges horizontales Karussell ([`TwoRowRecipeShelf.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/TwoRowRecipeShelf.tsx) mit `grid-rows-2 grid-flow-col overflow-x-auto`), das 4+ Rezepte gleichzeitig darstellt, aber horizontal wischt und den vertikalen Seitenfluss zu 100% frei lässt.
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/TwoRowRecipeShelf.tsx`, `frontend/src/components/SavedCatalog/CookbookHome.tsx`.

---

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
