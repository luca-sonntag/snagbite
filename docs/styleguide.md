# 🎨 UI & Design Styleguide (Snagbite Cookbook)

> **Design-Philosophie:** Modern, flach, rahmenlos ("Clean Flat Style") und haptisch lebendig. Die Benutzeroberfläche setzt auf großzügigen Weißraum, subtile Farbschichten, feine Schatten zur Tiefenwahrnehmung und reaktionsschnelle Micro-Animations statt harter Trennlinien (`border`) oder überladener Schatten.

---

## 1. 🌈 Farbpalette & Design Tokens

### Hintergründe & Oberflächen
* **Light Mode:**
  * App-Hintergrund: `#f9fafb` (`bg-gray-50`)
  * Karten & Oberflächen: `#ffffff` (`bg-white`)
  * Subtile Kontur-/Eingabeflächen: `bg-gray-100` / `bg-gray-50`
* **Dark Mode (Warm Charcoal Palette):**
  * App-Hintergrund: `#1a1917` (`bg-gray-950` / `--color-gray-950`)
  * Karten & Oberflächen: `#262624` (`bg-gray-900` / `--color-gray-900`)
  * Subtile Eingabeflächen: `#363531` (`bg-gray-800` / `--color-gray-800`)

### Akzentfarben
* **Primary Accent (Smaragdgrün):** `emerald-600` (Light) / `emerald-500` (Dark)
  * Soft Badges & Highlights: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`
  * Action Buttons: `bg-emerald-600 hover:bg-emerald-500 text-white`
* **Favoriten / Highlights (Warm Gold):** `amber-500`
  * Active Favorite Pill: `bg-amber-500/10 text-amber-500 hover:bg-amber-500/20`
* **Timer & Zeit-Aktionen (Ozeanblau):** `blue-600` / `blue-500`
* **Gefahr / Timer Abgelaufen (Beere/Rose):** `rose-600` / `rose-500`

---

## 2. 🔤 Typografie & Hierarchie

* **Schriftart:** `Outfit` (Self-hosted WOFF2 für 100% DSGVO-Konformität, Fallback `system-ui, -apple-system, sans-serif`).
* **Größen & Gewichtung:**
  * **Große Überschriften (Kochmodus/Detail):** `text-2xl` bis `text-3.5xl`, `font-bold`, `tracking-tight`, `leading-relaxed`.
  * **Karten- & Sektions-Titel:** `text-base` / `text-sm`, `font-bold`, `text-gray-900 dark:text-white`.
  * **Sektions-Labels & Badges:** `text-[10px]` / `text-xs`, `font-bold` / `font-black`, `uppercase`, `tracking-wider` / `tracking-widest`, `text-gray-400 dark:text-gray-500`.
  * **Fließtext & Beschreibungen:** `text-sm` / `text-xs`, `text-gray-600 dark:text-gray-300`, `leading-snug`.

---

## 3. 📦 Komponenten-Standards (Clean Flat Style)

### 3.1 Karten & Panels (Cards)
Karten werden **ohne Rand** (`border-none`) und mit einem **minimalen, weichen Schatten** gestaltet:
* **CSS / Tailwind Klassen:** `bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]`
* **Betroffene Komponenten:**
  * Rezept-Poster & Listenkarten (`RecipePosterCard`, `RecipeListItem`)
  * Sammlungs-Kacheln (`CollectionTile`)
  * Rezept-Import & Formular-Karten (`ExtractForm`)
  * Einkaufslisten-Regal-Karten (`ShoppingListGroup`, `ShoppingCheckedDrawer`)
  * Einstellungen & Profil-Karten (`SettingsView`, `NotificationSettings`)
  * Kontextuelle Zutatenkarte im Kochmodus (`CookingMode`)

### 3.2 Buttons & Icon-Buttons
* **Standard Action Buttons:**
  * Primary: `rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-none active:scale-95 transition-all`
  * Secondary / Soft: `rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-none active:scale-95 transition-all`
* **Icon-Buttons (z. B. Favorit, Optionen, Schließen):**
  * Quadratisch/Abgerundet: `w-10 h-10` / `w-11 h-11`, `rounded-xl` / `rounded-full`, `border-none`.
  * Flat Background: `bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white`.

### 3.3 Eingabefelder & Suchleisten
* **Such- & Formularfelder:**
  * `bg-white dark:bg-gray-800/90 border-none rounded-xl px-4 py-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all`

### 3.4 Headering & Sticky Elements
* Sticky Headers (`CatalogFilters`, `RecipeStickyBar`, `SettingsView` Header) verzichten auf untere Trennlinien (`border-b`).
* Einbettung via `backdrop-blur-md bg-gray-50/85 dark:bg-gray-950/85` zur fließenden Trennung beim Scrollen.

### 3.5 Schwebende Leisten (Floating Action Bars)
* `FloatingActionBar` & Bottom Docks: `bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full border-none shadow-[0_4px_20px_rgba(0,0,0,0.08)]`.
* Bottom App Bar Navigation (`App.tsx`): `border-none shadow-[0_-2px_10px_rgba(0,0,0,0.03)]`.

---

## 4. 🍳 Modul-spezifische Guidelines

### 4.1 Kochmodus (Cooking Mode)
* **Full-Screen Container:** Unlenkbare Ansicht (`fixed inset-0 z-[90] bg-white dark:bg-gray-950`).
* **Schritt-Badge:** Modernes Squircle-Badge (`w-12 h-12 rounded-2xl bg-emerald-500 text-white font-black text-xl flex items-center justify-center`).
* **Schritt-Zutaten Box:** Flaches Card-Container `bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 sm:p-5 border-none` mit flachen Zutaten-Pills `bg-white dark:bg-gray-800 rounded-xl px-3 py-2`.
* **Primary Nav Controls:** Große haptische Buttons (`h-13 rounded-2xl font-bold`).

### 4.2 KI Rezept Copilot (`RecipeCopilot`)
* **Header & Footer:** Trennlinien (`border-b`, `border-t`) komplett entfernt für einen offenen Chat-Fluss.
* **Nachrichten-Bubbles:**
  * **KI (Bot):** Rahmenschlanke weiße/dunkelgraue Bubbles (`bg-white dark:bg-gray-800 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] rounded-2xl rounded-tl-xs`).
  * **User:** Flache Smaragdgrüne Bubbles (`bg-emerald-600 text-white rounded-2xl rounded-tr-xs shadow-none`).
* **Remix- & Transaktionskarten:** Soft Emerald Cards (`bg-emerald-500/10 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] rounded-2xl`).
* **Eingabeleiste & Quick Chips:** Flaches Pill-Input `bg-gray-100 dark:bg-gray-800 border-none rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500/30`. Chips als flache Abrundungen `bg-gray-100 dark:bg-gray-800 border-none`.

### 4.3 Rezept-Import / Neu-Tab (`ExtractForm`)
* **Header:** Konsistenter Seiten-Header mit Titel (*Neues Rezept*) und Subtitel (*Aus Video, Link oder Foto erstellen*).
* **Segmented Mode Switcher:** Flache Pill-Leiste (`bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 border-none`).
* **Social Media & Plattform-Icons:** Subtil und monochrom gehalten (`text-gray-400 dark:text-gray-500`), keine bunten Marken-Hintergründe.
* **Beispiel-Karten:** Clean Flat Style 2-Spalten-Kacheln mit haptischem Feedback (`active:scale-95`).
* **Akkordeons & Tipps:** Flache, rahmenlose Boxen (`bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]`) mit `rounded-2xl` Step-Karten.

---

## 5. 🛑 Do's and Don'ts

| ✅ Do | ❌ Don't |
| :--- | :--- |
| **Rahmenlos bauen (`border-none`)** | Harte Trennlinien (`border-b border-black/5`, `border-t border-gray-200`) dazwischensetzen |
| **Subtilen Schatten nutzen (`shadow-[0_2px_6px_rgba(0,0,0,0.03)]`)** | Schwere, dunkle Schatten (`shadow-2xl`, `shadow-xl`) auf statischen Karten verwenden |
| **Soft Pills für Badges (`bg-emerald-500/10 text-emerald-600`)** | Starke, grelle Volltonfarben für einfache Text-Badges nutzen |
| **Aktive Haptik (`active:scale-95`, `transition-all`)** | Statische Buttons ohne Touch-Feedback verbauen |
| **Abgerundete Radien (`rounded-2xl`, `rounded-3xl`)** | Scharfkantige Ecken (`rounded-none`, `rounded-sm`) nutzen |
