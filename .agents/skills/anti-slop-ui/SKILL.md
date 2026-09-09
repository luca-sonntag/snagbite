---
name: anti-slop-ui
description: "Eliminate AI slop, generic templates, and robotic patterns in UI/UX. Enforces human craft, clean flat aesthetics, tactile mobile feedback, and typography hierarchy. Use when building or refactoring UI components, pages, forms, or screens to ensure high design quality and avoid cookie-cutter AI aesthetics."
metadata:
  author: cookbook-team
  version: "1.0.0"
---

# 🛡️ Anti-Slop UI & Craft Engineering Skill

> **Mission:** Vernichte generischen „KI-Einheitsbrei“ (AI Slop) in der Benutzeroberfläche. Sorge für handwerklich exzellente, lebendige und appetitliche Interfaces mit menschlicher Handschrift, klarer typografischer Hierarchie und haptischem Mobile-Gefühl.
> 
> Basiert auf den Prinzipien führender Design-Engineers: `anthropics/frontend-design`, `leonxlnx/taste-skill`, `ibelick/baseline-ui`, `pbakaus/impeccable`, `emilkowalski/apple-design` & `jakubkrehel/better-ui`.

---

## 🚫 Die 7 Todsünden des „AI Slop“ (Streng verboten)

Die folgenden Muster sind die verräterischsten Erkennungsmerkmale von KI-generiertem UI-Code und dürfen **niemals** verwendet werden:

| # | KI-Slop Muster | Warum es schlecht ist | Bessere menschliche Lösung |
|---|---|---|---|
| 1 | **Cards-in-Cards-in-Cards** | Jedes Datenelement wird in eine eigene Box mit Rand, Padding und Schatten gepackt. Das Interface wirkt erstickt und klaustrophobisch. | **Inhalte atmen lassen:** Trennung durch gezielten Whitespace (8/16/24px Rhythmus), typografische Anker oder sanfte Hintergründe statt Schachteln. |
| 2 | **Template-Chrome & Eyebrow-Wahn** | Jede Überschrift bekommt ein tracked-out `UPPERCASE` Mini-Label darüber, Texte werden mit `·` getrennt, an jeden Button wird ein `->` geklebt. | **Echtes Text-Design:** Satz-Schreibweise (Sentence case), prägnante Verben ("Rezept speichern" statt "SPEICHERN ->"), keine sinnlose Dekorations-Schlagzeilen. |
| 3 | **Graue Trennlinien-Gitter (`border-gray-200`, `border-white/10`)** | Linien überall, um Elemente voneinander abzugrenzen. Wirkt wie eine Excel-Tabelle aus den 2000ern. | **Clean Flat Style (`border-none`):** Flächenkontraste (`bg-gray-50` auf `bg-white`, `bg-gray-900` auf `bg-gray-950`) und weiche Schattenebenen nutzen. |
| 4 | **Künstliche Nummerierungs-Marker** | Listen werden automatisch mit `01 / 02 / 03` dekoriert, selbst wenn es gar keine strikte Zeitleiste ist. | **Natürliche Listen:** Aufzählungspunkte oder einfache Absätze verwenden, Zahlen nur wenn die Reihenfolge unabdingbar ist (z. B. Kochschritte). |
| 5 | **Matschige Einheitsschatten & AI-Gradients** | Standard-Tailwind `shadow-md` oder übertriebene violette/blaue Mesh-Gradients. | **Ambient Elevation:** Schattierungen passend zum Hintergrund leicht tönen (`shadow-[0_2px_8px_rgba(0,0,0,0.04)]`), Lichtquellen konsistent halten. |
| 6 | **Typografischer Einheitsbrei** | Alles ist gleich gewichtet (`font-semibold` auf allen Elementen), kein mutiger Kontrast zwischen Hero-Display und Lesetext. | **Mutige Hierarchie:** Große, ausdrucksstarke Überschriften (`Outfit font-bold`), ruhige, hochlesbare Fließtexte (`text-gray-600 dark:text-gray-300`). |
| 7 | **Roboterhafte Transitions & Deko-Spam** | Jedes Icon zappelt bei Hover, Fade-and-Slide-Up auf absolut jeder Kachel beim Scrollen. | **Orchestrierte Zurückhaltung:** Nur sinnstiftende Reaktionen auf Benutzerinteraktionen (Press-Feedback `active:scale-95`, Spring-Sheets). |

---

## 🧭 Die 4 Kernprinzipien für herausragendes UI-Craft

### 1. *„Spend your boldness in one place“* (Anthropic Frontend Design)
* Ein Screen hat **einen Helden**. In einer Food- & Rezept-App ist das fast immer das appetitliche Food-Bild, die Koch-Schrittabfolge oder der Timer im Fokus.
* Alles andere drumherum ordnet sich diszipliniert unter. Wenn Buttons, Badges, Nährwertbalken und Tags alle gleichzeitig um Aufmerksamkeit schreien, verliert der Nutzer den Überblick.

### 2. Appetitliche Ruhe & Lesbarkeit in der Küche
* Diese App wird benutzt, während jemand kocht (oft mit mehligen Fingern, Handy auf der Arbeitsplatte in 50cm Abstand).
* **Große Touch-Targets:** Buttons und Checkboxen mindestens $44\times 44\text{px}$.
* **Maximale Scanbarkeit:** Zutatenmengen und Einheiten optisch sofort erfassbar (z. B. fettgedruckte Mengen links, Zutat rechts).

### 3. Apple-Design-Physik (Mobile Native Feeling)
* **Bottom Sheets & Drawers:** Müssen flüssig der Fingerbewegung folgen, sanfte Trägheit besitzen und per Drag nach unten geschlossen werden können (`Swipe-to-Dismiss`).
* **Haptisches & visuelles Feedback:** Jede primäre Aktion gibt sofortige Rückmeldung (Micro-Scale `active:scale-[0.97]`, sanfte Opazitätsänderung, Capacitor Haptics).

### 4. Gestochen scharfe Typografie (Outfit + HeroUI v3)
* Keine willkürlichen Schriftgrößen. Halte dich strikt an die 4 Ebenen:
  1. **Page Title / Hero:** `text-2xl` bis `text-3xl`, `font-bold tracking-tight text-gray-900 dark:text-white`
  2. **Section Header:** `text-base` bis `text-lg`, `font-bold text-gray-900 dark:text-white`
  3. **Body / Steps:** `text-sm` bis `text-base`, `font-normal leading-relaxed text-gray-700 dark:text-gray-200`
  4. **Meta / Units:** `text-xs`, `font-medium text-gray-500 dark:text-gray-400`

---

## 🛠️ Der „De-Slop“-Prüfkatalog für Code-Reviews

Bevor eine UI-Komponente als fertig betrachtet wird, führe diesen 5-Punkte-Check durch:

1. [ ] **Schachtel-Test:** Gibt es mehr als zwei verschachtelte Card-Container? Wenn ja, entferne die inneren Container und nutze Whitespace.
2. [ ] **Linien-Test:** Gibt es `border` oder `divide-y` Klassen? Prüfe, ob die Trennung stattdessen über Abstände (`space-y-4` / `gap-3`) oder feine Background-Nuancen gelöst werden kann.
3. [ ] **Badge-Test:** Dient dieses Badge wirklich einer kritischen Nutzerentscheidung, oder ist es nur Füllmaterial? Überflüssige Badges gnadenlos löschen.
4. [ ] **Wording-Test:** Sind Buttons in natürlicher Sprache formuliert (z. B. "Rezept kochen" statt "JETZT STARTEN 🚀")?
5. [ ] **Mobile-Touch-Test:** Kann ein Daumen das Ziel mühelos treffen, ohne versehentlich ein Nachbarelement zu aktivieren?

---

## 🔗 Referenzen & Verknüpfungen
* **Design-Tokens & Styleguide:** [`docs/styleguide.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/styleguide.md)
* **Mobile Guidelines:** [`docs/mobile-ux-rules.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/mobile-ux-rules.md)
* **HeroUI v3 Best Practices:** [`.agents/skills/heroui-react/SKILL.md`](file:///c:/Users/lucas/source/repos/cookbook/.agents/skills/heroui-react/SKILL.md)
* **Erweiterte Spezialregeln (on-demand via MCP):**
  * `emilkowalski/apple-design` (komplexe Gesten & Springs)
  * `jakubkrehel/better-colors` (OKLCH-Farbskalen & Dark-Mode Nuancen)
  * `pbakaus/distill` (rigorose Informationsverdichtung)
