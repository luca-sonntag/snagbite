# 🗑️ Obsolete Code & Deprecated References Tracking

Dieses Dokument protokolliert veralteten Code, ersetzte Heuristiken, alte Hilfsfunktionen und ausgemusterte Architekturen im Projekt. Es dient als Referenz, um Wieder-Einführungen alter Anti-Pattern zu verhindern.

---

## 📜 Chronologische Übersicht

### 2026-09-20: Entfernung des deckenden Bottom-Gradienten & aktiven Unterstrichs in `AppBottomNav`

* **Ersetzter Code / Veraltete UI-Struktur:**
  - `activeIndicator` (`<span className="absolute bottom-0 w-5 h-0.5 bg-emerald-600 rounded-full ..."/>`): Ein Unterstrich unter dem Label des aktiven Navigationstabs in `AppBottomNav.tsx`.
  - Fester Gradienten-Backdrop (`<div className="fixed bottom-0 inset-x-0 h-28 pointer-events-none z-30 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/80 to-transparent dark:from-[#000000] ..."/>`): Eine 112px hohe Maske am unteren Bildschirmrand, die scrollende Inhalte hinter und um die Navigationsleiste weiß bzw. schwarz ausblendete.
* **Ersetzt durch:**
  - **Kompaktes Floating-Pill-Design:** Reines Frosted-Glass (`bg-white/85 dark:bg-gray-900/85 backdrop-blur-md`) ohne störenden Gradienten-Schleier, wodurch scrollende Inhalte rundherum um die Bar sichtbar bleiben.
  - **Schlankere Typografie & Farbkodierung:** Aktiver Zustand wird pur über Akzentfarbe (`text-emerald-600 dark:text-emerald-400`) und `font-bold` signalisiert; der Unterstrich entfällt für ein ruhigeres Gesamtbild.
  - **Optimiertes Spacing:** Reduzierte Innenabstände (`py-2 px-3` statt `py-2.5 px-2`) und optimierte Button-Mindesthöhe (`min-h-[46px]` statt `48px`), um Bildschirmfläche zu sparen.
* **Betroffene Dateien:** `frontend/src/components/AppBottomNav.tsx`, `docs/OBSOLETE.md`.

---



* **Ersetzter Code / Veraltete Architektur:**
  - `backend/src/bannerGenerator.ts` & `backend/src/bannerGenerator.test.ts`: Nach der früheren Entfernung des großen 800x400 SVG-Banners verblieb die Datei ausschließlich für `generateIconPNG` (FCM Large-Icon Fallback `/api/push-icon?theme=...&emoji=...`).
  - Endpunkt `GET /api/push-icon` in `backend/src/index.ts`.
  - Gemini Prompt- & Schema-Felder `theme` und `emoji` in `generateNotificationCopy` (`backend/src/gemini.ts`), die ausschließlich für die Parametrisierung von `/api/push-icon` existierten.
  - Dynamischer URL-Bau `${baseUrl}/api/push-icon` und `dataPayload.iconUrl = iconUrl` in `backend/src/notifications/worker.ts`.
  - Android-seitiger Bitmap-Download von `data.get("iconUrl")` in `MyFirebaseMessagingService.java`.
* **Ersetzt durch:**
  - **Schlanke, bildfokussierte Benachrichtigungen:** Push-Benachrichtigungen setzen primär auf das echte KI-Cover des Rezepts (`BigPictureStyle`). Fehlt ein Cover (z. B. bei Reaktivierungs- oder Meilenstein-Nudges), greift direkt der native `BigTextStyle` mit dem App-eigenen `smallIcon`.
  - **Token- und Latenz-Einsparung:** Das Gemini-Prompt-Schema in `generateNotificationCopy` fordert nur noch `title` und `body` an; die Generierung von Theme-Farben und Emojis entfällt vollständig.
  - **Codebasis bereinigt:** Keine ungenutzten SVG-Gradienten-, Twemoji-/Noto-Emoji-Fetch- und Hex-Permutations-Logiken mehr im Backend.
* **Betroffene Dateien:** `backend/src/bannerGenerator.ts` (gelöscht), `backend/src/bannerGenerator.test.ts` (gelöscht), `backend/src/index.ts`, `backend/src/notifications/worker.ts`, `backend/src/gemini.ts`, `frontend/android/app/src/main/java/at/snagbite/app/MyFirebaseMessagingService.java`, `docs/other/collaboration-plan.md`, `docs/OBSOLETE.md`.

---

### 2026-09-19: Veraltetes Open Food Facts Ranking & 4-Kandidaten-Flaschenhals im Ingredient Resolver

* **Ersetzter Code / Anti-Pattern:**
  - `(bm25 / (0.5 + nova_group * 0.4 + ingredients_count * 0.05))`: Heuristik, die durch `COALESCE(p.ingredients_count, 1)` und `COALESCE(p.nova_group, 2)` unverarbeitete Grundnahrungsmittel stark bevorzugen sollte. Da nach EU-LMIV unverpackte/reine Grundnahrungsmittel (Kartoffeln, Zwiebeln, Eier, rohe Hähnchenbrust) keine Zutatenliste deklarieren müssen, ist `ingredients_count` bei über 55 % aller Produkte in Open Food Facts `NULL` und nur bei 1,24 % gleich 1. Das alte Ranking behandelte alle 240.000+ NULL-Produkte fälschlicherweise als pure Monoprodukte, wodurch beliebte Fertiggerichte nach oben gespült wurden und echte Monoprodukte mit korrekter Deklaration verdrängt wurden.
  - Harter Flaschenhals von lediglich 4 vorab abgerufenen Kandidaten (`catalogue.search(..., 4)`) im `ingredientResolver.ts` sowie Tool-Limit 4–6: Führte dazu, dass Gemini in Turn 1 zu wenige Optionen vorfand und oft in eine teurere zweite Runde mit `search_ingredients` gezwungen wurde oder falsche Produkte wählte.
* **Ersetzt durch:**
  - **Neues Purity & Exact-Match Ranking ([`openFoodFactsIndex.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/matching/openFoodFactsIndex.ts)):**
    - Exakter Treffer (+100) und Präfixtreffer (+80) auf Produktnamen.
    - Wortanzahl- und Titellängen-Abzug (`-4 * word_count`): Bevorzugt kurze, reine Zutatennamen ("Hähnchenbrust") vor langen Rezept-/Menütiteln.
    - Präpositionen-Strafe (`-40` bei ` mit ` oder ` in `): Drängt Verbundgerichte ("Hähnchenbrust in Rahmsoße", "Nudeln mit Tomatensauce") zuverlässig nach unten.
    - Kategorie-Soft-Bonus (`+15`): Unterstützt passende Kategorien (`DAIRY`, `MEAT_FISH`, etc.) ohne unkategorisierte Treffer (`OTHER`) komplett auszuschließen.
    - Logarithmische Scan-Dämpfung (`MIN(LN(scans + 1) * 2, 20)`): Beliebtheit hilft, überwältigt aber nicht die semantische Exaktheit.
  - **Anhebung der Resolver-Kandidaten auf 15:** Sowohl die Turn-1-Vorauswahl als auch das `search_ingredients`-Tool liefern bis zu 15 Treffer, sodass Gemini zu >90 % im ersten Turn direkt matchen kann.
* **Betroffene Dateien:** `backend/src/matching/openFoodFactsIndex.ts`, `backend/src/matching/openFoodFactsIndex.test.ts`, `backend/src/matching/ingredientResolver.ts`, `backend/src/matching/resolverTools.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-19: Bereinigung der Rezept-Pipeline-Doku: „Kein Coverbild bei Foto-Imports“ & „Gemini-Best-Shot-Auswahl“ obsolet

* **Ersetzter Code / Veraltete Annahmen:**
  - Veraltete Doku-Aussage, Foto-Imports hätten kein Coverbild (`recipe.imageUrl = null`) und nutzten nur einen Emoji-Fallback.
  - Veraltete Referenzen auf `select_best_frame` / `selectBestFrame` ("Gemini-Best-Shot-Auswahl" aus Kachel-Grid).
* **Ersetzt durch:**
  - **Einheitliche FLUX.1 [schnell] Cover-Generierung:** Alle 3 Import-Kanäle (`url`, `photo`, `remix`) generieren über `recipe.imagePrompt` in `stage: 'generating_cover'` (85 %) via fal.ai ein ansprechendes Food-Fotografie-Titelbild (`recipe.isAiCover = true`) parallel zur Zutatennormalisierung.
  - **Vollständige Ausmusterung von `select_best_frame`:** Das Kachel-Grid dient nur noch Gemini Multimodal als visuelle Rezept-Referenz; Coverbilder werden durch FLUX.1 oder das Scraper-Originalbild bezogen.
* **Betroffene Dokumente:** `docs/architecture/scraping-and-imports.md`, `docs/architecture/ai-gemini.md`, `docs/architecture/backend-and-database.md`, `docs/OBSOLETE.md`.

---

### 2026-09-17: Entfernung der redundanten Mahlzeitenanzahl- & Dauer-Chips (`DailyInsightPill.tsx`) im Wochenplaner

* **Ersetzter Code / Anti-Pattern:**
  - `DailyInsightPill.tsx`: Rendern zusätzlicher Pill-Chips ("1 Mahlzeit", "45 min") im Sticky-Header unter der 7-Tage-Leiste, die vertikalen Raum im fixierten Header beanspruchten und redundante Information duplizierten, die bereits auf den Rezeptkarten bzw. im Wochentags-Badge sichtbar ist.
* **Ersetzt durch:**
  - **Schlanker, kompakter Sticky-Kalender-Header:** Vollständige Entfernung der Pill-Chips. Die Tages-Badges (`WeekDayPicker`) und Rezeptkarten im Agenda-Stream zeigen Dauer und Einträge direkt und aufgeräumt an.
* **Betroffene Dateien:** `frontend/src/components/MealPlanner/DailyInsightPill.tsx` (gelöscht), `frontend/src/components/MealPlanner/index.tsx`, `frontend/src/components/MealPlanner/types.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-16: Getrennte Tages- und Zukunftsansicht im Wochenplaner durch Unified Agenda Stream mit bidirektionalem ScrollSpy abgelöst

* **Ersetzter Code / Anti-Pattern:**
  - Getrennte Darstellung von „Mahlzeiten des ausgewählten Tages“ (`DayMealSlots.tsx`, `DayEmptyBanner.tsx`) und „Zukünftig geplanten Rezepten“ (`UpcomingMealPlans.tsx`), die zu visueller Redundanz, fragmentierter UI und doppelten Kalender-Headern führte.
  - Fehlen vergangener Rezept-Einträge im regulären Wochenplaner-Feed (Historie war abgeschnitten).
* **Ersetzt durch:**
  - **Unified Agenda Stream ([`MealPlanDaySection.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/MealPlanDaySection.tsx), [`index.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/index.tsx)):** Ein einziger durchgängiger, chronologischer Stream (Vergangenheit -> Aktuelle Woche -> Zukunft).
  - **Kompakte Vergangenheits-Karten ([`PastMealPlanCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/PastMealPlanCard.tsx)):** Dezent eingegraute (`opacity-75`), kompakte Karten im Read-Only-Modus für vergangene Tage ohne Eingabeelemente.
  - **Bidirektionaler ScrollSpy ([`useMealPlanScrollSpy.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/useMealPlanScrollSpy.ts)):** Sticky Kalender-Header synchronisiert automatisch die aktive Woche und den sichtbaren Tag beim Scrollen; Klick auf Wochentag scrollt weich zur entsprechenden Tagessektion mit kurzem Highlight-Pulse.
* **Betroffene Dateien:** `frontend/src/components/MealPlanner/UpcomingMealPlans.tsx` (gelöscht), `frontend/src/components/MealPlanner/DayMealSlots.tsx` (gelöscht), `frontend/src/components/MealPlanner/DayEmptyBanner.tsx` (gelöscht), `frontend/src/components/MealPlanner/MealPlanDaySection.tsx` (neu), `frontend/src/components/MealPlanner/PastMealPlanCard.tsx` (neu), `frontend/src/components/MealPlanner/useMealPlanScrollSpy.ts` (neu), `frontend/src/components/MealPlanner/index.tsx`, `frontend/src/components/MealPlanner/useMealPlanner.ts`, `frontend/src/components/MealPlanner/mealPlannerUtils.ts`, `frontend/src/components/MealPlanner/types.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-15: Stille Batch-Zutatenübernahme im Wochenplaner durch interaktive sequenzielle Shopping-Sheets ersetzt & Leere Tag-Screens durch Zukünftige-Rezepte-Übersicht abgelöst

* **Ersetzter Code / Anti-Pattern:**
  - `addWeekToShoppingList` in `useMealPlanner.ts`: Stummes, unreflektiertes Einfügen aller Zutaten aller geplanten Rezepte im Hintergrund ohne Vorratsprüfung (Pantry), ohne Möglichkeit, vorhandene Zutaten abzuwählen, und ohne visuelle Bestätigung.
  - Bildfüllender `EmptyDayState` an Tagen ohne geplante Gerichte: Wenn ein Tag ohne Rezept ausgewählt wurde, war der gesamte Screen unter dem Kalender leer und unbrauchbar, selbst wenn an kommenden Tagen viele Rezepte geplant waren. Zukünftig geplante Gerichte waren nicht auf einen Blick erfassbar.
  - Harte 7-Tage-Begrenzung (`startDate=${startDateStr}&endDate=${endDateStr}`) beim Abrufen der Mahlzeiten: Verhindert, dass zukünftige Rezepte künftiger Wochen im Überblick sichtbar sind.
* **Ersetzt durch:**
  - **Sequenzieller Wocheneinkauf ([`useMealPlanBulkShopping.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/useMealPlanBulkShopping.ts), [`MealPlanShoppingSheets.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/MealPlanShoppingSheets.tsx)):** Öffnet für jedes ungekochte geplante Rezept der Woche nacheinander das vertraute `ShoppingConfirmSheet` mit automatischer Portionsskalierung, Vorrats-Pantry-Check und Zutatenauswahl.
  - **Kompaktes Tages-Banner ([`DayEmptyBanner.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/DayEmptyBanner.tsx)):** Ersetzt den leeren Screen an freien Tagen durch ein schlankes 56px-Banner mit direktem 1-Klick-Planen-Button.
  - **Zukünftig geplante Rezepte auf einen Blick ([`UpcomingMealPlans.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/MealPlanner/UpcomingMealPlans.tsx)):** Strikte Gruppierung aller kommenden Rezepte pro Tag mit Datums-Separatoren, Schnell-Planungs-Action und voller Kachel-Interaktivität (Portionen, Kochen, Gekocht-Status, Löschen).
* **Betroffene Dateien:** `frontend/src/components/MealPlanner/useMealPlanner.ts`, `frontend/src/components/MealPlanner/useMealPlanBulkShopping.ts`, `frontend/src/components/MealPlanner/DayMealSlots.tsx`, `frontend/src/components/MealPlanner/DayEmptyBanner.tsx`, `frontend/src/components/MealPlanner/UpcomingMealPlans.tsx`, `frontend/src/components/MealPlanner/MealPlanShoppingSheets.tsx`, `frontend/src/components/MealPlanner/types.ts`, `frontend/src/components/MealPlanner/mealPlannerUtils.ts`, `frontend/src/components/RecipeDetails/ShoppingConfirmSheet.tsx`, `frontend/src/App.tsx`, `docs/architecture/frontend.md`, `docs/OBSOLETE.md`.

### 2026-09-14: Steriler Vollseiten-Empty-State (`CatalogEmptyState`) durch lebendigen „Magazine-First Cold Start“ ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Vollständiges Abschalten des Magazins (`CookbookHome`) bei `completedJobs.length === 0` in `SavedCatalog/index.tsx`.
  - Anzeigen einer sterilen, weißen Vollseiten-Card `CatalogEmptyState` mit Buch-Icon, die neuen Benutzern ein leeres Datenbankformular präsentierte und Cold-Start-Frust erzeugte.
* **Ersetzt durch:**
  - **Magazine-First Cold Start ([`CookbookHome.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CookbookHome.tsx), [`SavedCatalog/index.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/index.tsx)):** Das redaktionelle Magazin bleibt auf Level 1 immer aktiv und lebendig.
  - **Kompaktes Quick-Start-Banner ([`CookbookQuickStartBanner.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CookbookQuickStartBanner.tsx)):** Schlankes, flaches Aktions-Banner am oberen Rand für Link-Import und Foto-Scan, ohne den Magazin-Feed zu blockieren.
  - **Kuratierte Cold-Start-Feeds ([`useCookbookMagazine.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/useCookbookMagazine.ts), [`CollectionStoryHub.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CollectionStoryHub.tsx)):** Hero-Carousel (3 Slides), Bento-Grid (3 schnelle Gerichte) und Inspiration-Story-Bubbles speisen sich bei 0 eigenen Rezepten nahtlos aus öffentlichen Community-Entdeckungen mit 1-Klick-Speicherfunktion.
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/index.tsx`, `frontend/src/components/SavedCatalog/CookbookHome.tsx`, `frontend/src/components/SavedCatalog/useCookbookMagazine.ts`, `frontend/src/components/SavedCatalog/CollectionStoryHub.tsx`, `frontend/src/components/SavedCatalog/CookbookQuickStartBanner.tsx`, `frontend/src/components/SavedCatalog/cookbookHomeTypes.ts`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-14: Ersetzung statischer Screenshots in `ProFeatureSheet` durch native UI-Micro-Previews (`ProFeaturePreview` & Reusable Subcomponents)

* **Ersetzter Code / Anti-Pattern:**
  - `ProFeatureScreenshot.tsx`: Statische PNG-Bilder zur Feature-Vorschau in Bottom Sheets. Führt zu unschönen Abschnitten (hochformatige Smartphonescreens passen nicht in kompakte 160–200px Sheets), unleserlichen Miniaturschriften bei Skalierung und Inception-Effekten (App im Screenshot der App).
* **Ersetzt durch:**
  - **Natives UI-Micro-Preview-System ([`ProFeaturePreview.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ProFeatureSheet/ProFeaturePreview.tsx)):**
    - Zentrale Preview-Komponenten im Ordner `frontend/src/components/ProFeatureSheet/previews/` (`HealthScorePreview`, `MacrosPreview`, `IngredientNutritionPreview`, `CookingModePreview`, `RecipeCopilotPreview`, `CollectionsPreview`, `UnlimitedExtractionsPreview`).
    - Strikte Wiederverwendung der echten Subkomponenten ohne Code-Duplizierung (`HealthScoreHeroCard`, `MacroDistribution`, `IngredientItemRow`, `CookingTimerCard`, `CopilotMessageItem`, `CollectionStoryBubble`).
    - Gestochen scharf auf jedem Display, 100% konsistent mit dem tatsächlichen Feature-Design.
* **Betroffene Dateien:** `frontend/src/components/ProFeatureSheet/ProFeatureScreenshot.tsx` (gelöscht), `frontend/src/components/ProFeatureSheet/ProFeaturePreview.tsx` (neu), `frontend/src/components/ProFeatureSheet/previews/` (neu), `frontend/src/components/CookingMode/CookingTimerCard.tsx` (neu), `frontend/src/components/CookingMode/CookingModeTimers.tsx`, `docs/OBSOLETE.md`.

### 2026-09-14: Abschaffung verspielter Kronen-Icons (`PremiumCrownBadge` & `Crown`) zugunsten einheitlicher `ProBadge`-Komponente

* **Ersetzter Code / Anti-Pattern:**
  - `PremiumCrownBadge.tsx`: Verspieltes, absolutes Mini-Kronen-Icon (`Crown` aus `lucide-react`) an Action-Buttons (Kochen, Copilot, Timer).
  - Verstreute, uneinheitliche Kronen-Icons und gelbe Gating-Badges über Buttons, Makro-Verteilungen, Zutatendetails, Healthy-Score und Werbe-Hinweisen.
  - Das Kronen-Icon vermittelte den Eindruck eines verspielten Mobile-Games statt einer modernen, kuratierten kulinarischen PWA.
* **Ersetzt durch:**
  - **Zentrale, typografische Single-Source-of-Truth-Komponente ([`ProBadge.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ProBadge.tsx)):**
    - `variant="corner"`: Kompakter, kontrastreicher Micro-Chip (`bg-amber-500 text-white font-black text-[8.5px] uppercase`) für Action-Dock-Buttons.
    - `variant="chip"`: Minimalistischer Inline-Tag (`bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[10px]`) für Einstellungen und Hinweistexte.
    - `variant="interactive"`: Einheitliche, ruhige Pill im Clean Flat Style (`tint-premium`) mit integriertem `PRO`-Tag, optionalem Label und Chevron für gesperrte Detailansichten (Healthy-Score, Makros, Zutaten).
  - `PremiumCrownBadge.tsx` wurde zu einem abwärtskompatiblen `@deprecated`-Wrapper um `<ProBadge variant="corner" />` reduziert.
* **Betroffene Dateien:** `frontend/src/components/ProBadge.tsx` (neu), `frontend/src/components/PremiumCrownBadge.tsx`, `frontend/src/components/CookingMode/CookingModeHeader.tsx`, `frontend/src/components/RecipeDetails/RecipeActionDock.tsx`, `frontend/src/components/RecipeDetails/RecipeInstructions.tsx`, `frontend/src/components/RecipeDetails/HealthScoreBadge.tsx`, `frontend/src/components/RecipeDetails/HealthScorePaywallPreview.tsx`, `frontend/src/components/RecipeDetails/MacroDistribution.tsx`, `frontend/src/components/RecipeDetails/RecipeIngredients.tsx`, `frontend/src/components/SettingsView.tsx`, `frontend/src/components/PremiumHint.tsx`, `frontend/src/components/PremiumUpgradeCard.tsx`, `frontend/src/components/TrialBanner.tsx`, `frontend/src/components/Ads/PreAdTransparencySheet.tsx`, `frontend/src/i18n.ts`, `docs/architecture/frontend.md`, `docs/OBSOLETE.md`.

---

### 2026-09-13: Entrümpelung von `ShoppingEmptyState.tsx` (Überkomplizierte Fake-Mockups durch Clean Flat Empty State ersetzt)

* **Ersetzter Code / Anti-Pattern:**
  - `RecipeCardMockup`, `AddToCartMockup`, `AisleListMockup`: Überkomplizierte, winzige Mockups mit simulierten CSS-Ping-Animationen (`animate-ping`) und Fake-Skelett-Boxen innerhalb des Einkaufslisten-Empty-States, die visuell unruhig und überladen wirkten.
* **Ersetzt durch:**
  - **Modernes, reduziertes Clean Flat Empty State Design ([`ShoppingEmptyState.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ShoppingList/ShoppingEmptyState.tsx)):** Zentrierter sanfter Smaragd-Kreis mit `ShoppingCart`-Icon, klare typografische Hierarchie ohne Ränder (`border-none`, `rounded-3xl`), prägnanter 1-2 Satz Hilfstext und 48px-Touch-Target CTA-Button (*"Rezepte entdecken"* via `window.location.hash = '#/'`).
* **Betroffene Dateien:** `frontend/src/components/ShoppingList/ShoppingEmptyState.tsx`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-13: Umbenennung & Generalisierung von `RecommendationThemeSheet` zu `HeroThemeSheet`

* **Ersetzter Code / Anti-Pattern:**
  - `RecommendationThemeSheet.tsx`: Komponente war semantisch ausschließlich an die "Empfehlungen"-Slide des Hero-Karussells gekoppelt und nutzte fest verdrahtete Amber-Theme-Farben und Untertitel.
  - Fehlende Möglichkeit, aus dem Vital-Star-Hero-Slide heraus eine Gesamtauswahl aller gesunden Rezepte (Health Score $\ge 70$) als interaktives Drawer-Sheet zu öffnen.
* **Ersetzt durch:**
  - **Generalisiertes [`HeroThemeSheet.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/HeroThemeSheet.tsx):** Wiederverwendbares Bottom-Drawer-Sheet für thematische Auswahlen aus dem Hero-Karussell (Empfehlungen / Themen sowie Vital-Stars).
  - **Dynamische Akzentuierung:** `badgeVariant`-Prop steuert Akzentfarben (z. B. `emerald` für Vital-Stars, `amber` für Empfehlungen) inklusive Footer-CTA-Styling.
  - **Volle Katalog-Preset-Integration (`preset.kind === 'vital'`):** Direkter Sprung von der Hero-Drawer in den Vollkatalog mit automatischer Vorfilterung nach Health Score $\ge 70$ und Sortierung nach `healthScore`.
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/HeroThemeSheet.tsx` (umbenannt von `RecommendationThemeSheet.tsx`), `frontend/src/components/SavedCatalog/CookbookHome.tsx`, `frontend/src/components/SavedCatalog/useCookbookMagazine.ts`, `frontend/src/components/SavedCatalog/catalogRoutes.ts`, `frontend/src/components/SavedCatalog/index.tsx`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-12: Entfernung der redundanten Vibe-Quick-Chips (`CookbookVibeChips.tsx`) & In-Place-Vibe-Logik

* **Ersetzter Code / Anti-Pattern:**
  - `CookbookVibeChips.tsx`: Horizontale Pill-Filterleiste (*Vital & Fit*, *Unter 25m*, *High Protein*, *One-Pot*, *Veggie*, *Süßes*) oberhalb des Hero-Karussells.
  - Vibe-Filterzustand (`activeVibe`) in `useCookbookMagazine.ts` und `CookbookHome.tsx`.
  - `matchesVibe()` und dynamische Vibe-Titel in `magazineCuratorUtils.ts`.
  - Übersetzungskeys `catalog.vibes` und `catalog.magazine.vibes` in `i18n.ts`.
  - *Begründung:* Das 3-Slide Hero-Karussell (Slide 2: Vital Star) und die Bento-Sektion (Blitzgerichte $\le 25\text{ Min.}$) decken diesen kuratorischen Mehrwert bereits inhärent ab. Die zusätzlichen Chips erzeugten ein unruhiges "Karussell-Sandwich" (drei horizontale Scrollleisten übereinander) und verwässerten die klare Magazin-Hierarchie.
* **Ersetzt durch:**
  - Ungetrübter vertikaler Fluss: Direkt nach den Instagram-Story-Bubbles folgt das 4:3 Hero-Karussell.
  - Vollständige Filterung und Suche verbleibt sauber und gebündelt auf der Listenebene (`SavedCatalog/index.tsx` & `FilterSheet.tsx`).
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/CookbookVibeChips.tsx` (gelöscht), `frontend/src/components/SavedCatalog/CookbookHome.tsx`, `frontend/src/components/SavedCatalog/useCookbookMagazine.ts`, `frontend/src/components/SavedCatalog/magazineCuratorUtils.ts`, `frontend/src/i18n.ts`, `docs/architecture/frontend.md`, `docs/OBSOLETE.md`.

---

### 2026-09-12: Repetitive 2-Row Shelf-Accordions (`DiscoveryAccordion` / `TwoRowRecipeShelf`) durch redaktionellen Culinary Magazine Feed ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `DiscoveryAccordion.tsx`: Eintönige, vertikale Akkordeon-Tabs („Neueste Rezepte“, „Zuletzt geöffnet“, „Schnell gekocht“), die jeweils ein starres, 2-reihiges horizontales Raster identischer 4:3-Karten einbetteten.
  - `TwoRowRecipeShelf.tsx`: Repetitives 2-Reihen-Raster ohne visuelle Hierarchie, Inspiration oder Magazin-Charakter.
  - Veraltetes rechteckiges Sammlungs-Horizontal-Raster (`CollectionTile.tsx` auf Home), bei dem Sammlungen wie standardmäßige Buttons untergingen.
  - Würfel- / Roulette-Zufallsfunktion vorerst auf Nutzerwunsch entfernt.
* **Ersetzt durch:**
  - **100% kreisrunde Story-Highlights ([`CollectionStoryHub.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CollectionStoryHub.tsx)):** Instagram-inspirierte Bubbles (`rounded-full`, 64×64px, Kontrastring) direkt above-the-fold inklusive dediziertem „📚 Alle Rezepte“-Shortcut.
  - **Taktile Vibe-Quick-Chips ([`CookbookVibeChips.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CookbookVibeChips.tsx)):** Sofortiges In-Place-Filtering nach Stimmungen (Vital & Fit 70+, Blitz-Gerichte <25 Min, High-Protein, One-Pot, Veggie, Süßes).
  - **Format A: Cinematic 16:10 Hero Spotlight ([`RecipeHeroCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/RecipeHeroCard.tsx)):** Appetitliche Vollbild-Fotografie mit dunklem Gradient-Scrim, Health-Score-Badge (`Score 88 • A`), Nährstoffzeile und direktem „Jetzt kochen“-CTA.
  - **Format B: Bento-Grid ([`RecipeBentoSection.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/RecipeBentoSection.tsx)):** 3:4 Portrait-Karte links + 2 gestapelte Mini-Karten ([`RecipeCompactCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/RecipeCompactCard.tsx)) rechts.
  - **Format C: Wiederentdeckte Schätze ([`RecipeShowcaseCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/RecipeShowcaseCard.tsx)):** Horizontaler Banner für ältere, unprobierte Rezept-Perlen.
  - **Format D: Dediziertes „Alle deine Rezepte“-Shelf ([`AllRecipesShelf.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/AllRecipesShelf.tsx)):** Bewahrung der geschätzten `RecipePosterCard`s in horizontaler Leiste mit prominentem Vollkatalog-Aktionsbutton.
  - **Kuratorischer Custom Hook ([`useCookbookMagazine.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/useCookbookMagazine.ts)):** Auslagerung der redaktionellen Slot-Berechnung und des Vibe-Matchings unter strikter Einhaltung der Anti-Fragility-Regeln (0x String-/Keyword-Heuristiken).
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/CookbookHome.tsx`, `frontend/src/components/SavedCatalog/CollectionStoryHub.tsx`, `frontend/src/components/SavedCatalog/CookbookVibeChips.tsx`, `frontend/src/components/SavedCatalog/RecipeHeroCard.tsx`, `frontend/src/components/SavedCatalog/RecipeBentoSection.tsx`, `frontend/src/components/SavedCatalog/RecipeCompactCard.tsx`, `frontend/src/components/SavedCatalog/RecipeShowcaseCard.tsx`, `frontend/src/components/SavedCatalog/AllRecipesShelf.tsx`, `frontend/src/components/SavedCatalog/useCookbookMagazine.ts`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-12: AI-Slop-Banner (`HealthScoreCopilotCard`) & redundanter Footer-Button im HealthScoreSheet durch integrierten Hero-Card Trigger ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `HealthScoreCopilotCard.tsx`: Separate mintfarbene Marketing-Box ("Rezept gesünder machen mit KI") mit Fließtext-Pitch und grellem Pfeil-Button, die unterhalb des Nährwert-Checks lag und nur durch Scrollen erreichbar war (AI-Slop & Scroll-Hürde).
  - `<Drawer.Footer>` mit redundantem "Verstanden"-Button im `HealthScoreSheet.tsx`, der vertikalen Bildschirmplatz blockierte, obwohl das Sheet bereits über das "X" im Header und Swipe-to-Dismiss geschlossen werden kann.
* **Ersetzt durch:**
  - **Direkte Integration in [`HealthScoreHeroCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/HealthScoreHeroCard.tsx):** Eleganter, dezenter Quiet-Luxury Aktionsbutton (`[ ✨ Rezept mit Copilot optimieren ]` bzw. `[ ✨ Varianten mit Copilot entdecken ]`) unmittelbar unter dem 5-Zonen-Farbspektrum im sichtbaren Bereich (Above the fold).
  - **Zero AI-Slop & sofortige Sichtbarkeit:** Keine aufdringlichen Marketing-Erklärtexte, kein Scrollen erforderlich. Sofortige haptische Interaktion und nahtlose Übergabe an den Recipe Copilot.
  - **Entfernung des Footers:** Mehr Platz für die tatsächlichen Nährwertanalysen im Drawer.
* **Betroffene Dateien:** `frontend/src/components/RecipeDetails/HealthScoreCopilotCard.tsx` (gelöscht), `frontend/src/components/RecipeDetails/HealthScoreHeroCard.tsx`, `frontend/src/components/RecipeDetails/HealthScoreSheet.tsx`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-12: Statische Schwellenwert-Upgrade-Tipps (`smartSwapTip` / `HealthScoreSmartTip`) durch dynamische AI Recipe Copilot Anbindung ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `HealthScoreSmartTip.tsx`: Statische UI-Box mit Sparkles-Icon, die lediglich zwei feste Heuristik-Strings ("Zucker reduzieren" oder "Gemüse/Vollkorn hinzufügen") anzeigte.
  - `smartSwapTip` in `backend/src/matching/healthScoreCalculator.ts`: Schwellenwert-basierte Erzeugung statischer Strings, die unabhängig vom Rezept stets identisch formuliert waren.
* **Ersetzt durch:**
  - **[`HealthScoreCopilotCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/HealthScoreCopilotCard.tsx):** Taktile Aktionskarte im Health Score Sheet ("Rezept gesünder machen mit KI").
  - **Dynamische Übergabe des Healthy-Score-Kontexts an Gemini:** `chatAboutRecipe` erhält Score, Note, Schwachstellen (Cautions) und Highlights im System-Prompt.
  - **Automatischer Upgrade-Prompt:** Beim Klick auf den CTA-Button schließt sich das Sheet und der Recipe Copilot öffnet sich direkt mit einem maßgeschneiderten Prompt zur ernährungsphysiologischen Aufwertung.
* **Betroffene Dateien:** `frontend/src/components/RecipeDetails/HealthScoreSmartTip.tsx` (gelöscht), `frontend/src/components/RecipeDetails/HealthScoreCopilotCard.tsx` (neu), `frontend/src/components/RecipeDetails/HealthScoreSheet.tsx`, `frontend/src/components/RecipeDetails/RecipeNutrition.tsx`, `frontend/src/components/RecipeDetails/RecipeInfoSection.tsx`, `frontend/src/components/RecipeDetails/useRecipeDetails.ts`, `frontend/src/components/RecipeDetails/index.tsx`, `backend/src/matching/healthScoreCalculator.ts`, `backend/src/gemini.ts`, `frontend/src/i18n.ts`.

---

### 2026-09-12: Isolierte Nährwert-Skalare (`calories`, `protein_g`, `carbs_g`, `fat_g`) durch konsolidierte `nutritional_values` JSONB-Spalte & 4-Säulen Healthy Score abgelöst

* **Ersetzter Code / Anti-Pattern:**
  - Reine 4-Spalten-Speicherung (`calories numeric`, `protein_g numeric`, `carbs_g numeric`, `fat_g numeric`) in der Postgres-Tabelle `recipes`.
  - Keine persistente Speicherung von Ballaststoffen (`fiber`), Zucker (`sugar`), Verarbeitungsgrad (`novaGroup`), Gemüsegewicht (`vegetableGrams`) oder Pflanzenvielfalt (`plantCount`).
  - Dual-Write und Fallback-Leselogik für alte Spalten.
* **Ersetzt durch:**
  - **Konsolidierte JSONB-Spalte `nutritional_values`:** Bündelt Kalorien, Makros, Ballaststoffe, Zucker, NOVA-Grad und Mikronährstoffe in einem erweiterbaren Dokument.
  - **Vollständiges Droppen der Alt-Spalten in Migration 011:** Migration 011 migriert Altdaten via `jsonb_build_object` in `nutritional_values` und führt anschließend `ALTER TABLE recipes DROP COLUMN calories, protein_g, carbs_g, fat_g` aus. Keine Altlasten oder redundanten Dual-Writes in Backend-Mappern (`rowToRecipe` / `recipeToRow` / `mealPlansDb`).
  - **`health_score numeric` & `health_score_breakdown jsonb`:** Persistente Speicherung des deterministischen 4-Säulen-Scores (0–100) mit vollständiger Nachvollziehbarkeit im UI via `HealthScoreBadge` und `HealthScoreSheet`.
* **Betroffene Dateien:** `backend/db/migrations/011_consolidate_nutritional_values_and_health_score.sql`, `backend/db/schema.sql`, `backend/src/db/recipesDb.ts`, `backend/src/db/mealPlansDb.ts`, `backend/src/db/types/core.ts`, `backend/src/db/types/mealPlans.ts`, `shared/src/types/recipes.ts`, `backend/src/matching/healthScoreCalculator.ts`.

---

### 2026-09-10: Diffuse Hintergrund-Wellen (`AmbientDiagonalWaves`) & massiver Header-Block (`HeroWaveHeader`) durch edlen Slate-50 Canvas ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `HeroWaveHeader.tsx`: Wuchtiger, vollflächiger Smaragd-Farbblock im Header, der die App optisch erdrückt und von den eigentlichen Rezeptinhalten ablenkt.
  - `AmbientDiagonalWaves.tsx`: Großflächige, animierte SVG-Wellenbänder im Hintergrund des App-Canvas.
  - **Problem:** Die halbtransparenten Wellenbänder wirkten hinter den UI-Elementen wie diffuse, fleckenartige Verfärbungen und unruhige Schlieren statt wie ein klares, intentionales Design-Element. Sie schwächten zudem den Kontrast zu den Inhalten ab.
* **Ersetzt durch:**
  - **Edler Slate-50 Canvas (`#f8fafc`):** Saubere, dezente Tonalität im Hintergrund. Weiße Karten und modale Oberflächen treten durch feine Umrandung (`ring-1 ring-black/[0.04]`) und weiche Schatten plastisch, kontrastreich und taktil hervor.
  - **Rückkehr zu standardisiertem `PageHeader`:** Luftiger, klarer nativer Header ohne massive Farbklötze.
* **Betroffene Dateien:** `frontend/src/components/AmbientDiagonalWaves.tsx` (gelöscht), `frontend/src/components/HeroWaveHeader.tsx` (gelöscht), `frontend/src/App.tsx`, `frontend/src/index.css`, `docs/OBSOLETE.md`.

---

### 2026-09-10: Veralteter Hook-Name `useAdOverlay` zu `useModalOverlay` umbenannt & Body-Scroll-Lock zentralisiert

* **Ersetzter Code / Anti-Pattern:**
  - `useAdOverlay`: Missverständlicher Name für einen Hook, der nicht Ads steuert, sondern Overlays (Modals, Sheets, Drawers, Dialogs) registriert, um versehentliche Kollisionen mit nativen AdMob-Bannern zu verhindern.
  - Fragmentiertes, manuelles Body-Scroll-Locking in einzelnen Komponenten (`document.body.style.overflow = 'hidden'`), das bei verschachtelten Overlays versagt (Scroll-Position geht verloren, Seite springt auf `scrollY = 0`) und auf Touch-Geräten (iOS Safari, Android WebViews) unzuverlässig ist.
* **Ersetzt durch:**
  - **Neuer Hook-Name [`useModalOverlay`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/context/OverlayStackContext.tsx):** Eindeutige Semantik für alle modalen Oberflächen. `useAdOverlay` bleibt als abwärtskompatibler Alias erhalten.
  - **Zentraler Body-Scroll-Lock in [`OverlayStackProvider`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/context/OverlayStackContext.tsx):** Nutzt [`useBodyScrollLock`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/hooks/useBodyScrollLock.ts) reaktiv über den globalen Ref-Count (`isAnyOverlayOpen` / `depth.current`).
  - **Verschachtelungs-Sicherheit:** Der echte Scroll-Stand wird exakt beim Öffnen des ersten Overlays (0 → 1) fixiert (`position: fixed; top: -scrollY`) und erst wiederhergestellt, wenn das allerletzte Overlay schließt (1 → 0).
  - **Zero Boilerplate:** Jede Komponente, die `useModalOverlay(isOpen)` einbindet, erhält automatisch und transparent sowohl Ad-Hiding als auch zuverlässiges Hintergrund-Scroll-Locking.
* **Betroffene Dateien:** `frontend/src/context/OverlayStackContext.tsx`, `frontend/src/hooks/useBodyScrollLock.ts`, `frontend/src/context/DialogContext.tsx`, `frontend/src/components/FeedbackDrawer.tsx`, `frontend/src/components/MealPlanner/RecipePickerModal.tsx`, `frontend/src/components/MealPlanner/AddToMealPlanSheet.tsx`, `frontend/src/components/PremiumModal.tsx`, `frontend/src/components/TimerConfirmSheet.tsx`, `frontend/src/components/SavedCatalog/CollectionSheet.tsx`, `frontend/src/components/ShoppingList/CustomItemForm.tsx`, `frontend/src/components/SavedCatalog/FilterSheet.tsx`, `frontend/src/components/RecipeDetails/IngredientNutritionSheet.tsx`, `frontend/src/components/SavedCatalog/FlagSheet.tsx`, `docs/OBSOLETE.md`.

---
### 2026-09-10: Vereinfachte Vorschau-Listen (`PreviewNutritionRow`, `PreviewIngredientsList`) durch vollwertige `RecipeDetails`-Komponenten ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `PreviewNutritionRow.tsx`: Isolierte Nährwertzeile mit vereinfachtem Kcal/Makro-Layout, die nicht zum visuellen Design von `RecipeNutrition` passte.
  - `PreviewIngredientsList.tsx`: Rudimentäre Zutatenliste ohne standardisierte Kategorie-Sortierung, ohne einheitliche Icons (`IngredientIcon`), ohne klickbare Nährwert-Pills und ohne Verknüpfung zum `IngredientNutritionSheet`.
* **Ersetzt durch:**
  - **Wiederverwendung von [`RecipeInfoSection.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeInfoSection.tsx):** Rendert Vorbereitung, Zubereitung, Portionen sowie die detaillierte Kalorien-Headline mit geschätztem Flammen-Badge, mehrfarbigem Makrobalken und Makro-Legende.
  - **Neues [`PreviewIngredientsCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/PublicRecipe/PreviewIngredientsCard.tsx):** Etabliert das exakte Karten-Design von `RecipeIngredients` mit Medaillon-Portionszeile, `RecipeServingsStepper`, sortierten Gruppen nach Taxonomie (`categoryOrder`, `legacyCategoryMap`), vertikalen Farbindikatoren (`theme.barClass`), `IngredientItemRow` und interaktivem `IngredientNutritionSheet`.
  - **Neues [`PreviewHeroHeader.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/PublicRecipe/PreviewHeroHeader.tsx):** Elegantes Hero-Cover mit `CachedImage`, Frosted-Glass Schließen-Button (`min-w-[44px] min-h-[44px]`) und dynamischem Quell-Badge (`Quelle ansehen` / `Foto-Import`).
* **Betroffene Dateien:** `frontend/src/components/PublicRecipe/PublicRecipePreviewModal.tsx`, `frontend/src/components/PublicRecipe/PreviewHeroHeader.tsx`, `frontend/src/components/PublicRecipe/PreviewIngredientsCard.tsx`, `frontend/src/components/PublicRecipe/index.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-09: Direktes Speichern öffentlicher Rezepte per Karten-Klick durch schwebendes Vorschau-Overlay (`PublicRecipePreviewModal`) ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Direkter Aufruf von `savePublicRecipeToCookbook` sofort beim Antippen einer Rezeptkarte auf der Startseite (`ExtractDemoRecipes.tsx`) oder im Kochbuch (`PublicRecipeRecommendationsShelf.tsx`), wodurch Rezepte ohne vorherige Einsichtnahme ungefragt ins Kochbuch importiert wurden.
  - Buttons auf öffentlichen Karten mit der Beschriftung „+ Ins Kochbuch“ / „Speichern“, die den Anschein erweckten, man müsse blind speichern.
  - Veralteter Subtitle auf der Startseite: *„Tippe auf ein Rezept, um es direkt in dein Kochbuch zu speichern“*.
* **Ersetzt durch:**
  - **Schwebendes Vorschau-Overlay ([`PublicRecipePreviewModal.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/PublicRecipe/PublicRecipePreviewModal.tsx)):** Tippen auf die Karte oder den Button öffnet ein zentriertes, modales Overlay (~92% Breite, max 85% Höhe) mit abgedunkeltem Backdrop.
  - **Fokussierte Teaser-Ansicht:** Zeigt Cover-Foto mit Zeit/Portionen-Badge, Titel, optionale Nährwerte (Makrobalken via `PreviewNutritionRow`) und Zutatenliste via `PreviewIngredientsList` (inkl. Portions-Skalierung). Zubereitungsschritte und Kochmodus/Gamification sind bewusst ausgeblendet.
  - **Bewusstes Speichern:** Fixierter Aktions-Dock am unteren Rand des Overlays mit „+ Ins Kochbuch speichern“. Nach dem Speichern schließt sich das Overlay und leitet direkt zur Vollansicht des Rezepts im Kochbuch weiter.
  - **Einheitliche Kartenbeschriftung:** Karten-Button heißt nun „Rezept ansehen“ (bzw. „Im Kochbuch“, falls bereits vorhanden).
* **Betroffene Dateien:** `frontend/src/components/PublicRecipe/PublicRecipePreviewModal.tsx`, `frontend/src/components/PublicRecipe/PreviewIngredientsList.tsx`, `frontend/src/components/PublicRecipe/PreviewNutritionRow.tsx`, `frontend/src/components/ExtractForm/ExtractDemoRecipes.tsx`, `frontend/src/components/SavedCatalog/PublicRecipeRecommendationsShelf.tsx`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-09: Redundante Social-Media-Icons & Cover-Overlays auf Rezeptkarten entfernt, Metadaten unter Titel vereinheitlicht

* **Ersetzter Code / Anti-Pattern:**
  - Plattform-Badge-Overlay (`TikTokIcon`, `InstagramIcon`, `ChefHat` im Backdrop-Pill oben rechts auf Cover-Bildern) in `ExtractDemoRecipes.tsx`.
  - Social-Media-Plattform-Icon (`PlatformIcon` mit Farbcodierung) in der Metazeile von `RecipePosterCard.tsx` im Kochbuch (Katalog & Startseiten-Shelves).
  - Doppel-Badges auf Rezept-Thumbnails, die das Food-Foto verdeckten und irrelevanten visuellen Clutter darstellten (Verstoß gegen Anti-Slop Badge-Test).
  - Dunkle Vignette (`bg-gradient-to-t`) und Glassmorphic-Dauer-Badge (`Clock + 30 Min.`) auf dem Cover-Bild im Kochbuch, die das Cover wie einen Video-Player wirken ließen.
  - Separate Meta-Unterzeilen mit knalligen Emojis/Farben (z. B. `🔥 1438 kcal` in Orange) oder isolierten Titeln mit leeren Abständen.
* **Ersetzt durch:**
  - **100 % sauberes Cover-Foto:** Das Food-Foto in `RecipePosterCard.tsx` bleibt vollkommen ungestört und ohne künstliche Abdunklung oder Overlays (abgesehen von System-Badges wie Favorit oder Remix-Stapel).
  - **Kompakte, gekoppelte Metazeile unter dem Titel:** Die Zubereitungsdauer und die dezent formatierten Kalorien (z. B. `30 Min. · 1.438 kcal` bzw. `Port.`) stehen gemeinsam in einer typografisch ruhigen Zeile (`text-[11px] font-medium text-gray-400 dark:text-gray-500`) mit dezentem `Clock`-Icon direkt unter dem Titel.
* **Betroffene Dateien:** `frontend/src/components/ExtractForm/ExtractDemoRecipes.tsx`, `frontend/src/components/SavedCatalog/RecipePosterCard.tsx`, `docs/OBSOLETE.md`.

---

### 2026-09-06: Komplexer 3-Schritte-Share-Mockup im leeren Kochbuch durch minimale Welcome-Card ersetzt & Filter/Suche erhalten

* **Ersetzter Code / Anti-Pattern:**
  - Komplexer 3-Schritte-Mockup (`ShareStep1Mockup`, `ShareStep2Mockup`, `ShareStep3Mockup`, `CatalogCopyLinkMockup`, `CatalogExtractMockup`) und Workflow-Tabs (`Direkt teilen` / `Kopieren & Einfügen`) in `CatalogEmptyState.tsx`.
  - Komplettes Ausblenden des Headers, der Suchleiste und der Filter (`CatalogFilters`) im leeren Kochbuchzustand durch frühen Return (`if (completedJobs.length === 0)` in `SavedCatalog/index.tsx`).
  - Rendern der öffentlichen Community-Empfehlungen (`PublicRecipeRecommendationsShelf`) oberhalb der kontextbasierten Empfehlungen (`shelves.recommended`) bzw. im leeren Kochbuchzustand.
* **Ersetzt durch:**
  - **Dauerhafte Such- und Filterleiste ([`SavedCatalog/index.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/index.tsx)):** `CatalogFilters` bleibt immer im Seitenlayout sichtbar; im leeren Kochbuch wird darunter die fokussierte Empty State Card gerendert.
  - **Minimalistische Empty State Card ([`CatalogEmptyState.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CatalogEmptyState.tsx)):** Großes `BookOpen`-Icon in abgerundetem Container, Titel (*„Dein Kochbuch wartet auf Rezepte!“*), Beschreibung und primärer Aktions-Button (*„Rezept hinzufügen“*) mit Weiterleitung zu `#/extract`.
  - **Empfehlungs-Reihenfolge ([`CookbookHome.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CookbookHome.tsx), [`CatalogEmptyState.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/SavedCatalog/CatalogEmptyState.tsx)):** Öffentliche Empfehlungen werden unterhalb der Standard-Empfehlungen (im befüllten Kochbuch) bzw. unterhalb der Welcome-Card (im leeren Kochbuch) gerendert, damit Nutzer direkt Rezepte entdecken und speichern können.
* **Betroffene Dateien:** `frontend/src/components/SavedCatalog/CatalogEmptyState.tsx`, `frontend/src/components/SavedCatalog/CookbookHome.tsx`, `frontend/src/components/SavedCatalog/index.tsx`, `docs/OBSOLETE.md`.

---

### 2026-09-06: Statische Hardcoded Demo-Rezepte & „Täglich neu“-Badge durch rein dynamische Demo-Rezepte aus der DB ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `STATIC_FALLBACKS` in `ExtractDemoRecipes.tsx`: Hardcodierte Dummy-Rezepte (*Pesto-Käse-Twists*, *Flammkuchen aus dem Mixer*) mit fest verdrahteten URLs und statischen Asset-Pfaden (`/demo/*.jpg`).
  - Statisches Badge `Täglich neu` mit `Sparkles`-Icon im Demo-Karten-Header.
  - Permanentes Anzeigen des Demo-Blocks selbst dann, wenn keine echten Rezepte vorhanden sind.
  - Veraltete Demo-Bilder im Assets-Ordner (`frontend/public/demo/*.jpg`, ~3.5 MB tote Bilddaten).
* **Ersetzt durch:**
  - **Dynamischer Datenbank-Fetch:** Demo-Rezepte werden ausschließlich via `GET /api/public/recipe/demo` aus der Datenbank bezogen (gefiltert nach `is_demo = true`).
  - **Bedingte Sichtbarkeit:** Der Block „Beliebte Rezepte zum Ausprobieren“ wird nur noch gerendert, wenn tatsächlich Demo-Rezepte in der Datenbank existieren (`recipes.length > 0`), andernfalls wird `null` zurückgegeben.
  - **Gelöschte Assets:** Der gesamte Ordner `frontend/public/demo/` wurde gelöscht.
* **Betroffene Dateien:** `frontend/src/components/ExtractForm/ExtractDemoRecipes.tsx`, `docs/OBSOLETE.md`.

---

### 2026-09-05: Rewarded Interstitial durch klassisches Rewarded Video mit konfigurierbarem Credit-Reward (`global_settings`) ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Experimentelles 5s-Rewarded-Interstitial (`showRewardInterstitialAdInternal`, `REWARDED_INTERSTITIAL_AD_ID`): Wurde vom Nutzer vorzeitig geschlossen, feuerte AdMob kein Belohnungs-Event (kein Reward erhalten). Zudem bieten klassische Rewarded Videos signifikant höhere eCPMs.
  - Fest verdrahtete `+1 Rezept` Gutschrift im Backend (`POST /api/me/rewarded-ad-claimed`) und statische Übersetzungsstrings (`+1 Rezept`).
* **Ersetzt durch:**
  - **Klassisches Rewarded Video ([`frontend/src/utils/ads.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/utils/ads.ts)):** Direkter Aufruf von `showRewardVideoAdInternal()` mit `REWARDED_AD_ID`.
  - **Dynamisch konfigurierbarer Belohnungswert ([`backend/src/db/settingsDb.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/db/settingsDb.ts)):** Einstellung `rewarded_ad_bonus_credits` in `global_settings` (Standard: 3), änderbar über `/api/admin/settings`.
  - **Vollständiger Datenfluss ins UI ([`useRecipeExtraction.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/hooks/useRecipeExtraction.ts), [`ExtractRewardedAdButton.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ExtractForm/ExtractRewardedAdButton.tsx)):** Übertragung via `GET /api/extractions/limit`, dynamische Button-Beschriftung (*„Video ansehen (+X Rezepte)“* / Singular *„Video ansehen (+1 Rezept)“*) und Erfolgs-Toast.
* **Betroffene Dateien:** `shared/src/types/extractions.ts`, `backend/supabase_schema.sql`, `backend/src/db/settingsDb.ts`, `backend/src/routes/userRoutes.ts`, `backend/src/routes/extractionRoutes.ts`, `frontend/src/utils/ads.ts`, `frontend/src/hooks/useRecipeExtraction.ts`, `frontend/src/components/ExtractForm/ExtractRewardedAdButton.tsx`, `frontend/src/components/ExtractForm/index.tsx`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-05: Rewarded Video Ad Button im Extraktions-Bottom-Sheet entfernt

* **Ersetzter Code / Anti-Pattern:**
  - Bedingter Rewarded-Video-Ad-Button („Video ansehen & Rezept erstellen (+1)“) innerhalb des URL-Bottom-Sheets in `ExtractSubmitButton.tsx`, der bei Erreichen des Extraktionslimits eingeblendet wurde.
  - Verleitete zu unruhigen UI-Wechseln und erlaubte das Öffnen von Eingabe-Sheets trotz Limitüberschreitung.
* **Ersetzt durch:**
  - **Disabled Import Cards & Externe Limit-Banner:** Wenn das Limit erreicht ist (`cookbookFull` oder `extractionLimitReached`), sind die Haupt-Aktionskarten auf der Startseite direkt `disabled` (50% Opacity, `cursor-not-allowed`, keine Klick-Aktionen).
  - Unmittelbar unter den Kacheln informiert die `PremiumHint`-Komponente transparent über den Grund und bietet den Upgrade-CTA an.
  - `ExtractSubmitButton.tsx` ist auf einen schlanken, strikt typisierten Submit-Button reduziert.
* **Betroffene Dateien:** `frontend/src/components/ExtractForm/ExtractSubmitButton.tsx`, `frontend/src/components/ExtractForm/ExtractActionCards.tsx`, `frontend/src/components/ExtractForm/UrlExtractSheet.tsx`, `frontend/src/components/ExtractForm/PhotoExtractSheet.tsx`, `frontend/src/components/ExtractForm/index.tsx`, `frontend/src/components/ExtractForm/types.ts`, `docs/OBSOLETE.md`.

---

### 2026-09-01: Separate Icon-Generierungs-Skripte durch All-in-One Pipeline (`npm run icons`) ersetzt

* **Ersetzter Code / Getrennte Workflows:**
  - `generateMissingIngredientIcons.ts` (`npm run icons:generate-missing`): Separates Skript, das lediglich fehlende Icons erzeugte, aber keine Geometrie-Prüfung, kein Auto-Zooming und kein Gemini Vision Review durchführte.
  - `generateIngredientImage.ts` (`npm run generate:ingredient-image`): Manuelles Entwickler-Skript mit CLI-Flags.
* **Ersetzt durch:**
  - **All-in-One Icon & Audit Pipeline ([`auditIngredientPipeline.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/scripts/auditIngredientPipeline.ts), Shortcut `npm run icons`):**
    - Übernimmt autonom die Generierung fehlender Icons (`--missing-only`), Geometrie-Auditing, Auto-Zooming, Gemini Vision Review mit adaptiven Prompt-Retries, Versions-Sicherung in `old/` und automatisches Repacken des `ingredient-icons.zip`-Archivs.
    - Gezielte Einzel-Zutaten-Audits via `--key "name"`.
    - Vollständig automatisierte Prompt-Generierung (manuelle `--prompt`-Flags entfernt).
* **Betroffene Dateien:** `backend/src/scripts/auditIngredientPipeline.ts`, `backend/src/audit/types.ts`, `backend/package.json`, `backend/src/scripts/README.md`, `docs/OBSOLETE.md`.

---

### 2026-08-31: Separater „Schon im Vorrat“-Kartenblock auf der Einkaufsliste durch Inline-Aisle-Highlighting ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Separater „Schon im Vorrat (Bitte prüfen)“-Block ganz oben auf der Einkaufsliste (`ShoppingInPantryCard.tsx`, Aufteilung in `toBuyMap` vs. `inPantryMap`), der Vorratszutaten aus ihren realen Supermarkt-Gängen (Obst & Gemüse, Kühlung, etc.) herausriss.
  - Zersplitterter Supermarkt-Laufweg (Nutzer mussten an zwei getrennten Stellen nach Zutaten suchen).
* **Ersetzt durch:**
  - **Inline-Aisle-Integration ([`ShoppingListGroup.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ShoppingList/ShoppingListGroup.tsx), [`ShoppingListItem.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/ShoppingList/ShoppingListItem.tsx)):** Alle Zutaten verbleiben in ihren natürlichen Supermarkt-Kategorien. Artikel, die bereits im Vorrat vorhanden sind, werden mit einem dezenten warmen bernsteinfarbenen Hintergrund (`bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl`) und einem Vorratsmengen-Badge (`📦 Im Vorrat: {amount}`) hervorgehoben.
  - **Gelöschte Komponenten:** `ShoppingInPantryCard.tsx` vollständig entfernt.
* **Betroffene Dateien:** `frontend/src/utils/shoppingAggregation.ts`, `frontend/src/components/ShoppingList/ShoppingListGroup.tsx`, `frontend/src/components/ShoppingList/ShoppingListItem.tsx`, `frontend/src/components/ShoppingList/ShoppingListView.tsx`, `frontend/src/components/ShoppingList/ShoppingInPantryCard.tsx` (gelöscht), `docs/OBSOLETE.md`.

---

### 2026-08-30: Vollständiger KI-Rezept-Neuschrieb & unstrukturierte Remix-Strings durch deterministische Recipe-Operations-Engine und private Sub-Rezepte ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - **Invasiver Full-LLM-Neuschrieb bei Remixen:** Jede Rezeptanpassung (z.B. Zutatentausch oder Beilagenhinzufügung) hat das gesamte Rezept-JSON via Gemini komplett von Grund auf neu generiert. Dies verbrauchte tausende Tokens, dauerte mehrere Sekunden und führte zu Halluzinationen oder veränderten Originalschritten.
  - **Unstrukturierte Freitext-Modifikationen:** Gemini lieferte vage Strings wie `"Tomaten-Gurken-Salat als Beilage hinzufügen"`, anstatt echte Einzelzutaten mit standardisierten Mengen, Einheiten, Makronährwerten und Zubereitungsschritten zu definieren.
  - **Überschreiben des Originalrezepts & Katalog-Duplikate:** Remix-Rezepte landeten entweder als eigenständige Klone im Haupt-Kochbuch oder überschrieben das Original.
* **Ersetzt durch:**
  - **Deterministische Pure Operations Engine ([`backend/src/recipeOperations.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/recipeOperations.ts)):** Gemini erzeugt über das Tool `modify_current_recipe` nur noch standardisierte Operationen (`REPLACE_INGREDIENT`, `ADD_INGREDIENTS`, `REMOVE_INGREDIENT`, `SCALE_SERVINGS`, `ADD_INSTRUCTION_STEP`). Die Anwendung auf das JSON erfolgt deterministisch in < 1ms.
  - **Upstream Open Food Facts Nährwert- & Mapping-Workflow:** Nach der deterministischen Operation durchlaufen neue/modifizierte Zutaten automatisch den bewährten `enrichRecipeWithCanonicalIngredients`-Workflow mit Open Food Facts Zuordnung.
  - **Private Remix-Architektur & Header-Präsentation:**
    - Das Originalrezept wird **niemals** modifiziert.
    - Remixe werden als privates Kind-Rezept (`parent_recipe_id = id`, `origin = 'remix'`) gespeichert.
    - Remixe tauchen nicht als separate Kacheln im Haupt-Katalog auf, sondern werden auf der Original-Rezeptkarte im Kochbuch dezent mit einem Sparkles-Badge markiert.
    - Im Header des Originalrezepts werden alle privaten Remixe des aktuellen Nutzers als horizontale Karussell-Karten ([`RecipeRemixList.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeRemixList.tsx)) angezeigt.
* **Betroffene Dateien:** `shared/src/types/recipes.ts`, `shared/src/types/cookbook.ts`, `backend/src/recipeOperations.ts`, `backend/src/recipeOperations.test.ts`, `backend/src/db/recipesDb.ts`, `backend/src/routes/recipeRoutes.ts`, `backend/src/gemini.ts`, `frontend/src/components/SavedCatalog/RecipePosterCard.tsx`, `frontend/src/components/SavedCatalog/RecipeListItem.tsx`, `frontend/src/components/RecipeDetails/RecipeHeader.tsx`, `frontend/src/components/RecipeDetails/RecipeRemixList.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotTransactionCard.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/useRecipeCopilot.ts`, `docs/OBSOLETE.md`.

---

### 2026-08-30: Horizontale Quick-Chips-Leiste & Sparkles-Toggle am unteren Rand im Copilot entfernt

* **Ersetzter Code / Anti-Pattern:**
  - Horizontale Scroll-Leiste (`showChips && <div className="flex items-center gap-2 overflow-x-auto ...">`) über der Eingabeleiste in `CopilotInputBar.tsx`.
  - Sparkles-Toggle-Button auf der linken Seite des Eingabefeldes zum Ein-/Ausblenden der Chips.
  - Doppelte / redundante Darstellung von Vorschlägen (sowohl in der Chat-Begrüßung als auch unten im Input-Dock).
* **Ersetzt durch:**
  - **Reine 1-Tap Action-Pills im Chatverlauf ([`CopilotChatList.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotChatList.tsx), [`CopilotMessageItem.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotMessageItem.tsx)):** Vorschläge sitzen jetzt immer direkt unter der jeweiligen Bot-Nachricht.
  - **Fokussiertes, schlankes Input-Dock ([`CopilotInputBar.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotInputBar.tsx)):** Nur noch das Vollhöhen-Eingabefeld und der Senden-Button für ein maximal ruhiges, aufgeräumtes Chat-Dock.
* **Betroffene Dateien:** `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotInputBar.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/types.ts`, `frontend/src/components/RecipeDetails/RecipeCopilot/useRecipeCopilot.ts`, `frontend/src/components/RecipeDetails/RecipeCopilot/index.tsx`, `docs/OBSOLETE.md`.

---

### 2026-08-30: Schwebende Welcome-Card-Insel im Copilot durch natürliche Bot-Begrüßungs-Bubble ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `CopilotWelcomeCard.tsx`: Eine künstliche, schwebende Kasten-Insel in der Bildschirmmitte mit redundanten Einstiegsvorschlägen, die beim Senden der ersten Nachricht abrupt verschwand.
  - Doppelte Anzeige von Quick-Chips (in der Welcome-Card UND gleichzeitig in der horizontalen Input-Leiste).
* **Ersetzt durch:**
  - **Natürliche Initial-Greeting Turn ([`CopilotChatList.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotChatList.tsx)):** Der Chat startet nahtlos mit einer ersten Bot-Nachricht oben links und bindet die 3–4 rezeptspezifischen Vorschlags-Pills direkt als 1-Tap Action Pills darunter ein.
  - **Konsistenter, linearer Verlauf:** Wenn der Nutzer tippt oder einen Chip anklickt, bleibt der Chat-Verlauf 100% flüssig ohne Layout-Sprünge.
* **Betroffene Dateien:** `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotChatList.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotMessageItem.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotWelcomeCard.tsx` (gelöscht), `docs/OBSOLETE.md`.

---

### 2026-08-30: Blickdichter HeroUI Drawer (Bottom-Sheet) im RecipeCopilot durch immersives Glassmorphic-Overlay ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - HeroUI `<Drawer>` und `<Drawer.Dialog>` mit festem blickdichtem Hintergrund (`bg-white dark:bg-gray-900`) und grauer Chatliste (`bg-[#f9fafb] dark:bg-gray-950`).
  - Beim Öffnen des Copilots wurde das Rezept bzw. der Kochmodus im Hintergrund komplett von einer undurchsichtigen Sheet-Fläche überlagert.
* **Ersetzt durch:**
  - **Immersives Full-Screen Glassmorphism-Overlay ([`RecipeCopilot/index.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/index.tsx)):** `fixed inset-0 z-[100] backdrop-blur-2xl bg-black/25 dark:bg-black/55`.
  - **Schwebende Glass-Komponenten:**
    - Schwebender Glass-Header ([`CopilotHeader.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotHeader.tsx)) mit Bot-Live-Indicator und Glass-Pill-Buttons.
    - Schwebende transluzente Chat-Bubbles ([`CopilotChatList.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotChatList.tsx)).
    - Schwebendes Glass-Dock für Input & Quick-Chips ([`CopilotInputBar.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotInputBar.tsx)).
    - Schwebende Transaktionskarte ([`CopilotTransactionCard.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeCopilot/CopilotTransactionCard.tsx)).
* **Betroffene Dateien:** `frontend/src/components/RecipeDetails/RecipeCopilot/index.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotHeader.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotChatList.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotInputBar.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/CopilotTransactionCard.tsx`, `frontend/src/components/RecipeDetails/RecipeCopilot/types.ts`, `docs/styleguide.md`, `docs/OBSOLETE.md`.

---

### 2026-08-30: Sequenzielle Extraktions-Pipeline & 16-Einzelbild-Upload durch Pipeline-Parallelisierung und Client-Canvas-Grid ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Sequenzielle Ausführung von FLUX.1 Cover-Bildgenerierung (`generateRecipeCoverImage`) und Open Food Facts Ingredient Normalisierung (`enrichRecipeWithCanonicalIngredients`) im Worker (`queue.ts`), was 2,5–4,5 Sekunden reine Wartezeit addierte.
  - Upload von 16 unkomprimierten/separaten Base64-Einzelbildern (3–8 MB JSON Payload) vom Client an `POST /api/extract-recipe/frames` mit nachgelagertem serverseitigen Sharp-Compositing.
  - Starres 2000ms Polling im Backend-Worker (`workerTick`) und Frontend (`ExtractionJobsContext.tsx`, `useRecipeExtraction.ts`), wodurch Statuswechsel (`pending` ➔ `awaiting_frames` ➔ `processing` ➔ `completed`) unnötige 3–6 Sekunden Leerlauf erzeugten.
* **Ersetzt durch:**
  - **Pipeline-Parallelisierung ([`backend/src/queue.ts`](file:///c:/Users/lucas/source/repos/cookbook-worktrees/fast-recipe-extraction/backend/src/queue.ts)):** Zeitgleiche Ausführung von Cover-Generierung und kanonischem Zutatabgleich via `Promise.all()` über alle Extraktionsmodi (URL, Foto, Remix) – spart 2,5–4,5s pro Extraktion.
  - **Client-seitiges 4x4 Canvas Grid Compositing ([`frontend/src/utils/gridCanvas.ts`](file:///c:/Users/lucas/source/repos/cookbook-worktrees/fast-recipe-extraction/frontend/src/utils/gridCanvas.ts)):** Direktes Zeichnen der 16 Video-Keyframes auf ein Off-Screen HTML5-Canvas als ein einziges 1024×1024 JPEG-Grid (`gridBase64`, ~180–250 KB; 97% weniger Payload) und sofortiges Durchreichen an Gemini Vision ohne Sharp-Latenz.
  - **Event-gesteuerter Worker-Tick ([`triggerWorkerTick`](file:///c:/Users/lucas/source/repos/cookbook-worktrees/fast-recipe-extraction/backend/src/queue.ts)):** Sofortiges Aufwecken des Workers bei Job-Erstellung und Frame-Upload.
  - **Adaptives Fast-Polling (600ms):** Eager Polling und 600ms Intervall während aktiver Extraktionen im Frontend (`ExtractionJobsContext.tsx` & `useRecipeExtraction.ts`).
* **Betroffene Dateien:** `backend/src/queue.ts`, `backend/src/types/jobs.ts`, `backend/src/routes/extractionRoutes.ts`, `backend/src/routes/recipeRoutes.ts`, `frontend/src/utils/gridCanvas.ts`, `frontend/src/utils/videoFrames.ts`, `frontend/src/context/ExtractionJobsContext.tsx`, `frontend/src/hooks/useRecipeExtraction.ts`, `docs/architecture/scraping-and-imports.md`, `docs/architecture/ai-gemini.md`, `docs/OBSOLETE.md`.

---

### 2026-08-30: Lokale Einkaufsliste & isolierte Rezepte durch Cloud-persistiertes Vorratslager & geteilte Rezepte ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Reine clientseitige `localStorage` Speicherung (`recipe_shopping_list`) in `useShoppingList.ts` ohne Cloud-Sync über mehrere Geräte oder Web/App-Wechsel.
  - Flache ungefilterte Einkaufslisten ohne Abgleich mit vorhandenen Vorräten zuhause (User kauften Zutaten doppelt).
  - Fehlende automatische Bestandsverwaltung beim Kochen oder Einkaufen.
  - Fehlende Veröffentlichungs- und Community-Verwertungs-Möglichkeit für KI-überarbeitete Rezepte.
* **Ersetzt durch:**
  - **Supabase-persistierte Einkaufsliste & Vorratslager (`shopping_list`, `pantry_items`, `pantryDb.ts`, `shoppingListDb.ts`):** RLS-gesicherte Cloud-Speicherung mit Offline-Fallback.
  - **Automatischer Vorratstransfer & Zutatensynchronisation:** Beim Abhaken von Artikeln auf der Einkaufsliste landen diese automatisch im Vorrat (`pantry_items`), angereichert mit Supermarkt-Packungsgrößen und Haltbarkeitsdauern (`ingredient_mappings`).
  - **Smarter Vorratsabzug beim Kochen:** Beim Kochen eines Rezepts (`POST /api/recipes/:id/cooked`) werden genutzte Zutaten unter automatischer Einheitenumrechnung (`g` ↔ `kg`, `ml` ↔ `l`) vom Vorrat abgezogen und bei 0 gefloort.
  - **Anti-Food-Waste Empfehlungs-Engine (`getPantryRecipeSuggestions`):** Schlägt Rezepte aus dem eigenen Kochbuch sowie öffentlichen Community-Rezepten vor, die bald ablaufende Zutaten verwerten.
  - **Rezept-Sichtbarkeit:** URL-extrahierte Rezepte sind standardmäßig öffentlich (`visibility = 'public'`), während Foto- und Remix-Rezepte privat bleiben und per `PATCH /api/recipes/:id/visibility` angepasst werden können.
* **Betroffene Dateien:** `backend/db/migrations/006_pantry_and_shopping_list.sql`, `backend/src/db/pantryDb.ts`, `backend/src/db/shoppingListDb.ts`, `backend/src/routes/pantryRoutes.ts`, `backend/src/routes/shoppingListRoutes.ts`, `frontend/src/context/PantryContext.tsx`, `frontend/src/hooks/useShoppingList.ts`, `frontend/src/components/Pantry/`, `frontend/src/components/ShoppingList/`, `docs/OBSOLETE.md`.

---

### 2026-08-30: Einmalige ungesicherte RapidAPI-Scraping-Aufrufe & irreführende Fehlermeldung ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Direkte, un-retried `fetch()`-Aufrufe gegen RapidAPI (`social-download-all-in-one`) in `rapidApiMetadata.ts` und `rapidApi.ts`.
  - Harter sofortiger Abbruch bei transienten Proxy-/Knotenfehlern (`{ error: true }`, `{ error: "unknown" }` oder HTTP 500/502).
  - Irreführende deutsche Fehlermeldung für `SCRAPE_FAILED` („Aus diesem Link konnte leider kein Rezept erkannt werden. Das Video ist privat, gelöscht oder enthält keine Rezeptbeschreibung.“), die dem Nutzer fälschlich suggerierte, dass ein öffentlicher, funktionierender Post fehlerhaft oder privat sei.
* **Ersetzt durch:**
  - **In-Provider Retry mit Exponential Backoff & Jitter ([`withRetry`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/retry.ts)):** Bis zu 3 Versuche (Basis 1200ms + Jitter) fangen flüchtige RapidAPI-Proxy-Timeouts, 429 Rate-Limits und Bad-Gateway-Zustände vollautomatisch ab. Fatale Auth-Fehler (401/403) brechen sofort ab.
  - **Detaillierte Fehler-Diagnostik:** Auslesen von `message`, `detail` und HTTP-Statuscode im Backend-Log.
  - **Nutzerfreundliche Lokalisierung:** Klare `SCRAPE_FAILED`-Meldung im Frontend (`i18n.ts`), die auf temporäre Störungen hinweist und zum erneuten Versuch auffordert.
* **Betroffene Dateien:** `backend/src/retry.ts`, `backend/src/scrapers/providers/rapidApiMetadata.ts`, `backend/src/scrapers/providers/rapidApi.ts`, `backend/src/scrapers/providers/types.ts`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-08-30: 3-Monats-Holiday-Lockout & starre Uhrzeit-Empfehlungen durch Hybrid-Planungs- & Discovery-Engine ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - 3-monatige Grillsaison (`grill_season` von Juni bis August) in `getActiveHolidays()` (`shared/src/season.ts`) mit dauerhaftem Top-Score (90–100 Punkte). Dadurch wurden im Sommer alle anderen Themen (Comfort Food, Brunch, Feierabendküche, Wiederentdeckungen) 3 Monate lang komplett blockiert/überstimmt.
  - Starre tageszeitliche Zeitfenster (z. B. Feierabendküche nur Mo–Do 15–22 Uhr; Wochenende nur ab 14 Uhr). Da Nutzer Koch- und Planungs-Apps mit Vorlaufzeit (Einkaufszettel, Wochenplaner) und meist abends nutzen, führte dies zu Monotonie und fehlender Inspiration.
* **Ersetzt durch:**
  - **Hybrides Planungs- & Discovery-Modell ([`shared/src/recommendations.ts`](file:///c:/Users/lucas/source/repos/cookbook/shared/src/recommendations.ts)):**
    - **Vorausschauende Wochentags-Planung:** Sonntag & Montag (Wochenstart & Schnelle Küche $\le 30$ Min.), Freitag (Wochenend-Start & Comfort Food), Samstag (Brunch am Vormittag / Grillen & Kochprojekte am Nachmittag).
    - **Tägliche thematische Entdeckung:** Dienstag (Saisonaler Frische-Genuss), Mittwoch (Wiederentdeckte Schätze), Donnerstag (Pasta & Schnelle Lieblinge).
    - **Echte Kurzzeit-Feiertage:** Valentinstag, Silvester, Halloween, Weihnachten erhalten nur an ihren 2–5 echten Kerntagen Top-Priorität (Score 95+).
    - **Stabile Fallback-Kaskade:** Hat ein Nutzer weniger als 2 Treffer für das primäre Tagesthema, greift automatisch das nächste Thema (Saisonal $\to$ Wiederentdeckt $\to$ Favoriten).
* **Betroffene Dateien:** `shared/src/season.ts`, `shared/src/recommendations.ts`, `shared/src/recommendations.test.ts`, `frontend/src/i18n.ts`, `docs/OBSOLETE.md`.

---

### 2026-08-26: BLS 4.0 (Bundeslebensmittelschlüssel) durch Open Food Facts (OFF) DACH SQLite-Index ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Statischer BLS 4.0 JSON-Katalog (`canonicalIngredientsData.json`, `canonicalIngredients.ts`) und zugehörige MiniSearch-Indizes (`ingredientIndex.ts`).
  - Fehlende Trend-Lebensmittel, Marken- und Fitnessprodukte (z. B. *Eat Lean, Reispapier, Buldak, Sriracha, Proteinpudding*), die im BLS nicht existierten und geschätzt werden mussten.
  - Abwärtskompatibilitäts-Brücken zu alten BLS-Codes in `ingredientMatcher.ts`.
* **Ersetzt durch:**
  - **Open Food Facts DACH SQLite-Katalog (`openFoodFactsIndex.ts`, `off_de.sqlite`):** 438.000+ deutsche Supermarkt-, Marken- und Grundnahrungsmittel mit blitzschnellem FTS5-Volltextindex (BM25 + Purity-Boost für unverarbeitete NOVA-1-Lebensmittel).
  - **Neuer Mapping-Store Aufbau:** Die `ingredient_mappings`-Tabelle wird neu mit echten OFF-Produktcodes und präzisen Nährwerten aufgebaut.
* **Betroffene Dateien:** `backend/src/matching/openFoodFactsIndex.ts`, `backend/src/matching/ingredientMatcher.ts`, `backend/src/matching/resolverTools.ts`, `backend/src/matching/ingredientResolver.ts`, `backend/src/scripts/buildOpenFoodFactsIndex.ts`, `docs/OBSOLETE.md`.

---

### 2026-08-28: Vollständige Bereinigung aller verbliebenen BLS-Dateien, Codes und Referenzen

* **Ersetzter Code / Anti-Pattern:**
  - `backend/src/data/bls_4_0_daten_2025_de.csv` (10 MB alte BLS-CSV-Datei).
  - `backend/src/data/canonicalIngredientsData.json` (~5 MB alter statischer BLS-JSON-Katalog).
  - `backend/src/matching/baseNameMap.ts` (altes BLS BaseName Dictionary).
  - Veralteter BLS MiniSearch Index `backend/src/matching/ingredientIndex.ts`.
  - Veraltetes BLS-Generierungsskript `backend/src/scripts/buildBLSIngredients.ts`.
  - Veraltete BLS-Skripte: `generateBaseNameIngredientIcons.ts`, `seedIngredientMappings.ts`, `dumpBaseNameMappings.ts`, `renameIconsToEnglishBaseNames.ts`, `migrateIconsToOpenFoodFacts.ts`, `purgeGermanIcons.ts`, `pocOpenFoodFacts.ts`.
  - Veraltete `bls_code` / `blsCode`-Properties in TypeScript-Typen (`CanonicalIngredient`, `IngredientMapping`, `ResolverResult`), Resolver-Tools, Matcher und Admin-Routen.
* **Ersetzt durch:**
  - Ausschließliche Verwendung von `product_code` / Open Food Facts Barcodes & IDs (`off_de.sqlite` via `openFoodFactsIndex.ts`) im gesamten Backend, in Resolver-Tools, DB-Queries und Frontend-Dokumentationen.
  - In [`canonicalIngredients.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/data/canonicalIngredients.ts) verbleiben schlanke TypeScript-Interfaces (`CanonicalIngredient`, `CanonicalNutrients`) als universelles Datenformat.
* **Betroffene Dateien:** `backend/src/data/canonicalIngredientsData.json` (gelöscht), `backend/src/data/canonicalIngredients.ts`, `backend/src/matching/baseNameMap.ts` (gelöscht), `backend/src/matching/openFoodFactsIndex.ts`, `backend/src/matching/mappingStore.ts`, `backend/src/matching/resolverTools.ts`, `backend/src/matching/ingredientResolver.ts`, `backend/src/matching/ingredientMatcher.ts`, `backend/src/routes/adminRoutes.ts`, `backend/src/scripts/backfillIngredientMappings.ts`, `backend/src/scripts/generateIngredientImage.ts`, `frontend/src/hooks/useRecipeNutrition.ts`, `docs/OBSOLETE.md`.

---

### 2026-08-28: Bereinigung von Legacy-Kategorien & Löschung redundanter Kategorie-Icon-Dateien

* **Ersetzter Code / Anti-Pattern:**
  - Veraltete Legacy-Enum-Werte `PRODUCE`, `BAKERY`, `PANTRY`, `BAKING`, `CONDIMENTS_OILS` in `IngredientCategory` (`frontend/src/i18n.ts`).
  - Redundante physische Alias-Bilddateien (`produce.webp`, `bakery.webp`, `condiments_oils.webp`, `baking.webp`, `pantry.webp`) in `backend/public/category-icons/` und `frontend/public/category-icons/`.
* **Ersetzt durch:**
  - **Strikte 15 kanonische Supermarkt-Hauptkategorien:** `VEGETABLES`, `FRUITS`, `DAIRY_EGGS`, `MEAT_POULTRY`, `SEAFOOD`, `GRAINS_PASTA`, `OILS_CONDIMENTS`, `SPICES_HERBS`, `NUTS_SEEDS`, `SWEETS_SNACKS`, `BEVERAGES`, `PANTRY_BAKING`, `PREPARED_DISHES`, `FROZEN`, `OTHER`.
  - **Reines String-Mapping in `legacyCategoryMap`:** Sprachvariationen (z. B. `'produce'`, `'bakery'`, `'baking'`, `'pantry'`) werden direkt auf die 15 kanonischen Keys abgebildet, ohne separate Enum-Werte oder Dateiduplikate.
* **Betroffene Dateien:** `frontend/src/i18n.ts`, `backend/src/scripts/generateCategoryIcons.ts`, `backend/public/category-icons/`, `frontend/public/category-icons/`, `docs/OBSOLETE.md`.

---

### 2026-08-28: Redundantes `searchQueries`-Feld aus Gemini-Zutaten-Schema entfernt

* **Ersetzter Code / Anti-Pattern:**
  - `searchQueries: string[]` in `shared/src/types/recipes.ts`, `backend/src/gemini.ts`, `ingredientMatcher.ts` und `ingredientResolver.ts`.
  - Gemini generierte für jede Zutat 2–3 redundante Suchbegriffe (z. B. `["Frischkäse", "Cream Cheese"]`), was ~15–25 Output-Token pro Zutat kostete.
* **Ersetzt durch:**
  - **Dynamische Suchbegriff-Generierung ([`matcherUtils.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/matching/matcherUtils.ts)):** Suchbegriffe für den Open Food Facts Matcher werden vollautomatisch aus `brand`, `name`, `modifier`, `baseName` und `synonyms` zusammengesetzt.
  - **Strikte englische Singular-Synonyme (`synonyms: string[]`):** Gemini liefert 1–3 alternative englische `baseName`-Synonyme (z. B. `passata`, `scallion`, `courgette`) für den selbstlernenden Synonym-Graphen und Icon-Lookups.
* **Betroffene Dateien:** `shared/src/types/recipes.ts`, `backend/src/gemini.ts`, `backend/src/matching/ingredientMatcher.ts`, `backend/src/matching/ingredientResolver.ts`, `backend/src/matching/matcherUtils.ts`, `backend/src/matching/resolverTools.ts`.

---

### 2026-08-26: Fast-Path komplett entfernt zugunsten des gelernten Mapping-Stores & Gemini-Resolvers

* **Ersetzter Code / Anti-Pattern:**
  - `findFastPathMatch()` und alle heuristischen O(1) Fast-Path Lookups (Alias-Maps, BaseName-Maps).
  - Führte zu statischer Vorab-Zuordnung, die Kontext und Feinheiten (Marken, Zubereitungsformen, Modifikatoren) nicht dynamisch im Dialog prüfen konnte.
* **Ersetzt durch:**
  - **Einheitlicher Store & Resolver Pipeline (`resolveAndRemember`):** Jede Zutat läuft über den gelernten Supabase In-Memory/DB-Mapping-Store (`mappingStore.ts`). Bei Cache-Miss wird automatisch der Multi-Turn Gemini Tool-Resolver (`ingredientResolver.ts`) aufgerufen und das Ergebnis im Store persistiert.
* **Betroffene Dateien:** `backend/src/matching/ingredientMatcher.ts`, `backend/src/matching/ingredientIndex.ts`, `docs/OBSOLETE.md`.

---

### 2026-08-25: Lose Zutat-Icons (`.webp`) in Git durch komprimiertes Zip-Archiv mit Startup-Extraktion ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Tracking von über 700 einzelnen `.webp`-Binärdateien im Git-Repository unter `backend/public/ingredient-icons/*.webp`.
  - Führte zu aufgeblähtem Git-Index, langsamen Tree-Diffs und unübersichtlichen Commit-Historien.
* **Ersetzt durch:**
  - **Einheitliches Zip-Archiv (`backend/public/ingredient-icons.zip`):** Alle generierten Zutat-Icons werden in einer einzigen ca. 13 MB Datei in Git gespeichert.
  - **Startup Auto-Extraction (`ensureIngredientIconsExtracted` in `backend/src/ingredientIconPacker.ts`):** Entpackt das Archiv beim Serverstart (Railway/Docker/Lokal) automatisch via `adm-zip` in ~200ms, gesteuert über einen `.unpacked_stamp`-Prüfmechanismus.
  - **Packaging-Workflow (`npm run icons:zip`):** Automatische Aktualisierung des Zip-Archivs bei Bedarf oder nach Batch-Generierungen (`generateBaseNameIngredientIcons.ts`).
* **Betroffene Dateien:** `.gitignore`, `Dockerfile`, `backend/src/ingredientIconPacker.ts`, `backend/src/scripts/zipIngredientIcons.ts`, `backend/src/index.ts`, `backend/src/scripts/generateBaseNameIngredientIcons.ts`, `package.json`, `backend/package.json`.

---

### 2026-08-24: Manuelles Umschalten der Zutat-Nährwerte (`showIngredientNutrition`) entfernt

* **Ersetzter Code / Anti-Pattern:**
  - `showIngredientNutrition`-Toggle-Button in [`RecipeIngredients.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/RecipeIngredients.tsx) und zugehöriger lokaler State (`localStorage.getItem('recipe_show_ingredient_nutrition')`) in [`RecipeDetails/index.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/RecipeDetails/index.tsx).
  - Nährwertangaben je Zutat (Kcal-Chips) mussten manuell per Klick auf „Nährwerte" im Header aktiviert werden.
* **Ersetzt durch:**
  - **Permanente Anzeige:** Kcal-Chips werden bei vorhandenen Nährwertdaten immer direkt neben den Zutaten gerendert.
  - Der überflüssige Toggle-Button im Zutaten-Header wurde ersatzlos entfernt.
* **Betroffene Dateien:** `frontend/src/components/RecipeDetails/RecipeIngredients.tsx`, `frontend/src/components/RecipeDetails/index.tsx`.

---

### 2026-08-23: Emojis als Fallback für Zutaten-Icons durch 3D-Studio-Kategorie-Icon-Set ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Fallback- und Lade-Zustand-Emojis (`categoryIcons` mit `🥦`, `🍎`, `🥛`, `🥩`, `🍝` etc.) in [`IngredientIcon.tsx`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/components/IngredientIcon.tsx), wenn kein spezifisches Canonical-Icon vorhanden war oder dieses noch geladen wurde.
  - Führte zu optischer Diskrepanz (unterschiedliche Betriebssystem-Emoji-Renderings auf Android/iOS/Desktop, pixelige Darstellung, mangelnder Einklang mit dem modernen App-Design).
* **Ersetzt durch:**
  - **3D-Studio-Kategorie-Icon-Set (`frontend/public/category-icons/*.webp` & `backend/public/category-icons/*.webp`):** Einheitlich auf reinweißem Hintergrund gerenderte, isolierte 3D-Food-Icons für alle Supermarkt-Kategorien im exakt gleichen Stil wie die individuellen Zutat-Icons.
  - **`getCategoryIconUrl()` in [`frontend/src/i18n.ts`](file:///c:/Users/lucas/source/repos/cookbook/frontend/src/i18n.ts):** Schnelles O(1)-Mapping für Standard- und Legacy-Kategorien zu lokalen WebP-Assets.
  - **`IngredientIcon.tsx` Update:** Rendert das Kategorie-Icon im identischen Kachel-Stil (`bg-white rounded-xl`) als Fallback und als dezentes semi-transparentes Lade-Overlay.
  - **Endpoint `GET /api/category-icons/:filename` in [`backend/src/ingredientImageRoutes.ts`](file:///c:/Users/lucas/source/repos/cookbook/backend/src/ingredientImageRoutes.ts):** Backend-seitige Bereitstellung mit Fallback auf `other.webp`.
* **Betroffene Dateien:** `frontend/src/components/IngredientIcon.tsx`, `frontend/src/i18n.ts`, `frontend/public/category-icons/`, `backend/src/ingredientImageRoutes.ts`, `backend/public/category-icons/`.

---

### 2026-08-22: Quota-Verbrauch bei abgebrochenen/unterbrochenen Extraktionen (`status = 'cancelled'`) entfernt

* **Ersetzter Code / Anti-Pattern:**
  - `getExtractionsForUserInTimeframe()` in `backend/src/db.ts` zählte Jobs mit Status `'cancelled'` als verbrauchte Extraktionen für das rollierende Tageslimit.
  - Wenn Free-User während der Extraktion die App verließen oder minimierten, wurde der Job zwar abgebrochen (`POST /api/jobs/:id/cancel`), das Kontingent war jedoch verloren, sodass der User bei erneutem Versuch ggf. in den `RATE_LIMIT_EXCEEDED` (429) Fehler lief.
* **Ersetzt durch:**
  - **Ausschluss abgebrochener Jobs (`.neq('status', 'cancelled')`):** Nur erfolgreich durchgeführte (`completed`) bzw. in Bearbeitung befindliche Extraktionen verbrauchen Quota. Abgebrochene und fehlgeschlagene Jobs belasten das Tageslimit nicht.
  - **Frühzeitiger Worker-Abbruch (`queue.ts`):** Vor LLM-Aufrufen und Job-Abschluss wird `isJobCancelled()` geprüft, um unnötige KI-Kosten zu vermeiden und den `'cancelled'` Status nicht zu überschreiben.
  - **Auto-Refresh im Frontend (`useRecipeExtraction.ts`):** Aktualisierung des Limit-Status (`fetchLimitStatus`) beim Zurückkehren in den Vordergrund.
* **Betroffene Dateien:** `backend/src/db.ts`, `backend/src/queue.ts`, `frontend/src/hooks/useRecipeExtraction.ts`, `docs/architecture/backend-and-database.md`.

---

### 2026-08-21: `selectBestFoodFrame` & Grid-Zahlen entfernt zugunsten reiner In-Memory Gemini-Rezept-Extraktion

* **Ersetzter Code / Anti-Pattern:**
  - `selectBestFoodFrame()` in `backend/src/gemini.ts` und `backend/src/queue.ts`, das separate API-Calls zur Auswahl von Cover-Frames durchführte.
  - Text- und Zahlen-Overlays (`drawtext`) auf Grid-Kacheln in `backend/src/frameExtractor.ts`.
* **Ersetzt durch:**
  - **In-Memory 4x4 Grid (`createGridBufferFromFrames` via `sharp`):** Aus 16 flüchtigen Client-Frames wird im RAM ohne Disk-IO und ohne Subprozesse ein einziges unnummeriertes 4x4 Grid gebaut.
  - Das Grid dient **ausschließlich** als hochauflösendes visuelles Kontextbild (nur 258 Tokens!) für Gemini `extractRecipe`.
  - Cover-Bilder stammen weiterhin sauber und urheberrechtssicher aus offiziellen API-Metadaten oder FLUX-AI-Generierung.
* **Betroffene Dateien:** `backend/src/frameExtractor.ts`, `backend/src/gemini.ts`, `backend/src/queue.ts`, `backend/src/routes.ts`, `frontend/src/utils/videoFrames.ts`.

---

### 2026-08-21: DOM `<video>`-Element Frame-Capture durch Headless WebCodecs (`VideoDecoder` + `mp4box`) ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - Offscreen HTML5 `<video>`-Elemente (`document.createElement('video')`) im DOM zur Frame-Extraktion auf Mobilgeräten.
  - Asynchrones DOM-Laden, Event-Listener (`loadeddata`, `seeked`), GPU-Throttling für unsichtbare/versteckte DOM-Elemente und Timing-Hänger bei pausiertem Video.
* **Ersetzt durch:**
  - **Headless In-Memory Frame Extraktion (`WebCodecs` API & `mp4box`):** Vollständig deterministisches Parsing im RAM ohne DOM-Beteiligung.
  - Native `VideoDecoder`-Pipeline mit Ausrichtung an Keyframe-Grenzen (`rapAlignment`) und Skalierung direkt im Ziel-Canvas.
* **Betroffene Dateien:** `frontend/src/utils/videoFrames.ts`, `frontend/src/types/mp4box.d.ts`.

---

### 2026-08-21: `jobs`-Tabelle als Alleskönner aufgetrennt in `jobs` / `recipes` / `user_recipes`

* **Ersetzter Code / Anti-Pattern:**
  - **Eine `jobs`-Zeile war drei Dinge gleichzeitig:** Extraktions-Task, Rezept-Inhalt (`recipe jsonb`) und Kochbuch-Eintrag des Users (`is_favorite`, `flags`, `deleted_at`, `recipe_collections.job_id`, `cook_events.job_id`). Ein Rezept konnte damit weder mehreren Usern gehören noch öffentlich werden.
  - **Polymorphe `jobs.recipe`-Spalte:** hielt entweder das Rezept *oder* einen Fortschritts-Platzhalter `{isProgress:true, percent, stage}`. `queue.ts` schrieb den ~14× pro Job-Lauf, `rowToJob()` unterschied zur Lesezeit per `isProgress`. Fehlgeschlagene Jobs blieben mit totem Platzhalter zurück (10 Zeilen in prod).
  - **`normalizeRecipe()` in `db.ts`:** drei Alt-Shims, die bei *jedem* Read liefen, ohne je zu persistieren — `recipe.id = jobId` injizieren, `nutritionalEstimates → nutritionalValues` umbenennen, flache Zutaten-Arrays in Gruppen wandeln.
  - **Ins JSONB gespiegelte Job-Spalten:** `parent_job_id → recipe.parentJobId`, `prompt → recipe.remixPrompt` beim Lesen, beim Schreiben zurückgestempelt.
  - **`jobs.deleted_at` mit zwei unvereinbaren Bedeutungen:** Quota-Hack (ein gelöschtes Rezept darf das Extraktionslimit nicht zurückerstatten) *und* Abbruch-Signal für den Worker (`isJobDeleted`). Entsprechend meinte `DELETE /api/jobs/:id` zweierlei: Extraktion abbrechen und Rezept aus dem Kochbuch werfen.
  - **`saveCompletedRemix()`:** erzeugte für einen inline fertiggestellten Copilot-Remix eine vollständige „completed"-Job-Zeile, obwohl nie ein Job lief.
  - **Zweistufiger Titel-Lookup in `getRecentCookPhotos()`:** eine zweite Query nach `jobs.recipe->>'title'`, weil der Titel in einem JSONB-Blob steckte.
  - **`isPhotoJobUrl(url)` / `job.parentJobId`-Sniffing** als Branch-Dispatch im Worker.
  - **Migrations-Skript `backend/src/scripts/migrateLlmUsage.ts`** (npm-Script `migrate:llm-usage`) — durch die Auftrennung gegenstandslos.
* **Ersetzt durch:**
  - **`recipes`** — der Inhalt, mit echten Spalten statt Blob (Nährwerte als vier Skalare, flache Listen als `text[]`; nur `ingredients`/`instructions` bleiben JSONB). Trägt `created_by`, `origin`, `parent_recipe_id` und `visibility` (`private`/`unlisted`/`public`) als Andockpunkt fürs spätere Teilen und Veröffentlichen.
  - **`jobs`** — nur noch der Task. Eigene `progress jsonb`-Spalte, `kind` (`url`/`photo`/`remix`) statt Sniffing, `cancelled` als echter Status statt Soft-Delete, `recipe_id` als Ergebnis-Zeiger. Job-Zeilen werden nie gelöscht und tragen damit das Rate-Limit.
  - **`user_recipes`** — der Kochbuch-Eintrag pro User (Hard Delete), mit `source` (`extraction`/`photo`/`remix`/`share`) als Andockpunkt fürs Teilen ohne Content-Kopie.
  - **`complete_job()` RPC (`SECURITY DEFINER`):** Abschluss über drei Tabellen atomar. Vorher war das ein einziges `UPDATE`; ohne die Funktion gäbe es ein Crash-Fenster, in dem ein User Quota bezahlt hat und kein Rezept bekommt.
  - **`recipeToRow()` / `rowToRecipe()` in `db.ts`:** die einzige JSON↔Spalten-Abbildung; `complete_job` füttert das Ergebnis via `jsonb_populate_record`, statt die Abbildung in SQL zu duplizieren.
  - **`assertRecipeAccess()` in `routes.ts`:** prüft Kochbuch-Zugehörigkeit statt Autorschaft — die eine Stelle, an der später ein `visibility === 'public'`-Check hinzukommt.
  - **API:** rezeptbezogene Endpunkte unter `/api/recipes/:recipeId/*`; `GET /api/jobs/:id` bleibt reiner Polling-Kanal und liefert `recipeId`; `POST /api/jobs/:id/cancel` und `DELETE /api/recipes/:id` trennen Abbrechen von Löschen.
  - **Zwei getrennte Quoten:** Kochbuch-Cap zählt `user_recipes` (schrumpft beim Löschen), Rate-Limit zählt `jobs` (schrumpft nie) und schließt Remixes über `kind <> 'remix'` aus — Foto-Importe kosten weiterhin Quota.
  - **Migration:** `backend/db/migrations/001_split_jobs_recipes.sql` (einmalig, nicht idempotent) + `001_verify.sql`. Die alte Job-UUID wird zur neuen `recipes.id`, wodurch die abhängigen Tabellen mit einem blanken Cast umhängen und bestehende Cover-Pfade weiter passen.
* **Betroffene Dateien:** `backend/db/schema.sql`, `backend/db/migrations/*`, `backend/src/types.ts`, `backend/src/db.ts`, `backend/src/queue.ts`, `backend/src/routes.ts`, `backend/src/index.ts`, `backend/src/gamification.ts`, `backend/src/gemini.ts`, `backend/src/notifications/*`, `backend/src/scripts/*`, `shared/src/types.ts`, `shared/src/recommendations.ts`, `frontend/src/types.ts`, `frontend/src/App.tsx`, `frontend/src/hooks/*`, `frontend/src/context/*`, `frontend/src/components/*`.

---

### 2026-08-20: Synthetischer `parentIngredient`-Fallback in `ingredientTaxonomy.ts` & isolierte GroupKeys entfernt

* **Ersetzter Code / Anti-Pattern:**
  - Synthetische `parentIngredient`-Objekterzeugung für *jede* Zutat (`{ name: displayName, baseName: normalized }`), wodurch Primärartikel (z. B. `Ei`, `Eier`, `Zwiebel`, `Butter`) fälschlich als abgeleitete Derivate behandelt wurden.
  - Dadurch wurde der universelle englische `baseName` (`egg`, `onion`) in `useShoppingList.ts` durch den sprachspezifischen rohen String (`"eier"` vs. `"ei"`) überschrieben, was zur Trennung von Singular- und Pluralformen (z. B. 6 Stück Eier + 1 Stück Ei als 2 separate Zeilen) auf der Einkaufsliste führte.
* **Ersetzt durch:**
  - **Echtes 3-Stufen-Parent-Modell (`ingredientTaxonomy.ts`):** `getParentIngredient` liefert `ParentIngredientInfo` **nur** für echte Derivate/Teilprodukte (`Eigelb/Eiweiß ➔ Ei`, `Zitronenabrieb/Zitronensaft ➔ Zitrone`, `Knoblauchzehe ➔ Knoblauch`). Für Primärlebensmittel wird strikt `null` zurückgegeben.
  - **Deterministischer Universal-BaseKey (`normalizeFoodBaseKey` & `toEnglishSingular`):** Nutzt kanonische englische Singular-Nomen (`egg`, `onion`, `tomato`) für AI-Zutaten und deutsche Food-Mappings für manuelle Eingaben.
  - **Smarte dynamische Pluralisierung (`getIngredientDisplayName`):** Automatische Anpassung von Zählartikeln (1 Stück `Ei` ➔ 7 Stück `Eier`, 1 Stück `Zwiebel` ➔ 3 Stück `Zwiebeln`) bei unverändert präziser Bezeichnung für Mengenangaben (`Mozzarella`, `Gouda`, `Frischkäse`).
  - **Einheiten-Normalisierung (`normalizeUnit`):** Standardisierung von Varianten (`Stück`, `stk`, `stk.`, `pcs`, `""` ➔ `Stück`).
* **Betroffene Dateien:** `frontend/src/utils/ingredientTaxonomy.ts`, `frontend/src/hooks/useShoppingList.ts`, `frontend/src/utils/__tests__/ingredientTaxonomy.test.ts`.

---

### 2026-08-20: `recipe.geminiUsage` aus Recipe JSON entfernt & durch dedizierte `jobs.llm_usage` JSONB-Spalte ersetzt

* **Ersetzter Code / Anti-Pattern:**
  - `recipe.geminiUsage = { tokenUsage, costEstimate, durationMs, model }` direkt im `Recipe`-Objekt bzw. in der `jobs.recipe` Datenbankspalte (`backend/src/gemini.ts`, `backend/src/types.ts`).
  - Vermischung von fachlichen Rezeptdaten (Titel, Zutaten, Schritte) mit rein infrastrukturellen Modell-/Kosten-Metadaten im selben JSONB-Dokument.
* **Ersetzt durch:**
  - **Sauberes Rezeptmodell (`Recipe`):** Enthält ausschließlich fachliche Rezept-Attribute.
  - **Dedizierte `jobs.llm_usage` JSONB-Spalte (`backend/src/db.ts` & `backend/src/types.ts`):** Speichert getrennte Usage-Objekte für `gemini` (Tokens, Input/Output-Kosten, Dauer, Modell) und `flux` (FLUX.1 [schnell] 4-Step Cover Inferenz-Kosten $0.0035, Dauer, Modell).
  - **Migration (`backend/src/scripts/migrateLlmUsage.ts`):** Extrahiert rückwirkend `geminiUsage` aus bestehenden Jobs nach `llm_usage.gemini`, ergänzt `llm_usage.flux` bei AI-Covers und entfernt `geminiUsage` aus `recipe`.
* **Betroffene Dateien:** `backend/src/types.ts`, `frontend/src/types.ts`, `backend/src/gemini.ts`, `backend/src/imageGenerator.ts`, `backend/src/queue.ts`, `backend/src/routes.ts`, `backend/src/db.ts`, `backend/db/schema.sql`, `backend/supabase_schema.sql`, `backend/src/scripts/migrateLlmUsage.ts`.

---

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
