# 🎨 Frontend-Layer (React 19 & HeroUI v3)

## 1. Stack & Modul-Struktur

* **Technologie:** React 19, Vite, TypeScript, HeroUI v3 (React Aria-basiert), Tailwind CSS v4. Als native Android-App über **Capacitor** gebaut und im **Google Play Store** ausgeliefert.
* **Shared Workspace (`@cookbook/shared`):** Plattformunabhängige Logik (Saisons, Feiertags-Kalender, Daypart-Heuristiken, Contextual Recommendation Engine) wird als npm-Workspace zwischen Frontend und weiteren Modulen geteilt.
* **App-Shell (`App.tsx`):**
  * Modular gestaltet, delegiert komplexe Zustände an Custom Hooks.
  * Zeigt ein Auth-Gate (`AuthForm`) bei fehlender Session.
  * **Startup-Gate (nur Auth, nicht Sync):** Der blockierende Vollbild-Spinner hängt **nur an `authLoading`**, nicht mehr an `initialSyncDone`. Der Splash wird ausgeblendet, sobald Auth aufgelöst ist, und die App rendert sofort — der initiale `fetchLimitStatus()`-Netzwerkcall läuft im Hintergrund weiter. Vorher blockierte `!initialSyncDone` die ganze App bis der Call zurückkam (Splash → Spinner, beide je einige Sekunden). `limitStatus` ist überall nullable (die Kontingent-Zeile erscheint einfach nach, sobald die Daten da sind), daher ist das gefahrlos.
  * **`--app-sticky-top` (Sticky-Offset):** Die Sticky-Kopfregion (Safe-Area-Filler + `TimerBanner`) misst ihre Höhe per `ResizeObserver` und schreibt die Höhe als globale CSS-Variable `--app-sticky-top` auf `document.documentElement`. Views nutzen `sticky top-[var(--app-sticky-top)]`.
  * **`RecipeDetails` Single-Page Scroll-Layout & `RecipeStickyBar`**: Rezept-Detailansicht als einzelne, fließende Scroll-Seite ohne Tabs (Details `RecipeInfoSection`, Zutaten `RecipeIngredients`, Zubereitung `RecipeInstructions`). `RecipeStickyBar` heftet sich an `top-[var(--app-sticky-top)]` und markiert dynamisch per Scroll-Spy die gerade sichtbare Sektion. Kategorie-Überschriften in den Zutaten verwenden harmonische vertikale Farb-Pills (`w-1 h-3.5 rounded-full`, passend zur Taxonomie aus `i18n.ts`).
  * **Basis-Portionen anpassen (`AdjustServingsSheet.tsx`)**: Klick auf die Portionen-Zeile in `RecipeInfoSection` (gekennzeichnet durch Chevron-Right Icon) öffnet das `AdjustServingsSheet`. Erlaubt das Umverteilen der Basis-Portionen mit mathematisch exakter Live-Neuberechnung aller Nährwerte pro Portion (Kalorien & Makros) und persistiert die Änderungen atomar in Supabase (`PATCH /api/recipes/:id`).

### Zentralisierte Kontexte (`frontend/src/context/`)
* **`AuthContext.tsx`:** Verwaltet Supabase Auth Session (`signIn`, `signUp`, `signInWithGoogle`, `signOut`, `getAccessToken`, `isPremium`).
* **`DialogContext.tsx`:** Stellt globalen Dialog-Service (`useDialog()`) bereit, um native Browser-Dialoge durch moderne HeroUI-Dialoge zu ersetzen.
* **`ToastContext.tsx`:** Globales Toast-Benachrichtigungssystem (`useToast()`), das rahmenlose Benachrichtigungen im Clean Flat Style elastisch von oben hineingleiten lässt (`top-toast` via `ToastContainer` & `ToastItem`), Safe Areas (`--safe-area-inset-top`) beachtet und Swipe-Up Gesten unterstützt.
* **`I18nContext.tsx`:** Verwaltet Internationalisierung (Deutsch/Englisch) mit `localStorage`-Persistenz und Browsersprachen-Erkennung.
* **`OverlayStackContext.tsx`:** Globaler Ref-Counted Overlay-Stack (`pushOverlay`, `popOverlay`, `isAnyOverlayOpen`) und Convenience-Hook `useModalOverlay(isOpen)` (Alias: `useAdOverlay`). Blendet das native AdMob-Banner synchron aus und lockt via `useBodyScrollLock` den Body/HTML-Scroll (mit Scroll-Positions-Preservation), sobald ein beliebiges Modal, Sheet oder Drawer geöffnet wird, und stellt beides nach dem Schließen des letzten Overlays wieder her.

### Lokalisierung & Error-Code System
* **Lokalisierung (`frontend/src/i18n.ts`):** Übersetzungen für Supermarktabteilungen, Emojis, Sortierung, UI-Texte, Auth und dynamische Recommendation-Themen.
* **Error-Code-System (`frontend/src/errorCodes.ts` ↔ `backend/src/errors.ts`):**
  * Das Backend liefert maschinenlesbare Codes (`AppErrorCode` + `AppError`-Klasse mit `code`, `params`, `httpStatus`).
  * Asynchrone Fehler werden als JSON-Envelope `{"code","params"}` in `jobs.error` persistiert.
  * `frontend/src/errorCodes.ts` ist eine meldungsfreie Registry (`AppErrorCode`, `ALL_ERROR_CODES`, `isKnownErrorCode`, `parseSerializedError`).
  * Lokalisierte DE/EN-Texte leben in `uiTranslations` unter `error.codes.<CODE>`. `messageForCode(code, params, lang)` löst dynamische Variablen auf.
  * Legacy-Fallback `translateApiError` sichert die Kompatibilität für ungecodete Alt-Meldungen.

---

## 2. 📚 3-Ebenen-Katalog (SavedCatalog)

Der Rezept-Katalog ist als **Kochbuch mit drei Ebenen** aufgebaut:
1. **Kochbuch-Home (`#/history`, `CookbookHome.tsx`):** Redaktioneller, inspirierender **Culinary Magazine Feed**. Bricht mit repetitiven Rastern durch harmonische, redaktionelle Formate:
   * **Persönlicher Header & Story-Highlights:** Kontextuelle Begrüßung (`CookbookGreetingHeader.tsx`) + 100% kreisrunde Instagram-Highlights (`CollectionStoryHub.tsx`, 64×64px, Kontrastring) mit direktem `[📚 Alle Rezepte]`-Shortcut, Favoriten, Kategorien und User-Sammlungen.
   * **Format A (Hero Carousel, `RecipeHeroCarousel.tsx`):** 3-Slide Karussell (Tages-Highlight, Vital-Star mit Health Score ≥70, frische Community-Inspiration) im 4:3-Magazinformat mit dezentem Scrim, Health-Score-Badge, Nährstoffzeile und Save-CTA.
   * **Format B (Bento-Grid, `RecipeBentoSection.tsx`):** 3:4 Portrait-Highlight links + 2 gestapelte Kompakt-Karten (`RecipeCompactCard.tsx`) rechts für schnelle Gerichte (≤ 25 Min.).
   * **Format C (Wiederentdeckte Schätze, `RecipeShowcaseCard.tsx`):** Horizontaler Banner für ältere (≥ 14 Tage), unprobierte Rezept-Perlen mit Datumsstempel und Zutaten-Teaser.
   * **Format D (Alle deine Rezepte, `AllRecipesShelf.tsx`):** Horizontales Regal der unveränderten `RecipePosterCard`s mit prominentem Vollkatalog-Button (`Alle N Rezepte durchsuchen & filtern`).
   * **Kuratorischer Hook (`useCookbookMagazine.ts`):** Berechnet die redaktionellen Slots deterministisch und strikt ohne sprachabhängige String-Heuristiken.
2. **Listen-Ebene (`#/history/list...`, `SavedCatalog/index.tsx`):** Vollständige, filter-/sortierbare Liste mit `CatalogFilters.tsx` als Sticky-Header, `FilterSheet` (inklusive Healthy-Score-Sortierung) und wahlweise 2-Spalten-Poster-Grid (`viewMode: 'card'`) oder dichten Zeilen (`viewMode: 'compact'`). Nur hier existieren Multi-Select und `BulkActionBar`.
3. **Detailansicht (`#/history/<jobId>`):** `RecipeDetails`.

### Katalog-Features
* **Routing (`SavedCatalog/catalogRoutes.ts`):** `subPath` unterscheidet zwischen List-Routen (`list...`) und `jobId`s (UUIDs), inklusive Preset-Routen für Kategorien (`#/history/list/category/<category>`).
* **Kombinierbare Filter (`FilterSheet.tsx` + `useSavedCatalog.ts`):** Facetten-Objekt `CatalogFilterState` (`favoritesOnly`, `maxTime`, `categories[]`, `collectionIds[]`, `flags[]`). Semantik: OR innerhalb einer Facette, AND zwischen Facetten.
* **Rezept-Kategorien (Speisenart):** Feste Taxonomie (`RecipeCategory`) mit Emojis und Lokalisierung in `i18n.ts`, filterbar im `FilterSheet`, als aktive Chips in `CatalogFilters` entfernbar und als Badge in `RecipeHeader` dargestellt.
* **Hinweiskarte für unvollständige Quellen (`IncompleteSourceCard.tsx`):** Zeigt im Clean Flat Style oberhalb der Details einen unaufdringlichen, barrierefreien Hinweis (*„Im Originalbeitrag fehlten vollständige Rezeptangaben...“*), falls `recipe.hasIncompleteSourceInfo === true`.
* **Zuletzt geöffnet (`utils/recentRecipes.ts`):** Clientseitiges Recency-Tracking in `localStorage` (`recipe_recent_opened`).
* **Sammlungen (`useCollections.ts`, `CollectionSheet.tsx`):** Benannte Rezept-Gruppen mit 2×2 Mosaik-Cover.
* **Freitext-Labels/Flags (`FlagSheet.tsx`):** Eigene Tags pro Rezept (`job.flags`).

---

## 3. 🖼️ Clientseitiges Image-Caching

* **100% Client-seitig:** Keine Bilddaten werden auf dem Server oder Supabase gespeichert. Original-URLs verbleiben als Metadaten im Rezept-JSON.
* **IndexedDB Store (`frontend/src/utils/imageStore.ts`):** Datenbank `recipe-image-cache` v1, Object Store `images`.
* **Kompression (`useCachedImage.ts`):** HTML5 Canvas `drawImage()` + `toBlob('image/jpeg', 0.75)` mit max. 400px Kantenlänge (~15–40 KB pro Bild).
* **CORS Proxy:** Bilder werden über den `/api/image`-Proxy geladen.
* **Cache-Invalidierung:** Bei Rezept-Löschung werden IndexedDB-Einträge automatisch entfernt.

---

## 4. ⏱️ In-App Koch-Timer (`TimerContext`)

* **Interaktive Badges:** Zeit-Angaben in Zubereitungsschritten sind klickbar (blau unterstrichen).
* **Confirm-Sheet (`TimerConfirmSheet.tsx`):** Schieberegler zur Feineinstellung (±50% der Originalzeit) & Start-Button.
* **Globaler Zustand (`TimerContext.tsx`):** Parallele Countdown-Timer, 500ms Intervall, überleben Tab-Navigation.
* **Alarm:** 3× Beep-Ton via Web Audio API (880 Hz) + Vibration + Native Notification Push (`TIMER_NOTIFICATION_ID = 1`).
* **Timer-Banner (`TimerBanner.tsx`):** Sticky unter App-Header. Zeigt Countdown & Fortschrittsbalken. Klick navigiert automatisch zum Herkunftsrezept & Schritt.
* **Rezept-Fertig-Benachrichtigungen (`native.ts`):** Lokale Benachrichtigung (`RECIPE_READY_NOTIFICATION_ID = 2`, Channel `recipe-extractions`) feuert nur dann, wenn die App im Hintergrund ist (`isAppInBackground()`). Bestehende Rezept-Bereit-Notifications werden vor dem Senden abgeräumt (`clearRecipeReadyNotification()`) bzw. überschrieben, sodass immer maximal eine Benachrichtigung dieses Typs im System-Tray verbleibt. Beim Öffnen/Resumen der App wird die Benachrichtigung automatisch geleert.

---

## 5. 📅 Wochenplaner (`MealPlanner/` & `useMealPlanner.ts`)

* **Übersicht (`/#/meal-planner`):** Nav-Tab in der `AppBottomNav` mit interaktivem 7-Tage-Slider (Mo–So), Wochen-Navigation (Vor/Zurück/Heute) und flexibler, dynamischer Tagesliste geplanter Gerichte ohne starre Mahlzeiten-Kategorien.
* **Deep Integration:**
  * **Rezeptansicht (`AddToMealPlanSheet.tsx`):** Direkter "Planen"-Button im `RecipeActionDock` mit 1-Klick-Tagesauswahl und dynamischem Portions-Stepper.
  * **Einkaufslisten-Batch-Sync:** Button "Woche einkaufen" skaliert alle Zutaten der geplanten Gerichte anhand der eingestellten Portionen und aggregiert sie in die smarte Einkaufsliste.
  * **Interaktive Karten (`MealPlanCard.tsx`):** Schnelle Portionsanpassung per Stepper, Direktstart in den Kochmodus (`CookingMode`) und Gekocht-Status-Toggle.
  * **Event-Synchronisation mit Kochmodus:** `useMealPlanner` und `useMealPlanBadge` hören auf `app:recipe-cooked` und `meal-plans-updated`, um bei Abschluss eines Rezepts im Kochmodus oder Recipe Details den Status im Wochenplaner sowie den Tab-Badge sofort in Echtzeit zu aktualisieren.
* **Modularisierung:** Strikte Aufteilung in `useMealPlanner.ts`, `mealPlannerUtils.ts`, `MealPlannerHeader.tsx`, `WeekDayPicker.tsx`, `DayMealSlots.tsx`, `EmptyDayState.tsx`, `MealPlanCard.tsx`, `RecipePickerModal.tsx` und `AddToMealPlanSheet.tsx` (< 150–200 Zeilen pro Komponente).

---

## 6. 🛒 Smarte Einkaufsliste & Zutat-Taxonomie (`useShoppingList.ts` & `ingredientTaxonomy.ts`)

* **Generische Rohstoff-Konsolidierung & Universelle BaseKeys (`ingredientTaxonomy.ts`):**
  * Rezepte behalten ihre präzisen Zubereitungszutaten (z. B. *2 Eigelb*, *6 Stück Eier verquirlt*, *1 TL Zitronenabrieb*, *3 Knoblauchzehen*).
  * **100 % Sprachunabhängige Taxonomie-Engine (`ingredientTaxonomy.ts`):** Kommt vollständig ohne hardcodierte Übersetzungstabellen aus (~30 Zeilen). Nutzt das Gemini-Schema-Vertragsmodell (`baseName` in englischem Singular und `parentIngredient` bei Teilzutaten).
  * **Deterministischer Universal-BaseKey (`normalizeFoodBaseKey` & `toEnglishSingular`):** Normalisiert den BaseKey (`item.parentIngredient?.baseName || item.baseName || item.name`) sprachunabhängig mit einem schlanken, sicheren englischen Singularizer (`eggs` / `uova` / `œufs` ➔ `egg`, `onions` / `cipolle` ➔ `onion`).
  * **Einheiten-Normalisierung (`normalizeUnit`):** Standardisiert Schreibweisen (`Stück`, `stk`, `stk.`, `pcs`, `""` ➔ `Stück`).
  * **Aggregations-Logik (`useShoppingList.ts`):** Fasst Zutaten desselben Rohstoffs und kompatibler Einheit auf der Einkaufsliste zusammen (z. B. 6 Stück Eier [verquirlt] + 1 Stück Ei = **7 Stück Eier** [Notiz: 6 Stück verquirlt]).
* **Sub-Item Breakdown UI & Smart Deduplication (`ShoppingListItem.tsx`):**
  * Blendet unter der aggregierten Hauptzeile die Zusammensetzung transparent ein.
  * **Smart Deduplication**: Entfernt doppelte Mengen (z. B. `2 Stück`) und Hauptzutatennamen in Klammern (z. B. `[2 Stück] Französisches Baguette (klein)` statt redundanter Doppelnennung).
  * Zeilenumbrüche (`break-words`) verhindern harte Wortkürzungen (`truncate`).
* **Supermarkt-Supergruppen, Kategorie-Farb-Pills & Einklappbare Erledigt-Liste (`ShoppingListGroup.tsx` & `ShoppingCheckedDrawer.tsx`):**
  * Sortierung nach echter Markt-Reihenfolge (Obst & Gemüse ➔ Brot ➔ Konserven etc.).
  * **Kategorie-Farb-Pills (`getCategoryTheme` in `i18n.ts`)**: Statt unruhiger Emojis sitzt über jeder Kategorie-Überschrift ein schmaler, langgezogener abgerundeter Farb-Balken (`w-8 h-1 rounded-full`) mit einer harmonisch abgestimmten Farbe pro Abteilung (z. B. Smaragdgrün für Obst & Gemüse, Bernstein für Brot & Backwaren, Rosé für Fleisch & Geflügel, etc.).
  * **Erledigt-Accordion**: Abgehakte Artikel wohnen in einem standardmäßig eingeklappten Accordion (`Erledigt (X)`), um kognitive Unruhe im Laden zu minimieren.
  * **Expliziter Gruppen-Check**: Die "Ganzes Regal abhaken"-Aktion ist als separater `CheckCheck`-Button abgetrennt, um versehentliches Abhaken beim Antippen von Kategorienamen zu verhindern.
* **Rezept-Kacheln & Kontext-Karussell (`ShoppingRecipeCarousel.tsx` & `ShoppingRecipeCard.tsx`):**
  * Zeigt am oberen Bildschirmrand (unter der Toolbar) alle Gerichte, deren Zutaten aktuell auf der Einkaufsliste stehen.
  * **Kompakte Kacheln:** 16:10 Split/Cover-Bild (`CachedImage`), Rezepttitel, Zutaten-Zähler (`checked/total`), dezenter Mini-Fortschrittsbalken und `✓ Alle im Korb`-Badge bei vollständigem Einkauf.
  * **1-Tap-Sprung:** Antippen navigiert direkt zum entsprechenden Rezept im Kochbuch (`#/history/<jobId>`).
  * **Rezept entfernen:** Über das `X`-Icon können alle Zutaten eines Rezepts mit einem Klick nach Sicherheitsabfrage von der Liste gelöscht werden.
* **Add-Formular (`CustomItemForm.tsx`):** Sanftes Einblenden mit automatischem Eingabefokus (`autoFocus`) und Schließen-Option (`X`).

---

## 6. 💎 Freemium Gating System

* **Tiers:** Free, Alpha, Premium (`user.app_metadata.tier`).
* **Gating-Punkte:**
  * **Free:** 3 Extraktionen/Tag, max. 5 gespeicherte Rezepte, max. 1 Rezept auf Einkaufsliste, Nährwerte geblurt, Timer/Kochmodus/Copilot/Sammlungen/Labels gesperrt.
  * **Alpha:** 10 Extraktionen/Tag, max. 20 gespeicherte Rezepte, alle Features freigeschaltet.
  * **Premium:** 50 Extraktionen/Tag, unbegrenztes Kochbuch, alle Features freigeschaltet.
* **Gating-Komponenten:** `PremiumModal.tsx` (Upsell-Dialog), `PremiumHint.tsx` (Goldene Crown auf Emerald-Fläche), `PremiumCrownBadge.tsx` (Crown-Marker auf Gated Buttons), `PremiumUpgradeCard.tsx` (Werbekarte).

---

## 7. 🐛 In-App Feedback & Bug-Reports

* **Accessibility:** Erreichbar über SettingsView ("Hilfe" -> `FeedbackDrawer.tsx`).
* **`FeedbackDrawer.tsx`:** Bug/Idee-Toggle, Textarea (max. 4000 Zeichen), Multi-Screenshot-Anhang (max. 6 Bilder).
* **Kontext-Erfassung (`feedbackContext.ts`):** Hängt App-Version, Plattform, UserAgent, Route, UserId, Tier und Konsolen-Logs an.
* **Console-Ring-Buffer (`consoleBuffer.ts`):** Hält die letzten ~50 Konsolen-Einträge im Speicher.
* **Backend (`POST /api/feedback`):** Lädt Screenshots in privaten Supabase Bucket `feedback-screenshots` (10-Jahres Signed URLs) und speichert Report in `feedback`-Tabelle.

---

## 8. 📢 AdMob Monetarisierung & Native Ad-Steuerung (`frontend/src/utils/ads.ts`)

Das Werbesystem ist nativ über `@capacitor-community/admob` angebunden und wird für Free-User ausgespielt. Auf Non-Native/Web fungieren alle Aufrufe als sichere No-Ops bzw. simulieren Video-Delays im Dev-Modus.

### Banner-Formate & Platzierung
* **Extraktions-Fortschrittsbanner (`MEDIUM_RECTANGLE` / MREC 300×250):** Wird in `ExtractForm.tsx` / `ExtractionAnimation.tsx` unterhalb des Fortschritts-Skeletts eingeblendet, während Gemini das Rezept analysiert.

> **Hinweis:** Das frühere **Bottom-Dock Banner (`BANNER` 320×50)** oberhalb der Bottom-Navigation wurde entfernt (zu aufdringlich, zu viel Platzverlust). Der native Banner-Kanal wird jetzt ausschließlich vom Extraktions-MREC genutzt.

### App-Open Ad (Full-Screen Interstitial beim Start)
* **Format:** Da `@capacitor-community/admob` v8 kein dediziertes App-Open-Format hat, wird der „Fullscreen-Banner nach dem Starten" als **Interstitial** (`prepareInterstitial` / `showInterstitial`) umgesetzt (`maybeShowAppOpenAd()` in `ads.ts`).
* **Trigger (Cold Start + Resume):** Der Cold-Start-Versuch wird in `App.tsx` genau **einmal pro App-Session** beim ersten „ready"-Zeitpunkt (nach Onboarding) *verbraucht*, ~1,2 s nach App-Bereitschaft, damit der Splash/First-Paint nicht überdeckt wird. Zusätzlich gilt ein **Resume als weiterer „Open"**, wenn die App zuvor **≥ `APP_OPEN_RESUME_MIN_BG_MS` (4 h)** im Hintergrund war (`registerAppStateListener` misst die Hintergrundzeit) — so sehen auch Geräte, die die App tagelang im Hintergrund halten, gelegentlich eine App-Open-Ad. Kurzes App-Switching qualifiziert nie. Nur für Free-User. Beide Auslöser teilen sich denselben Zähler + Zeit-Floor (s. u.), doppeln sich also nie.
* **Kein Deferral nach Extraktion (Crash-Fix):** Der Haupt-Flow ist das Teilen eines Reels — die App startet dann direkt in eine Extraktion. Der One-Shot wird trotzdem sofort verbraucht; ist der Landescreen nicht neutral (`isPending`, offenes `recipe`, Premium), wird die Ad für die Session **komplett übersprungen** statt auf das Extraktionsende verschoben. Ein `appOpenBlockedRef` wird zusätzlich beim Feuern des Timers erneut geprüft (falls während der 1,2 s eine Extraktion startet). So kann das Interstitial nie in den MREC-Banner-Teardown + Recipe-View-Übergang hineinfeuern (das crashte die App).
* **Banner-Concurrency-Guard:** `maybeShowAppOpenAd()` bricht ab, solange ein Banner aktiv ist (`bannerShown || isBannerCurrentlyHidden`) — ein Vollbild-Interstitial wird nie gleichzeitig mit einem (auch nur in Teardown befindlichen) Banner gezeigt.
* **First-Launch-Ausschluss:** Beim allerersten Eligibility-Zeitpunkt wird nur ein `localStorage`-Flag (`snagbite:appOpenAd:firstLaunchSeen`) gesetzt und die Ad übersprungen — Neu-User werden nie sofort mit einem Vollbild-Ad begrüßt.
* **Hybrid-Cap (Count + Zeit-Floor):** Ein **gemeinsamer Zähler** über alle förderfähigen „Opens" (Cold Starts *und* qualifizierende Resumes). Die Ad feuert nur, wenn **beides** zutrifft: es ist der `APP_OPEN_SHOW_EVERY_N_OPENS`-te (aktuell **jede 3.**) Open **und** seit der letzten Ad sind **≥ `APP_OPEN_MIN_INTERVAL_MS` (4 h)** vergangen. Persistiert über `snagbite:appOpenAd:openCount` (Zähler) und `snagbite:appOpenAd:lastShownAt` (Zeit-Floor). Der Zähler wird bereits beim Versuch hochgezählt und bleibt **„scharf" (≥ N)**, solange der Zeit-Floor blockt; bei Anzeige wird er auf 0 zurückgesetzt und der Zeitstempel gesetzt (deckt auch No-Fills ab, verhindert doppeltes Feuern bei schnellem Relaunch).
* **Preloading (instant show):** `prepareInterstitial` ist ein Netzwerk-Fill-Request (1–3 s). Inline zur Show-Zeit ausgeführt, erschiene die Ad erst Sekunden nach dem Trigger. Deshalb wird sie **vorgeladen**: `preloadAppOpenAd()` in `ads.ts` bereitet die Ad vorab auf, `maybeShowAppOpenAd()` zeigt dann eine bereits geladene Ad sofort (Fallback: inline `prepareInterstitial`, falls kein warmer Preload da ist). `App.tsx` startet den Preload direkt beim Trigger — aber nur wenn `appOpenAdWouldShow()` (read-only Spiegel der Cadence-Gates) `true` liefert, damit keine Fill-Requests auf den ~2/3 übersprungenen Opens verbrannt werden. Der Preload überlappt die 1,2 s-Verzögerung, sodass die Ad beim Feuern schon bereitsteht. Vorgeladene Interstitials laufen ~1 h ab → `INTERSTITIAL_TTL_MS` (55 min) markiert sie vorher als stale.
* **Test-Overrides (Timing):** `APP_OPEN_MIN_INTERVAL_MS` (Zeit-Floor) und `APP_OPEN_RESUME_MIN_BG_MS` (Resume-Schwelle) liegen in `src/env.ts` und defaulten auf **4 h**. Für On-Device-Tests ohne Code-Änderung per `.env.development.local` überschreibbar (`VITE_APP_OPEN_MIN_INTERVAL_MS` / `VITE_APP_OPEN_RESUME_MIN_BG_MS`, z. B. `5000` für 5 s).
* **Produktions-Guard:** Ohne konfigurierte `VITE_ADMOB_INTERSTITIAL_ID` bleibt die App-Open-Ad im Prod-Build **deaktiviert** (kein Test-Interstitial für echte User). In Test-/Dev-Builds wird automatisch Googles Test-Interstitial genutzt.

### Dynamische Layout-Messung (`ExtractionAdCard.tsx`)
* Da AdMob-Banner als native OS-Views über der Capacitor WebView gerendert werden, berechnet `ExtractionAdCard` per `getBoundingClientRect()` dynamisch den exakten Abstand (`bottomMargin`) zum Viewport-Boden.
* Berücksichtigt DPR, Orientation-Changes, Resize-Events und wartet 350ms auf das Einschwingen von CSS-Transitionen (`translate-y` Slide-Up).
* Verhindert Layout-Flicker durch Status-Listener (`pending` ➔ Spinner, `loaded` ➔ Ad einblenden, `failed` ➔ Container kollabieren).

### Rewarded Video Ads (+1 Extraktions-Credit)
* **Trigger:** Wenn ein Free-User sein tägliches Extraktionslimit erreicht (`remaining === 0`), wandelt sich der Primär-Button in `ExtractForm.tsx` in *"Video ansehen (+1 Rezept-Extraktion)"*.
* **Ablauf (`showRewardedAd()`):**
  1. Bereitet das AdMob Rewarded Video Ad vor (`prepareRewardVideoAd`) und zeigt es an (`showRewardVideoAd`).
  2. Lauscht auf `RewardAdPluginEvents.Rewarded` und `Dismissed`.
  3. Nach erfolgreichem Reward ruft der Client `claimRewardedCredit()` auf (`POST /api/me/rewarded-ad-claimed`).
  4. Backend erhöht `app_metadata.bonus_credits` in Supabase Auth um `+1`.
  5. Die Rezept-Extraktion wird direkt und ohne weiteren Benutzerklick gestartet.
* **Web-Dev-Simulation:** Im Browser-Entwicklungsmodus wird eine 2-Sekunden-Verzögerung simuliert und `true` zurückgegeben.

### Overlay-Stack & Z-Index-Konflikt-Schutz (`OverlayStackContext.tsx`)
* **Problem:** Native Android AdViews schweben systembedingt über jedem Web-DOM-Inhalt und würden HeroUI-Dialoge, Bottom-Sheets und Menüs überdecken. Zudem führt Touch-Scrolling auf mobilen Geräten im Hintergrund zu unruhigem Scroll-Verhalten (Background Scrolling / Touch Bleed-through).
* **Lösung:** Globaler ref-counted Stack. Jeder geöffnete Overlay-Dialog (z. B. `PremiumModal`, `FeedbackDrawer`, `CollectionSheet`, `FilterSheet`, `FlagSheet`, `TimerConfirmSheet`, `DialogContext`, `PublicRecipePreviewModal`) ruft `useModalOverlay(isOpen)` auf.
* **Verhalten:**
  * Stack-Tiefe `0 ➔ 1`: Ruft `hideAdBanner()` auf und aktiviert `useBodyScrollLock` (`document.documentElement` + `body` fixiert, `scrollY` gemerkt).
  * Stack-Tiefe `1 ➔ 0`: Ruft `resumeAdBanner()` auf und stellt die exakte Scroll-Position via `window.scrollTo(0, scrollY)` wieder her.
  * Sofortige Pointerdown-Interzeption vor Abschluss von Klickanimationen.

### Stale Impression & Resume Delay Logik
* **`STALE_HIDE_MS` (60s):** Bleibt das Banner länger als 60 Sekunden versteckt (z. B. langes Lesen eines Rezepts), wird es zerstört. Beim nächsten Einblenden wird ein frischer Ad-Request abgesetzt (neue bezahlte Impression statt alter Standbild-Banner).
* **`RESUME_DELAY_MS` (500ms):** Das Wiedereinblenden nach Schließen von Overlays wird verzögert, bis die CSS-Slide-Up-Animation der Bottom-Bar vollständig abgeschlossen ist.

### DSGVO / UMP Consent Flow & Plugin-Patch
* **Google UMP SDK:** In `initAds()` wird vor dem ersten Ad-Request `AdMob.requestConsentInfo()` und bei Bedarf `AdMob.showConsentForm()` ausgeführt. Bei Ablehnung oder fehlendem Consent wird `npa: true` (Non-Personalized Ads) angefordert.
* **Patched Plugin:** `@capacitor-community/admob` v8.0.0 wurde via `patch-package` angepasst, um echte Java-seitige `hideBanner()` / `resumeBanner()` Methoden auf dem Android UI-Thread ohne Deadlocks und Neuladen bereitzustellen.

---

## 5. 🥫 Vorratslager & Smarte Einkaufsliste (`Pantry/`, `ShoppingList/` & `PantryContext.tsx`)

* **Segmented Navigation:** Die Ansicht `/shopping-list` teilt sich über ein barrierefreies Segmented Control in zwei Tabs:
  1. **Einkaufsliste:** Strukturierte Supermarkt-Regalsortierung, automatisches Bündeln von Zutaten, Streich-Animationen und die Gruppe **„Schon im Vorrat (Bitte prüfen)"** für Zutaten, die laut Vorrat noch vorhanden sind.
  2. **Vorrat:** Benutzer-Vorratsverwaltung mit Ablauf-Warnstufen (Grün, Gelb für $\le 3$ Tage, Rot für abgelaufen), Schnellfiltern nach Supermarktkategorie und manuellem Hinzufügen/Bearbeiten (`PantryAddModal`).
* **Automatischer Vorratstransfer:** Beim Abhaken von Artikeln auf der Einkaufsliste werden diese automatisch in den Vorrat des Benutzers übertragen (`autoAddToPantry = true`), inklusive typischer Packungsgrößen und Haltbarkeitsdauern.
* **Anti-Food-Waste Empfehlungen (`PantrySuggestionsModal`):**
  * Findet Rezepte aus dem eigenen Kochbuch oder öffentlichen Community-Rezepten, die bald ablaufende Vorratszutaten verwerten.
  * Zeigt visuelle Indikatoren für ablaufende Zutaten (`🔥 2 laufen bald ab!`), Trefferanzahl und fehlende Zutaten.
  * Erlaubt sofortiges Kochen mit automatischem Vorratsabzug.
* **Wochenplaner-Filter („Vorrat verwerten"):** Im Rezept-Picker des Wochenplaners (`RecipePickerModal.tsx`) sortiert der Filter-Chip *„Vorrat"* alle Rezepte nach dem Deckungsgrad mit dem aktuellen Vorratsbestand.
* **Vorratsabgleich im Einkaufs-Bestätigungssheet (`ShoppingConfirmSheet.tsx` & `ShoppingConfirmItem.tsx`):**
  * Beim Hinzufügen von Zutaten aus einem Rezept oder im Batch-Modus aus dem Wochenplaner gleicht `findPantryStock(ingredient, pantryItems)` jede Zutat live mit dem echten Vorratsspeicher ab.
  * Zeigt drei klare Zustände: Vorhandene Vorratsartikel (mit `<Package />`-Badge, z. B. `200 g im Vorrat`, vorausgewählt abgewählt), statische Grundzutaten/Staples (neutrales `VORRAT`-Badge, abgewählt) und zu kaufende Zutaten (vorausgewählt angewählt).

---

## 9. 🍳 Lebendige Rezept-Blaupause: Progressiver Extraktions-Screen (`ExtractionAnimation/`)

* **Live Materializing Recipe Card:** Statt eines statischen Ladebalkens baut sich die Rezeptkarte Schritt für Schritt synchron mit den Extraktions-Meilensteinen auf:
  1. **Phase 1 (Blaupause):** Plattform-Badge (Instagram, TikTok, YouTube Shorts, Foto-Scan), animierter Laser-Scanner (`animate-scanning-beam`), Skeletons für Titel und Meta-Badges. Bei Foto-Imports wird das Originalfoto sofort ab Millisekunde 0 eingeblendet.
  2. **Phase 2 (Entdeckung):** Post-Thumbnail & Creator-Handle klinken sich ein.
  3. **Phase 3 (Rezept-Materialisierung):** Rezepttitel blendet ein, Meta-Pills (Zeit, Portionen, Kategorie) ploppen mit taktilem Micro-Bounce auf (`animate-scale-pop`, `hapticLight()`), Zutaten-Chips materialisieren sich mit Mengen und Zähler-Badge.
  4. **Phase 4 (Cover & Finalisierung):** Generiertes KI-Food-Cover schärft sich ein, Schritt-Zähler bestätigt die Strukturierung.
* **Architektur:** Modularisiert in Subkomponenten (`RecipeCoverPreview.tsx`, `RecipePillTags.tsx`, `IngredientsStream.tsx`, `ExtractionProgressBar.tsx`, `ProgressiveRecipeCard.tsx`, `useProgressiveRecipe.ts`) unter 150 Zeilen.
* **AdMob-Harmonisierung:** Im Free-Tier wechselt die Karte automatisch in den `compact`-Modus, sodass sie harmonisch über dem MREC-Ad-Banner Platz findet.
