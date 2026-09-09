# 🏔️ Elevation Tokens & Border-Free Surfaces

> **Kernprinzip:** Die Benutzeroberfläche setzt strikt auf den **Clean Flat Style (`border-none`)**. Tiefe und Struktur entstehen durch gezielte Kontraste von Hintergrundflächen, mehrschichtige Umgebungs-Schatten (*Ambient + Key Light*) und subtile Highlights – niemals durch graue Trennlinien.

---

## 1. Mehrschichtige Schatten (Multi-Layer Shadows)

Standard-Tailwind `shadow-md` oder `shadow-lg` erzeugt oft einen schmutzigen, grauen Kranz. Echte Tiefenwahrnehmung entsteht durch zwei Lichtkomponenten:
1. **Key Light:** Schmaler, schärferer Schatten direkt unter dem Element.
2. **Ambient Light:** Breiter, weicher, transparenter Schleier für Raumtiefe.

### Tailwind v4 Shadow Tokens (Cookbook Standards)

```css
/* 1. Subtile Karten & Poster (Default Cards) */
/* Ersetzt: border border-gray-200 shadow-sm */
.elevation-card {
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.02),
    0 4px 12px rgba(0, 0, 0, 0.03);
}

/* 2. Interaktive Kacheln im Hover / Active Zustand */
.elevation-card-hover {
  box-shadow: 
    0 2px 6px rgba(0, 0, 0, 0.03),
    0 10px 24px rgba(0, 0, 0, 0.06);
}

/* 3. Schwebende Navigationsleisten & Floating Action Bars */
/* Ersetzt: border-t border-gray-200 */
.elevation-floating {
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.04),
    0 12px 32px rgba(0, 0, 0, 0.08);
}

/* 4. Bottom Sheets & Drawers */
/* Ersetzt: border-t border-gray-300 */
.elevation-sheet {
  box-shadow: 
    0 -4px 20px rgba(0, 0, 0, 0.06),
    0 -16px 48px rgba(0, 0, 0, 0.08);
}
```

---

## 2. Oberflächen-Hierarchie im Dark Mode (Warm Charcoal)

Im Dark Mode funktionieren dunkle Schatten kaum. Hier wird Tiefe durch **Helligkeitsabstufung (Luminanz)** und extrem feine Inset-Highlights erzeugt:

| Ebene | Token / Hex | Tailwind Klasse | Verwendung |
|---|---|---|---|
| **Ebene 0 (App Canvas)** | `#1a1917` | `bg-gray-950` | Hintergrund der gesamten App |
| **Ebene 1 (Karten / Panels)** | `#262624` | `bg-gray-900` | Rezeptkarten, Formulare, Container |
| **Ebene 2 (Inputs / Sub-Pills)** | `#363531` | `bg-gray-800` | Eingabefelder, Checkbox-Hintergründe |
| **Ebene 3 (Popovers / Modals)** | `#403f3a` | `bg-gray-700` | Tooltips, Menüs, schwebende Badges |

### Subtiles Key-Light Highlight im Dark Mode
Statt `border border-white/10` nutzen wir einen extrem weichen oberen Lichtsaum:
```css
/* Erzeugt eine edle, feine Lichtkante an der Oberseite */
.dark-key-light {
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
}
```

---

## 3. Die „Border-None“-Checkliste

Wenn du versuchst bist, eine `border`-Klasse zu schreiben, frage dich:
1. **Warum will ich hier eine Linie ziehen?**  
   * *Antwort A: Um zwei Sektionen zu trennen.* -> Nutze stattdessen `space-y-6` oder `space-y-8` Whitespace.
   * *Antwort B: Um eine Karte vom Hintergrund abzuheben.* -> Nutze den Flächenkontrast (`bg-white` auf `bg-gray-50` bzw. `bg-gray-900` auf `bg-gray-950`) + `elevation-card`.
   * *Antwort C: Um ein Formularfeld sichtbar zu machen.* -> Nutze eine flache Inset-Fläche (`bg-gray-100 dark:bg-gray-800/80 rounded-xl px-4 py-3`).

---

## 4. Fokus- & Auswahl-Zustände (Focus Rings & Active States)

* **Kein harter 2px Outline-Rahmen:**
```tsx
// FALSCH (AI-Slop):
<button className="border border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-300">

// RICHTIG (Clean Flat Craft):
<button className="border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 transition-all">
```
* **Ausgewählte Filter-Pills:**
  * Inaktiv: `bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300`
  * Aktiv: `bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold` (weicher Ton-in-Ton-Kontrast statt greller Kontur).
