---
trigger: always_on
---

# 🧼 TypeScript & React Clean Code Rules

> Siehe ausführlichen Leitfaden: [`docs/clean-code.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/clean-code.md)

1. **Dateigrößen & Modularisierung:**
   - **Soft Limit:** Max. 150–200 Zeilen pro Datei.
   - **Hard Limit:** Max. 300 Zeilen. Dateien > 300 Zeilen MÜSSEN in Subkomponenten, Custom Hooks oder Utility-Dateien aufgeteilt werden.
   - **Feature-Ordner:** Komplexe Komponenten in `components/<Feature>/` mit `index.tsx`, Subkomponenten, `use<Feature>.ts` und `types.ts` strukturieren.

2. **React Komponenten & State:**
   - **Separation of Concerns:** UI-Komponenten bleiben deklarativ und schlank. Komplexe State- und Effekt-Logik gehört in Custom Hooks (`use<Feature>.ts`).
   - **Subkomponenten:** JSX-Blöcke > 30–40 Zeilen oder wiederverwendbare UI-Elemente in eigene Subkomponenten auslagern. Modals/Dialoge/Drawers NIE inline rendern.
   - **Early Returns:** Keine tief verschachtelten Ternaries. Lade- und Fehlerzustände mit Early Returns / Guard Clauses abfangen.
   - **State Colocation:** State so nah wie möglich an der Verwendung halten. Keine abgeleiteten States via `useEffect` berechnen.

3. **TypeScript & Typensicherheit:**
   - **Kein `any`:** Strikte Typisierung überall. Verwende `unknown` + Type Narrowing oder Generics.
   - **Props:** Jede Komponente hat ein explizites `interface <Name>Props`.
   - **Defensives Coden:** Nutze Optional Chaining (`?.`) und Nullish Coalescing (`??`) statt `||`. Kein unbedachtes `!`.

4. **Projekt-Standards:**
   - **Design-System:** Clean Flat Style aus [`docs/styleguide.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/styleguide.md) einhalten (`border-none`, weiche Schatten, `rounded-2xl`/`3xl`).
   - **I18n:** Keine hardcodierten Strings im JSX – immer `useI18n()` / `i18n.ts` nutzen.
   - **Atomic Commits:** Nach jedem abgeschlossenen logischen Schritt atomar committen.

5. **Anti-Fragility & Deterministischer Datenfluss:**
   - **Keine Keyword-/String-Heuristiken:** Niemals `name.includes('...')` nutzen, um Daten, Icons, Farben oder Kategorien im UI oder Backend zu erraten.
   - **Strikter Datenfluss:** Kontext immer sauber über Props (z. B. `category={group.name}`), Context oder typisierte Taxonomien (`IngredientCategory`, `legacyCategoryMap`) bereitstellen.
