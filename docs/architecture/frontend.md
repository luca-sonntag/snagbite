# 🎨 Frontend-Layer (React 19 & HeroUI v3)

## 1. Stack & Modul-Struktur

* **Technologie:** React 19, Vite, TypeScript, HeroUI v3 (React Aria-basiert), Tailwind CSS v4. Als native Android-App über **Capacitor** gebaut und im **Google Play Store** ausgeliefert.
* **App-Shell (`App.tsx`):**
  * Modular gestaltet, delegiert komplexe Zustände an Custom Hooks.
  * Zeigt ein Auth-Gate (`AuthForm`) bei fehlender Session.
  * **`--app-sticky-top` (Sticky-Offset):** Die Sticky-Kopfregion (Safe-Area-Filler + `TimerBanner`) misst ihre Höhe per `ResizeObserver` und schreibt die Höhe als globale CSS-Variable `--app-sticky-top` auf `document.documentElement`. Views nutzen `sticky top-[var(--app-sticky-top)]`.
  * **`RecipeDetails` Single-Page Scroll-Layout & `RecipeStickyBar`**: Rezept-Detailansicht als einzelne, fließende Scroll-Seite ohne Tabs (Details `RecipeInfoSection`, Zutaten `RecipeIngredients`, Zubereitung `RecipeInstructions`). `RecipeStickyBar` heftet sich an `top-[var(--app-sticky-top)]` und markiert dynamisch per Scroll-Spy die gerade sichtbare Sektion. Kategorie-Überschriften in den Zutaten verwenden harmonische vertikale Farb-Pills (`w-1 h-3.5 rounded-full`, passend zur Taxonomie aus `i18n.ts`).

### Zentralisierte Kontexte (`frontend/src/context/`)
* **`AuthContext.tsx`:** Verwaltet Supabase Auth Session (`signIn`, `signUp`, `signInWithGoogle`, `signOut`, `getAccessToken`, `isPremium`).
* **`DialogContext.tsx`:** Stellt globalen Dialog-Service (`useDialog()`) bereit, um native Browser-Dialoge durch moderne HeroUI-Dialoge zu ersetzen.
* **`I18nContext.tsx`:** Verwaltet Internationalisierung (Deutsch/Englisch) mit `localStorage`-Persistenz und Browsersprachen-Erkennung.
* **`OverlayStackContext.tsx`:** Globaler Ref-Counted Overlay-Stack (`pushOverlay`, `popOverlay`, `isAnyOverlayOpen`) und Convenience-Hook `useAdOverlay(isOpen)`. Blendet das native AdMob-Banner synchron aus, sobald ein beliebiges Modal, Sheet oder Drawer geöffnet wird, und stellt es nach dem Schließen wieder her.

### Lokalisierung & Error-Code System
* **Lokalisierung (`frontend/src/i18n.ts`):** Übersetzungen für Supermarktabteilungen, Emojis, Sortierung, UI-Texte und Auth.
* **Error-Code-System (`frontend/src/errorCodes.ts` ↔ `backend/src/errors.ts`):**
  * Das Backend liefert maschinenlesbare Codes (`AppErrorCode` + `AppError`-Klasse mit `code`, `params`, `httpStatus`).
  * Asynchrone Fehler werden als JSON-Envelope `{"code","params"}` in `jobs.error` persistiert.
  * `frontend/src/errorCodes.ts` ist eine meldungsfreie Registry (`AppErrorCode`, `ALL_ERROR_CODES`, `isKnownErrorCode`, `parseSerializedError`).
  * Lokalisierte DE/EN-Texte leben in `uiTranslations` unter `error.codes.<CODE>`. `messageForCode(code, params, lang)` löst dynamische Variablen auf.
  * Legacy-Fallback `translateApiError` sichert die Kompatibilität für ungecodete Alt-Meldungen.

---

## 2. 📚 3-Ebenen-Katalog (SavedCatalog)

Der Rezept-Katalog ist als **Kochbuch mit drei Ebenen** aufgebaut:
1. **Kochbuch-Home (`#/history`, `CookbookHome.tsx`):** Browsebare Startseite. Sucheinstieg, Sammlungs-Karussell (`CollectionTile`), oberstes 2-reihiges horizontales Karussell (`TwoRowRecipeShelf.tsx` für "Zuletzt gespeichert"), weitere thematische Regale (`RecipeShelf.tsx`, `RecipePosterCard` für "Zuletzt geöffnet", "Favoriten", "Schnell gekocht"), Label-Chips und "Alle N Rezepte ansehen".
2. **Listen-Ebene (`#/history/list...`, `SavedCatalog/index.tsx`):** Vollständige, filter-/sortierbare Liste mit `CatalogFilters.tsx` als Sticky-Header, `FilterSheet` und wahlweise 2-Spalten-Poster-Grid (`viewMode: 'card'`) oder dichten Zeilen (`viewMode: 'compact'`). Nur hier existieren Multi-Select und `BulkActionBar`.
3. **Detailansicht (`#/history/<jobId>`):** `RecipeDetails`.

### Katalog-Features
* **Routing (`SavedCatalog/catalogRoutes.ts`):** `subPath` unterscheidet zwischen List-Routen (`list...`) und `jobId`s (UUIDs).
* **Kombinierbare Filter (`FilterSheet.tsx` + `useSavedCatalog.ts`):** Facetten-Objekt `CatalogFilterState` (`favoritesOnly`, `maxTime`, `collectionIds[]`, `flags[]`). Semantik: OR innerhalb einer Facette, AND zwischen Facetten.
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
* **Alarm:** 3× Beep-Ton via Web Audio API (880 Hz) + Vibration + Native Notification Push.
* **Timer-Banner (`TimerBanner.tsx`):** Sticky unter App-Header. Zeigt Countdown & Fortschrittsbalken. Klick navigiert automatisch zum Herkunftsrezept & Schritt.

---

## 5. 🛒 Smarte Einkaufsliste & Zutat-Taxonomie (`useShoppingList.ts` & `ingredientTaxonomy.ts`)

* **Generische Rohstoff-Konsolidierung (Parent Ingredients):**
  * Rezepte behalten ihre präzisen Zubereitungszutaten (z. B. *2 Eigelb*, *1 TL Zitronenabrieb*, *3 Knoblauchzehen*).
  * **Taxonomie-Engine (`ingredientTaxonomy.ts`):** Mapped Teilzutaten und Derivate automatisch auf übergeordnete Rohstoff-Einkaufsartikel (z. B. *Eigelb / Eiweiß ➔ Ei*, *Zitronenabrieb / Zitronensaft ➔ Zitrone*, *Knoblauchzehe ➔ Knoblauch*).
  * **Aggregations-Logik (`useShoppingList.ts`):** Fasst Zutaten desselben Rohstoffs auf der Einkaufsliste zusammen (z. B. 2 Stück Eigelb + 1 Stück Ei = **3 Stück Ei**).
* **Sub-Item Breakdown UI & Smart Deduplication (`ShoppingListItem.tsx`):**
  * Blendet unter der aggregierten Hauptzeile die Zusammensetzung transparent ein.
  * **Smart Deduplication**: Entfernt doppelte Mengen (z. B. `2 Stück`) und Hauptzutatennamen in Klammern (z. B. `[2 Stück] Französisches Baguette (klein)` statt redundanter Doppelnennung).
  * Zeilenumbrüche (`break-words`) verhindern harte Wortkürzungen (`truncate`).
* **Supermarkt-Supergruppen, Kategorie-Farb-Pills & Einklappbare Erledigt-Liste (`ShoppingListGroup.tsx` & `ShoppingCheckedDrawer.tsx`):**
  * Sortierung nach echter Markt-Reihenfolge (Obst & Gemüse ➔ Brot ➔ Konserven etc.).
  * **Kategorie-Farb-Pills (`getCategoryTheme` in `i18n.ts`)**: Statt unruhiger Emojis sitzt über jeder Kategorie-Überschrift ein schmaler, langgezogener abgerundeter Farb-Balken (`w-8 h-1 rounded-full`) mit einer harmonisch abgestimmten Farbe pro Abteilung (z. B. Smaragdgrün für Obst & Gemüse, Bernstein für Brot & Backwaren, Rosé für Fleisch & Geflügel, etc.).
  * **Erledigt-Accordion**: Abgehakte Artikel wohnen in einem standardmäßig eingeklappten Accordion (`Erledigt (X)`), um kognitive Unruhe im Laden zu minimieren.
  * **Expliziter Gruppen-Check**: Die "Ganzes Regal abhaken"-Aktion ist als separater `CheckCheck`-Button abgetrennt, um versehentliches Abhaken beim Antippen von Kategorienamen zu verhindern.
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
* **Bottom-Dock Banner (`BANNER` 320×50):** Integriert in der Haupt-App-Shell (`App.tsx`) direkt oberhalb der Bottom-Navigation.
  * **Sichtbarkeit:** Sichtbar auf den Tabs `extract`, `history`, `shopping-list` und `progress` für Free-User.
  * **Unterdrückung:** Ausgeblendet im `settings`- und `admin`-Tab, während einer geöffneten Rezept-Detailansicht (`isViewingRecipe`) sowie während einer aktiven Extraktion.
* **Extraktions-Fortschrittsbanner (`MEDIUM_RECTANGLE` / MREC 300×250):** Wird in `ExtractForm.tsx` / `ExtractionAnimation.tsx` unterhalb des Fortschritts-Skeletts eingeblendet, während Gemini das Rezept analysiert.

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
* **Problem:** Native Android AdViews schweben systembedingt über jedem Web-DOM-Inhalt und würden HeroUI-Dialoge, Bottom-Sheets und Menüs überdecken.
* **Lösung:** Globaler ref-counted Stack. Jeder geöffnete Overlay-Dialog (z. B. `PremiumModal`, `FeedbackDrawer`, `CollectionSheet`, `FilterSheet`, `FlagSheet`, `TimerConfirmSheet`, `DialogContext`) ruft `useAdOverlay(isOpen)` auf.
* **Verhalten:**
  * Stack-Tiefe `0 ➔ 1`: Ruft `hideAdBanner()` auf.
  * Stack-Tiefe `1 ➔ 0`: Ruft `resumeAdBanner()` auf.
  * Sofortige Pointerdown-Interzeption vor Abschluss von Klickanimationen.

### Stale Impression & Resume Delay Logik
* **`STALE_HIDE_MS` (60s):** Bleibt das Banner länger als 60 Sekunden versteckt (z. B. langes Lesen eines Rezepts), wird es zerstört. Beim nächsten Einblenden wird ein frischer Ad-Request abgesetzt (neue bezahlte Impression statt alter Standbild-Banner).
* **`RESUME_DELAY_MS` (500ms):** Das Wiedereinblenden nach Schließen von Overlays wird verzögert, bis die CSS-Slide-Up-Animation der Bottom-Bar vollständig abgeschlossen ist.

### DSGVO / UMP Consent Flow & Plugin-Patch
* **Google UMP SDK:** In `initAds()` wird vor dem ersten Ad-Request `AdMob.requestConsentInfo()` und bei Bedarf `AdMob.showConsentForm()` ausgeführt. Bei Ablehnung oder fehlendem Consent wird `npa: true` (Non-Personalized Ads) angefordert.
* **Patched Plugin:** `@capacitor-community/admob` v8.0.0 wurde via `patch-package` angepasst, um echte Java-seitige `hideBanner()` / `resumeBanner()` Methoden auf dem Android UI-Thread ohne Deadlocks und Neuladen bereitzustellen.
