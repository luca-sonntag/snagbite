# 🎨 UI & Design Styleguide (Snagbite Cookbook)

> **Design-Philosophie:** Modern, flach, rahmenlos („Clean Flat Style“), haptisch lebendig und redaktionell hochwertig („Culinary Magazine Style“). Die Benutzeroberfläche setzt auf großzügigen Weißraum, subtile Farbschichten, feine Tiefenschatten zur Tiefenwahrnehmung und reaktionsschnelle Micro-Interactions (`active:scale-95`, Haptik) statt harter Trennlinien (`border`), unruhiger Emojis oder überladener Schatten.

---

## 1. 🌈 Farbpalette & Design Tokens

### App-Canvas & Oberflächen
* **Light Mode:**
  * **App-Canvas (Hintergrund):** `#f8fafc` (`slate-50`, definiert in `index.css` & `index.html`) — Kühles, klares Canvas-Grau, das aufstrebende weiße Karten (`#ffffff`) ohne störende Ränder plastisch hervortreten lässt.
  * **Karten & Oberflächen:** `#ffffff` (`bg-white`)
  * **Subtile Kontur- & Pill-Flächen:** `bg-black/5` / `bg-gray-100`
* **Dark Mode (Linear Onyx & Carbon Palette):**
  * **App-Canvas (Hintergrund):** `#09090b` (`bg-gray-950` / `--color-gray-950`) — Tiefes, harmonisches Onyx-Schwarz.
  * **Oberflächen Ebene 1 (Container):** `#121215` (`bg-gray-900` / `--color-gray-900`)
  * **Karten & Panels Ebene 2:** `#1c1c21` (`bg-gray-800` / `--color-gray-800`)
  * **Interaktive Buttons & Pills Ebene 3:** `#2b2b33` (`bg-gray-700` / `--color-gray-700`)
  * **Subtile Haarlinien & Ringe:** `#3f3f46` (`--color-gray-600` / `ring-white/10`)
  * **Muted Captions & Inaktive Icons:** `#71717a` (`--color-gray-500`)
  * **Sekundärer Text:** `#a1a1aa` (`--color-gray-400`)

### Akzentfarben
* **Primary Accent (Smaragdgrün):** `emerald-600` (Light) / `emerald-500` (Dark)
  * Soft Badges & Highlights: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`
  * Action Buttons: `bg-emerald-600 hover:bg-emerald-500 text-white`
  * Aktive Nav-Indikatoren: `h-1 w-5 rounded-full bg-emerald-600`
* **Favoriten / Highlights (Warm Gold):** `amber-500`
  * Active Favorite Pill: `bg-amber-500/10 text-amber-500 hover:bg-amber-500/20`
* **Timer & Zeit-Aktionen (Ozeanblau):** `blue-600` / `blue-500`
* **Gefahr / Timer Abgelaufen (Beere/Rose):** `rose-600` / `rose-500`

### 🥗 Health-Score & Nutri-Score Farbspektrum (5 Zonen)
* **Score 80–100 (Note A):** `#10b981` (`bg-emerald-600`) — Hohe Nährstoffdichte, viel Gemüse & Ballaststoffe
* **Score 65–79 (Note B):** `#0d9488` (`bg-teal-600`) — Ausgewogen, nährstoffreich
* **Score 50–64 (Note C):** `#d97706` (`bg-amber-500`) — Solide, mit moderaten Fetten/Kohlenhydraten
* **Score 35–49 (Note D):** `#ea580c` (`bg-orange-500`) — Höherer Verarbeitungsgrad, Zucker oder gesättigte Fette
* **Score 0–34 (Note E):** `#e11d48` (`bg-rose-500`) — Genuss- / Ausnahmegericht
* **Kompaktes Letter-Badge:** Kreisrund `w-3.5 h-3.5` oder `w-4 h-4`, `font-black text-[9px]` bis `text-[9.5px]`, weißer Großbuchstabe zentriert, `shadow-2xs`.
* **Kopplungs-Regel:** Auf allen Karten stehen Kalorien und der Health-Score-Buchstabe unmittelbar nebeneinander (`{calories} kcal • [Score]`), um eine schnelle Nährwert-Erfassung ohne Blickwechsel zu ermöglichen.

### Hero-Badge Farbvarianten & Pagination
* **Themen-Farben (`HeroBadgeVariant`):** `amber`, `emerald`, `indigo`, `blue`, `teal`, `rose`.
* **Pill-Styling:** `px-2.5 py-1 rounded-full ${variantStyle} backdrop-blur-md text-[10.5px] font-bold shadow-md flex items-center gap-1.5`.
* **Pagination Dots:**
  * Aktiver Dot: Dynamisch gedehnte Pill `w-5 h-1.5 rounded-full` in der Themenfarbe des aktuellen Slides (`bg-amber-500`, `bg-emerald-500`, etc.).
  * Inaktive Dots: Subtile graue Kreise `w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700`.

---

## 2. 🔤 Typografie & Redaktionelle Hierarchie

* **Schriftart:** `Outfit` (Self-hosted WOFF2 für 100% DSGVO-Konformität, Fallback `system-ui, -apple-system, sans-serif`). Überschriften nutzen `font-heading` (`Outfit`).
* **Redaktionelle Headlines & Begrüßung:**
  * **Kontextuelles Eyebrow-Label:** `text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400`. Begrüßt zeit- und wochentagsabhängig (z. B. *„SCHÖNEN SONNTAGABEND, TEST“*).
  * **Großer Magazin-Aufmacher:** `text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5`. Konkrete situationsbezogene Inspiration (z. B. *„Lust auf einen späten Snack?“*).
  * **Sektions-Titel:** `text-base font-bold text-gray-900 dark:text-white tracking-tight font-heading`
  * **Sektions-Untertitel:** `text-xs text-gray-500 dark:text-gray-400 mt-0.5`
* **Timeline-Cluster Header:**
  * Zentrierte Anordnung mit beidseitigen Haarlinien (`h-px flex-1 bg-gray-200/80 dark:bg-gray-800`), zentrierter Titel `font-heading tracking-tight text-xs sm:text-sm font-bold` und Mengen-Pill `px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10.5px] font-semibold text-gray-500 dark:text-gray-400`.
* **Karten-Titel:** `text-sm` bis `text-base`, `font-bold text-gray-900 dark:text-white leading-snug line-clamp-2` (bzw. `line-clamp-3` bei Kompaktkarten).
* **Anti-Slop Typografie:**
  * **Zero Emojis in Sektionsüberschriften:** Überschriften und Labels bleiben typografisch rein. Keine Sparkles, Flammen oder Blitz-Emojis in Headern.
  * **Sicherer Textumbruch:** Wörter in Titeln und Sammlungsnamen dürfen nicht unschön abgeschnitten werden (`break-words [overflow-wrap:anywhere] [word-break:break-word] hyphens-auto`).

---

## 3. 📦 Komponenten-Standards (Clean Flat Style)

### 3.1 Sammlungs-Hub (`CollectionStoryHub` & `CollectionStoryBubble`)
* **Squircle-Form:** Sammlungen werden als haptische Squircle-Kacheln (`rounded-2xl`, `w-16 h-16` / 64×64px) horizontal scrollbar dargestellt.
* **Fotokacheln:** `bg-white dark:bg-gray-800 shadow-[0_3px_10px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden border-none`.
* **„+ Neu“-Aktionskachel:** Flache, rahmenlose Mint-Fläche `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` ohne Schatten (`shadow-none`) mit grünem Plus-Icon und zentrierter Beschriftung darunter.
* **Leere Sammlungen:** Feiner gestrichelter Rahmen `border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30` mit dezentem grauem Plus-Icon.
* **Beschriftung:** `text-[11px] font-bold text-gray-800 dark:text-gray-200 tracking-tight text-center px-0.5 leading-tight break-words [overflow-wrap:anywhere] [word-break:break-word] hyphens-auto max-w-full`.

### 3.2 Die 4 Magazin-Kartenformate (Ebene 1 Feed)

#### Format A: Curated Hero Spotlight (`RecipeHeroCard` & `RecipeHeroCarousel`)
* **Proportionen & Raster:** 4:3 Magazin-Format auf Mobile (`aspect-[4/3] sm:aspect-[16/10]`), Snap-Scroll mit peeking (`w-[86%] sm:w-[89%] md:w-[92%]`) zur natürlichen Andeutung des nächsten Slides.
* **Foto & Gradient-Scrim:** Randlose Vollbildfotografie mit weichem Bottom-Gradient `bg-gradient-to-t from-black/95 via-black/30 via-45% to-transparent`.
* **Header-Badges:** Farbige Thema-Pill (`HeroBadgeVariant`) mit Rezeptanzahl und Pfeil (`ChevronRight`) zum interaktiven Öffnen des `HeroThemeSheet`s. Rechts: Bookmark/Save-Icon bzw. Favoriten-Stern.
* **Metazeile:**
  * Dauer-Pill links: `px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10px]` mit Clock-Icon.
  * Kalorien & Health-Score direkt daneben: `text-white/90 font-medium {calories} kcal` + Buchstabe im farbigen Kreis.
  * Vital-Metriken (Protein & Gemüsegewicht) werden ausschließlich auf Vital-Karten eingeblendet.
* **Titel & Footer:**
  * Titel: 100% Breite, zweizeilig (`line-clamp-2`, `font-heading text-base sm:text-lg font-bold text-white`).
  * Untere Zeile: Creator-Handle links (`text-[10.5px] text-gray-300/85 font-medium truncate`), weißer „Jetzt kochen“-CTA rechts (`px-2.5 py-1 rounded-xl bg-white text-gray-950 font-bold text-xs shadow-md active:scale-95`).

#### Format B: Asymmetrisches Bento-Grid (`RecipeBentoSection` & `RecipeCompactCard`)
* **Layout:** 2-Spalten-Grid (`grid grid-cols-2 gap-2.5 sm:gap-3 items-stretch`).
* **Linke Karte (3:4 Portrait):** `min-h-[220px] sm:min-h-[250px] rounded-2xl` mit Foto, Gradient-Scrim, Dauer-Pill, Kalorien und Health-Score ohne Wrapping, darunter Titel. Streckt sich dynamisch auf die Höhe der rechten Spalte.
* **Rechte Karten (2× Gestapelte `RecipeCompactCard`):**
  * `flex-1 rounded-2xl bg-white dark:bg-gray-900/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-none overflow-hidden`.
  * **Thumbnail:** Durchgehende Vollhöhe links (`w-22 sm:w-26`), dezenter Bottom-Scrim mit neutralgrauer Zeit-Pill (`px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-xs text-white text-[9.5px] font-semibold`).
  * **Inhalt rechts:** Bis zu 3 Zeilen Titel (`line-clamp-3`), Kalorien links unten, Health-Score-Buchstabe (`w-4 h-4 rounded-full`) rechts unten.

#### Format C: Wiederentdeckte Schätze (`RecipeShowcaseCard`)
* **Format:** Breiter horizontaler Banner für Gerichte mit Verweildauer ≥ 14 Tage.
* **Aufbau:** Linkes Cover (`w-28 sm:w-36`), Amber-Datumsstempel oben (*„Gespeichert am 12. Aug.“*), zweizeiliger Titel, Dauer links unten, Kalorien & Health-Score rechts unten.

#### Format D: Vertikale Timeline-Bibliothek (`AllRecipesShelf`)
* **Layout:** Chronologische Abschnitte (*Heute*, *Gestern*, *Diese Woche*, *Letzte Woche*, *Monat/Jahr*) im 2-Spalten-Grid (`grid grid-cols-2 gap-3 sm:gap-4`).
* **Poster-Karte (`RecipePosterCard`):**
  * 4:3 Clean Photo Cover mit `ring-1 ring-black/5 dark:ring-white/10`.
  * Dauer-Pill links: `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] rounded-md`.
  * Kalorien & Health-Score rechts: Kleben direkt aneinander.
  * Remix-Stack-Effekt bei variierten Rezepten mit real geschichteten Schatten.

### 3.3 Touch Targets, Buttons & Interaktive Elemente
* **Touch-Target-Standard: Mindestens 44×44px** (`min-w-[44px] min-h-[44px]`) für alle klickbaren Icons und Buttons auf Mobilgeräten.
* **Icon-Buttons im Header:** `w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center border-none transition-all active:scale-95`.
  * Inaktiv: `bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10`.
  * Aktiv / Filter gesetzt: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` oder `bg-emerald-600 text-white`.
* **Suchleiste (In-Place Expandable):** Klick auf das Search-Icon blendet die Such- und Filterleiste fließend im Header ein (`animate-in fade-in duration-200`) statt die Seite zu wechseln.
* **Floating Bars & Bottom Navigation:**
  * Floating Action Bars: `bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full border-none shadow-[0_4px_20px_rgba(0,0,0,0.08)]`.
  * Bottom App Bar Navigation (`App.tsx`): `bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-3xl border-none shadow-[0_-2px_10px_rgba(0,0,0,0.03)]`. Aktiver Tab wird mit einem Smaragd-Indikatorbalken (`h-1 w-5 rounded-full bg-emerald-600`) unter dem Icon hervorgehoben.

### 3.4 Dialoge, Modals & Themensheets (`HeroThemeSheet`)
* **Container & Radien:** `bg-white dark:bg-gray-900 rounded-3xl md:rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)] p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))]`.
* **Themensheets (`HeroThemeSheet`):** Bottom-Drawer mit puristischem Typografie-Header (Titel, Rezeptanzahl, Akzentfarbe via `badgeVariant`) und horizontalen Rezeptkarten.
* **Header & Footer:** Niemals Trennlinien (`border-b` / `border-t`), stattdessen offene Weißräume (`pb-3 mb-1` / `pt-3`).
* **Footer-CTA:** Primärer Absprung-Button in der entsprechenden Akzentfarbe (z. B. `bg-amber-500` oder `bg-emerald-600`) mit direktem Sprung in den vorgefilterten Katalog.

---

## 4. 🍳 Modul-spezifische Guidelines

### 4.1 Kochbuch-Home (Culinary Magazine Feed)
* **Katalog-Architektur:** 3-Ebenen-Aufbau:
  1. **Home:** Redaktioneller Magazin-Feed (Story-Hub, Hero-Karussell, Bento-Grid, Showcase, Timeline-Shelf).
  2. **Liste:** Sortier- und filterbare Arbeitsansicht mit Sticky-Header, Multi-Select und Bulk-Aktionen.
  3. **Detail:** Vollständige Rezept-Ansicht mit fließendem Scrollen.
* **Kein Karussell-Sandwich:** Niemals mehr als ein horizontales Rezept-Karussell direkt untereinander stapeln. Der Übergang vom Hero-Karussell in das vertikale Bento-Grid sorgt für einen abwechslungsreichen visuellen Rhythmus.

### 4.2 Rezept-Detailansicht (Recipe Details Overhaul)
* **Hero Cover mit integriertem Titel (`RecipeImageGallery`):** Titel, Creator-Handle und primäre Aktionen sind direkt in das Fotocover mit Gradient-Scrim eingebettet.
* **Inverted Curve Sheet-Overlap:** Das Inhalts-Sheet überlappt das Fotocover mit `-mt-6 -mx-4 rounded-t-3xl sm:rounded-t-[2rem]` und fügt sich nahtlos in den App-Canvas (`bg-[#f8fafc] dark:bg-gray-950`) ein.
* **Editorial Quick-Facts Lead-in:** Direkt unter der Überlappung sitzen harmonische Pills:
  * Kategorie-Pill (`bg-emerald-500/10 text-emerald-700 font-bold text-xs rounded-full`)
  * Dauer-Pill (`bg-gray-100 text-gray-700 font-semibold text-xs rounded-full`)
  * Portionen-Pill (`bg-gray-100 text-gray-700 font-semibold text-xs rounded-full`)
  * Interaktiver Health-Score-Button zum Öffnen des `HealthScoreSheet`s
* **Zutaten-Darstellung:** Ruhige, einheitliche Karten mit feinen Haarlinien (`divide-y divide-gray-100 dark:divide-gray-800`), Portionen-Stepper und reinweißem Container (`bg-white dark:bg-gray-900`) für den Einkaufslisten-Button.

### 4.3 Einkaufsliste (`ShoppingListGroup` & `ShoppingCheckedDrawer`)
* **Supermarkt-Supergruppen mit Kategorie-Farb-Pills:** Über jeder Warengruppe sitzt ein schmaler Farbbalken (`w-8 h-1 rounded-full`, z. B. Smaragdgrün für Obst & Gemüse, Bernstein für Brot & Backwaren) statt unruhiger Emojis.
* **Erledigt-Accordion:** Abgehakte Artikel liegen in einem standardmäßig eingeklappten Drawer/Accordion, um Ablenkung im Supermarkt zu vermeiden.
* **Expliziter Gruppen-Check:** Separater `CheckCheck`-Button verhindert versehentliches Abhaken beim Antippen des Kategorienamens.

### 4.4 Kochmodus (Cooking Mode)
* **Full-Screen Container:** Unlenkbare Ansicht (`fixed inset-0 z-[90] bg-white dark:bg-gray-950`).
* **Schritt-Badge:** Modernes Squircle-Badge (`w-12 h-12 rounded-2xl bg-emerald-500 text-white font-black text-xl flex items-center justify-center`).
* **Schritt-Zutaten Box:** Flaches Card-Container `bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 sm:p-5 border-none` mit flachen Zutaten-Pills `bg-white dark:bg-gray-800 rounded-xl px-3 py-2`.

### 4.5 KI Rezept Copilot (`RecipeCopilot`)
* **Immersives Glassmorphism-Overlay:** `fixed inset-0 z-[100] backdrop-blur-2xl bg-black/25 dark:bg-black/55`.
* **Nachrichten-Bubbles:**
  * KI (Bot): Schwebende Glass-Karten (`bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-900 dark:text-gray-100 rounded-3xl rounded-bl-xs shadow-[0_4px_16px_rgba(0,0,0,0.05)] border-none`).
  * User: Smaragdgrüne Glass-Bubbles (`bg-emerald-600/90 text-white backdrop-blur-md rounded-3xl rounded-br-xs shadow-[0_4px_16px_rgba(16,185,129,0.25)] border-none`).
* **Schwebendes Eingabe-Dock:** `bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)]`.

### 4.6 Rezept-Import / Neu-Tab (`ExtractForm`)
* **2 Ruhige Aktionskarten (`ExtractActionCards`):** Video/Link importieren & Kochbuch scannen.
* **Eingabe über Bottom Sheets:** `UrlExtractSheet` und `PhotoExtractSheet`.
* **Zero Emojis / Anti-Slop:** Keine Sparkles, Emojis oder verspielte Formulierungen. Reine Typografie und Lucide-Icons.

---

## 5. 🛑 Do's and Don'ts

| ✅ Do | ❌ Don't |
| :--- | :--- |
| **Rahmenlos bauen (`border-none`)** | Harte Trennlinien (`border-b border-black/5`, `border-t border-gray-200`) dazwischensetzen |
| **Canvas `#f8fafc` (Light) / `#09090b` (Dark) nutzen** | Verwaschenes Gelb-Grau (`#f9fafb`) oder aschige Hintergründe verwenden |
| **Kalorien direkt links neben dem Health-Score platzieren** | Nährwerte über die Karte verstreuen oder auf separaten Zeilen umbrechen |
| **Asymmetrische Bento-Raster (3:4 + 2 gestapelt) nutzen** | Monotone, identische 2-Reihen-Raster ohne visuelle Hierarchie aneinanderreihen |
| **Subtilen Scrim mit neutralgrauer Zeit-Pill im Bild einbetten** | Grelle bunte Zeit-Badges mitten über Fotos legen |
| **Squircle-Kacheln (`rounded-2xl`, `w-16 h-16`) für Sammlungen** | Kreisrunde Stories mit überladenen Randringen oder Ordner-Icons verwenden |
| **Touch-Targets konsequent ≥ 44×44px auslegen** | Winzige Klickflächen (< 40px) ohne Padding verbauen |
| **Haptisches Feedback (`hapticLight()`, `active:scale-95`)** | Statische Elemente ohne Touch-Rückmeldung anbieten |
| **Reine Typografie & hochwertige Food-Fotografie** | Dekorative Emojis, Sparkles oder Flammen in Sektionsüberschriften einbauen |
| **Sichere Worttrennregeln (`break-words`, `hyphens-auto`)** | Titel mit hartem `truncate` unleserlich abschneiden |
| **1 einziges Hero-Karussell oben, danach vertikaler Fluss** | Mehrere horizontale Scroll-Leisten direkt übereinander stapeln („Karussell-Sandwich“) |
