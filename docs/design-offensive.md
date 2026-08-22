# 🚀 Designoffensive Snagbite

> **Kernthese:** Snagbite hat **kein Stilproblem, sondern ein Skalen- und Disziplinproblem.**
> Die Marke (Smaragd, Outfit, schwebende Pill-Navigation, Glassmorphismus) bleibt unverändert.
> Verändert wird ausschließlich das **Maß**: Größen, Abstände, Touch-Targets und die Frage, wie viele Ebenen gleichzeitig übereinander schweben dürfen.

> [!NOTE]
> Dieses Dokument **ersetzt nicht** [`docs/styleguide.md`](./styleguide.md). Der Styleguide beschreibt weiterhin *wie etwas aussieht* (flach, rahmenlos, weiche Schatten). Dieses Dokument beschreibt *wie groß es ist* und macht die Regeln messbar durchsetzbar.

---

## 1. 🎯 Ausgangslage & Ziel

Der direkte Vergleich mit einer Referenz-App (gleiche Domäne: Essensplanung, Einkaufsliste, Rezepte) zeigt ein klares Muster. Die Referenz wirkt großzügig, ruhig und „nativ", obwohl sie **weniger Funktionen pro Screen** zeigt. Snagbite zeigt mehr — und wirkt dadurch web-artig, kleinteilig und hektisch.

| | Referenz-App | Snagbite heute |
| :--- | :--- | :--- |
| Seitenrand | 16–20 px | 12 px (`px-3`) |
| Settings-Zeile | ~96 px hoch, Titel 20 px | ~56 px hoch, Titel 14 px (`text-sm`) |
| Suchfeld | ~56 px | ~44 px (`py-2.5`) |
| Filter-Chip | ~48 px, Icon 24 px | 44 px (`h-11`), Text 12 px, Icon 14 px |
| Bottom-Nav | 1 Leiste, Icons 24 px, Label 12 px | 2 gestapelte Leisten, Icons 22 px, Label 11 px |
| Listenzeile | ~72 px mit Bild | ~30 px (`py-1.5`) |

**Ziel der Offensive:** gleiche Marke, **doppelte Ruhe**. Weniger sichtbare Elemente pro Bildschirm, dafür jedes einzelne größer, greifbarer und in einem verlässlichen Rhythmus.

---

## 2. 🔍 Audit — was messbar ist

Alle Zahlen stammen aus `frontend/src/components` (40 Feature-Komponenten) und sind mit den angegebenen Befehlen reproduzierbar.

| Befund | Zahl | Prüfbefehl |
| :--- | ---: | :--- |
| Textklassen ≤ `text-xs` (inkl. `text-[9px]`/`[10px]`/`[11px]`) | **337** | `grep -rno "text-xs\|text-\[9px\]\|text-\[10px\]\|text-\[11px\]" frontend/src/components \| wc -l` |
| Textklassen ≥ `text-sm` | 160 | `grep -rno "text-sm\|text-base" frontend/src/components \| wc -l` |
| Vertikale Paddings ≤ `py-2` (≤ 8 px) | **108** | `grep -rho "py-[0-2](\.5)\?\b" frontend/src/components \| wc -l` |
| Vertikale Paddings ≥ `py-4` (≥ 16 px) | 16 | `grep -rho "py-\([4-9]\|1[0-9]\)\b" frontend/src/components \| wc -l` |
| Distinkte Radius-Familien | **5** | `grep -rho "rounded-[a-z0-9]*" frontend/src/components \| sort -u` |
| Distinkte Einmal-Schatten `shadow-[…]` | **18** | `grep -rho "shadow-\[[^]]*\]" frontend/src/components \| sort -u \| wc -l` |
| Häufigste Icon-Größen | `w-4` (104×), `w-5` (77×), `w-3.5` (70×) | `grep -rho "w-[0-9.]* h-[0-9.]*" frontend/src/components \| sort \| uniq -c \| sort -rn` |
| `border-t` / `border-b` trotz „rahmenlos"-Regel | **24** | `grep -rn "border-t \|border-b " frontend/src/components \| wc -l` |

### 2.1 Belege im Code

* **Bottom-Nav** — [`frontend/src/App.tsx`](../frontend/src/App.tsx) (ab Zeile ~1125): Labels `text-[11px]`, Icons `w-5.5` (22 px), Badges `text-[9px]`. Der aktive Indikator ist ein `w-6 h-0.5`-Strich mit Glow — 2 px hoch, auf einem Handy praktisch unsichtbar.
* **Zutatenzeile** — [`RecipeIngredients.tsx`](../frontend/src/components/RecipeDetails/RecipeIngredients.tsx): Zeilen `py-1.5` (≈ 30 px), Listen-Gap `gap-1` (4 px). Die **tappbare** kcal-Pille ist `px-2 py-1 text-xs` → ca. 24 px Touch-Target statt 48 dp.
* **Mengenspalte** — dieselbe Datei: `w-16 text-right pr-2.5 border-r` — eine feste 64-px-Spalte mit Trennstrich, obwohl der Styleguide Trennlinien ausdrücklich verbietet.
* **Trennlinien** — `border-t border-black/5` in `RecipeIngredients.tsx` gleich zweimal, direkt gegen die Don't-Tabelle in `styleguide.md` §5.
* **Filter-Chips** — [`CatalogFilters.tsx`](../frontend/src/components/SavedCatalog/CatalogFilters.tsx): `h-11 px-3 text-xs`, Zähler-Badge `text-[11px]`.
* **Settings-Zeilen** — [`SettingsView.tsx`](../frontend/src/components/SettingsView.tsx): durchgehend `text-sm font-semibold` für Zeilentitel; die Referenz nutzt hier 20 px `font-bold` mit 16-px-Untertitel.
* **Action-Dock** — [`RecipeActionDock.tsx`](../frontend/src/components/RecipeDetails/RecipeActionDock.tsx): `bottom-[calc(7rem_+_var(--safe-area-inset-bottom))]`, Labels `text-[10px]`. Die Leiste **stapelt sich über der Bottom-Nav** statt sie zu ersetzen.

### 2.2 Belege aus den Screenshots

* **Doppelte Glas-Ebene:** Auf der Rezept-Detailseite schweben `RecipeActionDock` **und** die Bottom-Nav gleichzeitig — zwei frosted-glass Pillen übereinander, die zusammen ~180 px Inhalt verdecken. Der Nährwert-Balken verschwindet halb dahinter.
* **Safe-Area-Rest:** Unter der Navigationsleiste bleibt auf mehreren Screens ein schwarzer Streifen stehen — der Hintergrund reicht nicht bis unter die Gestensteuerung.
* **Statusleiste uneinheitlich:** Rezept-Detail und Fortschritt zeigen eine dunkelgrüne Statusleiste, Kochbuch und Profil eine helle. Es gibt keine Regel, welcher Screen welche Farbe setzt.
* **Kein vertikaler Rhythmus:** In der Zutatenliste stehen 9 Zeilen auf der Höhe, auf der die Referenz 4 Einkaufszeilen mit Produktbild zeigt.
* **Zwei konkurrierende Karten-Systeme:** Weiße Karten auf grauem Grund (Kochbuch) vs. graue Inset-Flächen auf weißem Grund (Profil, Dialoge). Beides existiert parallel, ohne dass klar wäre wann was gilt.

---

## 3. 🩺 Diagnose — die 6 Kernprobleme

1. **Keine Token-Ebene.** [`frontend/src/index.css`](../frontend/src/index.css) definiert 3 Grauwerte und die Safe-Area-Variablen — sonst nichts. Keine Spacing-, Typo-, Radius- oder Elevation-Skala. Jede Komponente erfindet ihre Maße neu.
2. **Skala zu klein.** Zwei Drittel aller Textklassen sind ≤ 12 px. `text-xs` ist zur Standard-Textgröße geworden, obwohl es die Ausnahme für Labels sein sollte.
3. **Dichte statt Rhythmus.** 108 Paddings ≤ 8 px gegen 16 Paddings ≥ 16 px. Die Halbschritte (`py-1.5`, `py-2.5`, `py-3.5`, `py-4.5`) zerstören jedes 4-pt-Raster.
4. **Touch-Targets unter Norm.** kcal-Pillen, Chips, Zähl-Buttons und Icon-Buttons liegen bei 24–44 px. Android verlangt 48 dp — dies ist der Hauptgrund für das „fummelige" Gefühl.
5. **Ebenen-Kollision am unteren Rand.** `FloatingActionBar` und Bottom-Nav sind beide `z-40`, `fixed`, glasig und beschattet. Es gibt keine Regel, wer wen verdrängt.
6. **Styleguide ohne Durchsetzung.** `styleguide.md` verbietet Trennlinien — der Code enthält 24. Ein Guide ohne Prüfbefehl ist eine Empfehlung, keine Regel.

---

## 4. 🧭 Fünf Designprinzipien

1. **Weißraum vor Trennlinie.** Eine Sektion wird durch Abstand getrennt, nie durch `border`. Wenn ein Abstand nicht ausreicht, war er zu klein — nicht die Linie zu wenig.
2. **48 dp ist keine Empfehlung.** Alles, was auf Tippen reagiert, ist mindestens 48 × 48 px groß. Die *sichtbare* Fläche darf kleiner sein, die *tappbare* nicht.
3. **Eine Größe pro Rolle, nicht pro Stelle.** Es gibt sechs Textrollen und drei Icon-Größen. Wer eine siebte braucht, hat die Rolle falsch gewählt.
4. **Nur eine schwebende Ebene gleichzeitig.** Glas, Blur und schwere Schatten sind ein Ausrufezeichen. Zwei Ausrufezeichen übereinander sind ein Fehler.
5. **Text unter 12 px ist Dekoration, kein Inhalt.** Was ein Nutzer lesen muss, ist mindestens 14 px. 12 px bleibt Versalien-Labels vorbehalten.

---

## 5. 🎛️ Token-Spezifikation

Zielzustand für [`frontend/src/index.css`](../frontend/src/index.css). Alle Werte sind additiv — bestehende Tailwind-Utilities funktionieren weiter, aber neue Arbeit nutzt ausschließlich diese Tokens.

```css
@theme {
  /* ---- bestehend: warme Grautöne ---- */
  --color-gray-950: #1a1917;
  --color-gray-900: #262624;
  --color-gray-800: #363531;

  /* ---- Radius: 3 Stufen + Pille ---- */
  --radius-sb-sm: 12px;   /* Chips, Inset-Felder, kleine Pillen  */
  --radius-sb-md: 20px;   /* Karten, Buttons, Listenzeilen       */
  --radius-sb-lg: 28px;   /* Sheets, Docks, Panels               */

  /* ---- Elevation: genau 3 Stufen ---- */
  --shadow-sb-card:  0 2px 6px rgba(0,0,0,.03);        /* ruhende Flächen  */
  --shadow-sb-float: 0 8px 24px -4px rgba(0,0,0,.12);  /* Nav, Dock, FAB   */
  --shadow-sb-sheet: 0 -4px 30px rgba(0,0,0,.12);      /* Bottom Sheets    */
}
```

### 5.1 Spacing — striktes 4-pt-Raster

Erlaubt: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48**
Abgeschafft: `p-0.5`, `p-1.5`, `p-2.5`, `p-3.5`, `p-4.5` und alle `gap-*.5`-Halbschritte.

| Rolle | Wert | Tailwind |
| :--- | ---: | :--- |
| Seitenrand (Screen) | 16 px | `px-4` |
| Karten-Innenabstand | 16–20 px | `p-4` / `p-5` |
| Abstand zwischen Karten | 12 px | `gap-3` |
| Abstand zwischen Sektionen | 32 px | `gap-8` |
| Abstand Icon ↔ Text | 12 px | `gap-3` |
| Abstand Titel ↔ Untertitel | 4 px | `gap-1` |

### 5.2 Typografie — sechs Rollen, kein Wert unter 12 px

| Rolle | Größe | Gewicht | Tailwind | Einsatz |
| :--- | ---: | :--- | :--- | :--- |
| **Display** | 30 px | `font-bold tracking-tight` | `text-3xl` | Screen-Titel („Mein Kochbuch", „Fortschritt") |
| **Title** | 22 px | `font-bold` | `text-[22px]` | Rezeptname, Settings-Zeilentitel, Dialog-Titel |
| **Section** | 18 px | `font-bold` | `text-lg` | Sektions-Überschriften in Karten |
| **Body** | 16 px | `font-medium` | `text-base` | Standardtext, Listen-Primärtext, Zutatennamen |
| **Body-S** | 14 px | `font-normal` | `text-sm` | Untertitel, Sekundärtext, Metadaten |
| **Label** | 12 px | `font-bold uppercase tracking-wider` | `text-xs` | Sektions-Labels, Badges, Nav-Labels |

> **Verboten:** `text-[9px]`, `text-[10px]`, `text-[11px]` — ersatzlos. Wo sie heute stehen, ist die richtige Antwort fast immer **Label 12 px**, gelegentlich **Body-S 14 px**.
> **Verboten:** `text-xs` für Fließtext oder Listeninhalte. `text-xs` ist ausschließlich Versalien-Label.

### 5.3 Icons — drei Größen

| Größe | Tailwind | Einsatz |
| ---: | :--- | :--- |
| 20 px | `w-5 h-5` | Inline im Text, in Chips, in Listenzeilen |
| 24 px | `w-6 h-6` | Standard: Navigation, Icon-Buttons, Karten-Aktionen |
| 28 px | `w-7 h-7` | Hero: Empty-States, Sektions-Medaillons |

> **Verboten:** `w-3 h-3`, `w-3.5 h-3.5`, `w-4 h-4` (heute 206 Vorkommen). Ein 14-px-Icon ist auf einem Handy ein Punkt, kein Symbol. Ausnahme: rein dekorative Statuspunkte ohne Bedeutung.

### 5.4 Touch-Targets & Höhen

| Element | Mindesthöhe |
| :--- | ---: |
| Alles Tappbare (absolut) | **48 px** |
| Icon-Button | 48 × 48 px |
| Chip / Filter | 48 px |
| Listenzeile (Text) | 56 px |
| Listenzeile (mit Bild) | 72 px |
| Settings-Zeile (Titel + Untertitel) | 80 px |
| Primärer Button | 52 px |
| Such-/Eingabefeld | 56 px |

Für Elemente, deren *sichtbare* Fläche bewusst kleiner bleiben soll (z. B. die kcal-Pille), gilt die Vergrößerung des tappbaren Bereichs per Pseudo-Element:

```css
/* index.css — tappbare Fläche auf 48px aufziehen, Optik unverändert */
.tap-48 { position: relative; }
.tap-48::after {
  content: ''; position: absolute; inset: 50% 0 0 0;
  min-height: 48px; min-width: 48px;
  transform: translateY(-50%);
}
```

---

## 6. 🧩 Komponenten-Spezifikation

> Die Marke bleibt: **Pill-Navigation und Glassmorphismus werden beibehalten**, nur skaliert. Neue Regel: Glas ist ein Privileg — **maximal eine glasige Ebene pro Screen**.

### 6.1 Bottom-Navigation — `frontend/src/App.tsx`

| Eigenschaft | Heute | Künftig |
| :--- | :--- | :--- |
| Icon | `w-5.5` (22 px) | `w-6 h-6` (24 px) |
| Label | `text-[11px]` | `text-xs` (12 px), `font-bold` |
| Tab-Höhe | ~58 px | **72 px** (`h-18`, Icon 24 + Gap 4 + Label 12 + Padding) |
| Aktiv-Indikator | `w-6 h-0.5` Strich + Glow | **Pill hinter dem Icon**: `w-12 h-8 rounded-full bg-emerald-500/12` |
| Badge | `text-[9px]`, `h-4` | `text-[11px]`, `h-5 min-w-5`, Ring 2 px |
| Container | `rounded-3xl` + Border + doppelter Schatten | `rounded-[28px]`, **kein** Border, `--shadow-sb-float` |
| Außenabstand | `px-3` | `px-4`, `pb-[calc(12px + safe-area)]` |

Der Wechsel vom Unterstrich zur Indikator-Pille ist der einzige strukturelle Eingriff — er kostet nichts, macht den aktiven Tab aber aus einem Meter Entfernung sichtbar und ist gleichzeitig das Muster, das Android-Nutzer erwarten.

### 6.2 Schwebende Leisten — `FloatingActionBar.tsx`, `RecipeActionDock.tsx`

| Eigenschaft | Heute | Künftig |
| :--- | :--- | :--- |
| Position | `bottom-[calc(7rem + safe-area)]` **über** der Nav | `bottom-[calc(12px + safe-area)]` — **an Stelle** der Nav |
| Nav-Verhalten | bleibt sichtbar | wird ausgeblendet, solange ein Dock aktiv ist |
| Item-Label | `text-[10px]` | `text-xs` (12 px) |
| Item-Icon | `w-5 h-5` | `w-6 h-6` |
| Item-Höhe | `py-2` ≈ 52 px | **56 px**, `min-w-20` |
| Innenabstand Shell | `p-2` | `p-2` (unverändert) |
| Rahmen | `border border-black/[0.08]` | entfällt — nur `--shadow-sb-float` |

### 6.3 Karte / `glass-panel`

```
bg-white dark:bg-gray-900
rounded-[20px]            /* --radius-sb-md */
p-5                       /* 20px, statt 12–14px heute */
shadow-[var(--shadow-sb-card)]
border-none
```

Regel: Karten enthalten **keine** `border-t`/`border-b`-Unterteilungen. Wo heute eine Trennlinie eine Karte in Abschnitte teilt, wird die Karte in **zwei Karten mit 12 px Abstand** aufgeteilt.

### 6.4 Listenzeile — `ShoppingListItem.tsx`, `RecipeIngredients.tsx`

| Eigenschaft | Heute | Künftig |
| :--- | :--- | :--- |
| Zeilenhöhe | `py-1.5` ≈ 30 px | **56 px** (72 px mit Bild) |
| Abstand Zeilen | `gap-1` (4 px) | `gap-2` (8 px) |
| Primärtext | `text-sm` | `text-base` (16 px) |
| Sekundärtext | `text-xs` | `text-sm` (14 px) |
| Mengenspalte | `w-16` + `border-r` | `w-20`, **kein** Trennstrich, Menge in `text-base font-bold` Smaragd |
| Sekundär-Aktion (kcal) | `px-2 py-1 text-xs` ≈ 24 px | `h-9` sichtbar + `.tap-48`, `text-sm` |

### 6.5 Chip & Filter — `SavedCatalog/CatalogFilters.tsx`

| Eigenschaft | Heute | Künftig |
| :--- | :--- | :--- |
| Höhe | `h-11` (44 px) | **`h-12`** (48 px) |
| Text | `text-xs` | `text-sm font-bold` (14 px) |
| Icon | `w-3.5` | `w-5 h-5` |
| Innenabstand | `px-3 gap-1.5` | `px-4 gap-2` |
| Radius | `rounded-xl` | `rounded-full` (Chips sind immer Pillen) |
| Zähler-Badge | `text-[11px] h-5` | `text-xs h-6 min-w-6` |
| Abstand Chips | `gap-2` | `gap-2` (unverändert) |

### 6.6 Such- & Eingabefeld

```
h-14                      /* 56px statt ~44px */
rounded-[20px]
px-4 pl-12                /* Platz für 24px-Icon */
text-base
bg-white dark:bg-gray-800/90
shadow-[var(--shadow-sb-card)]
focus:ring-2 focus:ring-emerald-500/25
```

Das Lösch-Icon rechts wird `w-12 h-12` (statt `w-9 h-9`).

### 6.7 Seiten-Header

Ein einziges Muster für alle Screens — heute erfindet jeder Screen seinen eigenen:

```
px-4 pt-[calc(16px + var(--app-sticky-top))] pb-4
Titel:      text-3xl font-bold tracking-tight
Untertitel: text-sm text-gray-500 mt-1
Back-Button: w-12 h-12 rounded-full  (statt heute w-9/w-10)
Aktionen rechts: w-12 h-12 rounded-full, Icon w-6
```

### 6.8 Bottom Sheet

```
rounded-t-[28px]          /* --radius-sb-lg */
p-5 pb-[calc(24px + var(--safe-area-inset-bottom))]
shadow-[var(--shadow-sb-sheet)]
Griff oben: w-10 h-1 rounded-full bg-gray-300  (heute teils fehlend)
Titel: text-[22px] font-bold, darunter 20px Abstand
Aktions-Buttons: h-13 (52px), rounded-[20px], font-bold
```

### 6.9 Sektions-Label

```
text-xs font-bold uppercase tracking-wider
text-gray-400 dark:text-gray-500
mb-3                      /* 12px Luft zum Inhalt, heute oft 4px */
```

---

## 7. 📱 Screen-für-Screen-Maßnahmen

### 7.1 Kochbuch — `SavedCatalog/CookbookHome.tsx`, `RecipeShelf.tsx`, `RecipePosterCard.tsx`, `CollectionTile.tsx`
* Screen-Titel „Mein Kochbuch" auf **Display 30 px**, Untertitel („7 Rezepte · Neueste") auf **Body-S 14 px** mit 4 px Abstand.
* Poster-Karten: Titel `text-base font-bold` (statt `text-sm`), max. 2 Zeilen; Meta-Zeile (Zeit, Plattform) `text-sm` mit 20-px-Icons.
* Regal-Abstand („Sammlungen" → „Sommer-Rezepte" → „Zuletzt gespeichert") auf **32 px** vereinheitlichen.
* „Alle 4 →"-Link auf 48 px Tapp-Höhe bringen und `text-sm font-bold` setzen.
* Sammlungs-Kacheln auf einheitliche Höhe (≥ 120 px) mit 16 px Innenabstand.

### 7.2 Rezept-Detail — `RecipeDetails/*`
* **Vorrangig:** `RecipeActionDock` ersetzt die Bottom-Nav, statt sich darüberzulegen (siehe §8). Das ist die sichtbarste Einzelverbesserung im ganzen Dokument.
* `RecipeMetaStrip` (Vorbereitung/Zubereitung/Portionen): Werte auf **Title 22 px**, Labels auf **Label 12 px**, Zellen-Höhe ≥ 88 px.
* `RecipeIngredients`: Zeilen 56 px, Mengenspalte ohne Trennstrich, kcal-Pille mit `.tap-48`, die beiden `border-t` durch Karten-Trennung ersetzen.
* `RecipeServingsStepper`: `+`/`−`-Buttons auf 48 × 48 px, Zahl auf `text-[22px]`.
* `RecipeInstructions`: Schritt-Text auf **Body 16 px** mit `leading-relaxed`; erledigte Schritte nur ausgrauen, **nicht** zusätzlich durchstreichen (Durchstreichen + Ausgrauen macht den Text unlesbar).
* `RecipeStickyBar`: Höhe 64 px, Titel `text-base`, Back-Button 48 px.

### 7.3 Kochmodus — `CookingMode.tsx`
* Schritt-Text auf **Display-Niveau** (26–30 px) — dieser Screen wird aus einem Meter Entfernung gelesen.
* Navigations-Buttons unten auf 56 px Höhe, volle Breite, 12 px Abstand.
* Zutaten-Pills des aktuellen Schritts auf `text-base`, Höhe 44 px.

### 7.4 Einkaufsliste — `ShoppingList/*`
* `ShoppingListItem`: 72 px Zeilenhöhe mit Produktbild (die Referenz macht genau das und gewinnt dadurch), Name `text-base font-bold`, Menge `text-sm`.
* Checkbox auf 28 × 28 px sichtbar in einem 48-px-Target.
* `ShoppingListGroup`-Header: Kategorie-Icon 28 px, Titel `text-lg font-bold`, 12 px Abstand darunter.
* Die untere „Ich brauche noch …"-Leiste ist eine schwebende Ebene — Bottom-Nav währenddessen ausblenden (§8).

### 7.5 Fortschritt — `ProgressView/*`
* Der bereits gute Screen: Tabs auf 48 px Höhe, Statistik-Kacheln behalten ihre Größe, Kachel-Labels von `text-xs` auf `text-sm`.
* Level-Karte: XP-Zahl auf 30 px, Fortschrittsbalken von 8 px auf 12 px Höhe.
* Galerie-Kacheln mit 12 px Abstand statt 8 px.

### 7.6 Profil — `SettingsView.tsx`
* Zeilentitel von `text-sm` auf **Title 22 px** oder mindestens **Body 16 px bold**, Untertitel `text-sm` — das ist der auffälligste Unterschied zur Referenz.
* Zeilenhöhe auf **80 px**, Icon-Medaillon 44 × 44 px mit 24-px-Icon.
* Gruppen-Überschriften („Einstellungen", „Account & Sonstiges") als Sektions-Label mit 32 px Abstand darüber.
* Dropdowns (Sprache, Temperatureinheit) auf 48 px Höhe.

### 7.7 Neues Rezept — `ExtractForm.tsx`
* Link-Eingabefeld auf 56 px, Einfüge-Icon 48 × 48 px.
* Segmented Switcher (Link/Foto) auf 56 px Gesamthöhe.
* Kontingent-Hinweis („Noch 23 von 30 …") von `text-xs` auf `text-sm`.
* Beispiel-Karten: Titel `text-base font-bold`, „Importieren →" als 48-px-Target.
* Akkordeons: Kopfzeile 56 px, Chevron 24 px.

---

## 8. 🧱 Ebenen- & Safe-Area-Regelwerk

### 8.1 Verbindliche z-Ordnung

| z-Index | Ebene |
| ---: | :--- |
| 10 | Sticky Screen-Header |
| 30 | Scroll-Fade unter schwebenden Leisten |
| **40** | **Genau eine** schwebende Bottom-Ebene: Nav **oder** Dock **oder** Bulk-Action-Bar |
| 60 | Bottom Sheets & Dialoge |
| 90 | Vollbild-Modi (Kochmodus, Bildergalerie) |
| 100 | Timer-Banner, OTA-Banner |

### 8.2 Die Kernregel: Dock **oder** Nav — nie beide

Heute regelt `App.tsx` das Ausblenden der Nav nur für drei Sonderfälle (Auswahlmodus, laufende Extraktion, Premium-Modal). Künftig gilt generell:

> Sobald eine kontextuelle Bottom-Leiste sichtbar ist (`RecipeActionDock`, `BulkActionBar`, Einkaufslisten-Eingabe), wird die Bottom-Nav ausgeblendet. Die kontextuelle Leiste rückt an ihre Position (`bottom-[calc(12px + safe-area)]`).

Umsetzungsskizze: ein `BottomLayerContext`, bei dem sich schwebende Leisten registrieren; `App.tsx` blendet die Nav aus, solange mindestens ein Eintrag aktiv ist. Damit entfällt auch das `bottom-[calc(7rem_+_…)]`-Stapeln in `RecipeActionDock.tsx` sowie der `translate-y-[calc(100%_+_8rem)]`-Workaround in `FloatingActionBar.tsx`.

### 8.3 Safe Areas

* Einzige Quelle der Wahrheit bleiben die Variablen aus `index.css`: `--safe-area-inset-top/right/bottom/left` und `--app-sticky-top`.
* Jede `fixed bottom-*`-Ebene rechnet `+ var(--safe-area-inset-bottom)` ein — ohne Ausnahme.
* Der Screen-Hintergrund reicht **immer** bis hinter die Gestensteuerung (`body` färbt, nicht der Container). Damit verschwindet der schwarze Reststreifen.
* Jeder Screen-Header rechnet `var(--app-sticky-top)` ein statt eigener Konstanten.

### 8.4 Statusleiste

Eine Regel für die gesamte App: **Statusleisten-Stil folgt dem Screen-Hintergrund, nicht dem Screen-Inhalt.** Screens mit Hero-Bild (Rezept-Detail) setzen beim Hochscrollen auf hell zurück, sobald der Header-Hintergrund deckend wird. Gesetzt wird das zentral über `@capacitor/status-bar` in `native.ts`, nicht pro Komponente.

---

## 9. 🗺️ Umsetzungs-Roadmap

| Welle | Ziel | Dateien | Aufwand | Risiko |
| :--- | :--- | :--- | :--- | :--- |
| **1 — Fundament** | Tokens, `.tap-48`, Schatten- & Radius-Variablen in `@theme` | `frontend/src/index.css` | klein | **keins** — rein additiv, keine sichtbare Änderung |
| **2 — Primitives** | Neues `frontend/src/components/ui/`: `Button`, `Card`, `ListRow`, `Chip`, `PageHeader`, `SectionLabel`, `IconButton` | neue Dateien | mittel | gering — noch niemand nutzt sie |
| **3 — Navigation & Ebenen** | Bottom-Nav skalieren, Indikator-Pille, `BottomLayerContext`, Dock-statt-Nav | `App.tsx`, `FloatingActionBar.tsx`, `RecipeDetails/RecipeActionDock.tsx`, `SavedCatalog/BulkActionBar.tsx` | mittel | **mittel** — betrifft jeden Screen, gründlich auf Gerät testen |
| **4 — Screens** | Migration Screen für Screen auf Primitives + Tokens, in dieser Reihenfolge: Profil → Einkaufsliste → Rezept-Detail → Kochbuch → Neu → Fortschritt | `SettingsView.tsx`, `ShoppingList/*`, `RecipeDetails/*`, `SavedCatalog/*`, `ExtractForm.tsx`, `ProgressView/*` | groß | gering pro Screen, gut in atomare Commits teilbar |

Reihenfolge in Welle 4 bewusst gewählt: **Profil zuerst**, weil dort der Abstand zur Referenz am größten und das Risiko am kleinsten ist — ein sichtbarer Gewinn, der das Muster für alle folgenden Screens festlegt.

---

## 10. ✅ Definition of Done

Jedes Kriterium ist mit einem Befehl aus dem Repo-Root prüfbar. Ziel ist jeweils **0** bzw. der genannte Wert.

| # | Kriterium | Prüfbefehl | Ziel |
| ---: | :--- | :--- | ---: |
| 1 | Keine Schriftgröße unter 12 px | `grep -rno "text-\[\(9\|10\|11\)px\]" frontend/src \| wc -l` | 0 |
| 2 | Keine Micro-Icons | `grep -rno "w-3 h-3\|w-3.5 h-3.5\|w-4 h-4" frontend/src/components \| wc -l` | 0 |
| 3 | Keine Trennlinien in Karten | `grep -rn "border-t \|border-b " frontend/src/components \| wc -l` | 0 |
| 4 | Keine 4-pt-Halbschritte | `grep -rno "\bp[xytblr]\?-[0-9]*\.5\b" frontend/src/components \| wc -l` | 0 |
| 5 | Höchstens 3 Schatten-Tokens | `grep -rho "shadow-\[[^]]*\]" frontend/src/components \| sort -u \| wc -l` | ≤ 3 |
| 6 | Höchstens 4 Radius-Werte | `grep -rho "rounded-[a-z0-9\[]*" frontend/src/components \| sort -u \| wc -l` | ≤ 4 |
| 7 | `text-xs` nur noch als Versalien-Label | manuelle Sichtprüfung der Treffer von `grep -rn "text-xs" frontend/src/components` | — |
| 8 | Nie zwei schwebende Bottom-Leisten gleichzeitig | Rezept-Detail, Einkaufsliste und Kochbuch-Auswahlmodus auf dem Gerät prüfen | — |
| 9 | Kein schwarzer Streifen unter der Navigation | Gerätetest hell + dunkel | — |
| 10 | Statusleiste auf allen sechs Haupt-Screens konsistent | Gerätetest hell + dunkel | — |

> [!TIP]
> Kriterien 1–6 eignen sich als Pre-Commit-Hook oder als Schritt in `npm run lint`. Ein Styleguide, der sich nicht prüfen lässt, verfällt — genau das ist mit `docs/styleguide.md` passiert.
