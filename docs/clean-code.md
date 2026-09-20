# 🧼 TypeScript & React Clean Code Guidelines

> **Status & Verbindlichkeit:** **MANDATORY FOR ALL AGENTS & DEVELOPERS**  
> Jeder Agent und Entwickler muss sich bei allen Implementierungen, Refactorings und Erweiterungen strikt an diese Richtlinien halten.

---

## 1. 📏 Dateigrößen, Grenzen & Modularisierung (The Boundary Rules)

Große monolithische Dateien ("God Files" oder "God Components") sind die Hauptursache für Bugs, schlechte Wartbarkeit und Merge-Konflikte. Es gelten daher feste Grenzwerte:

### 1.1 Feste Zeilen-Grenzwerte
* **Zielgröße (Sweet Spot):** **50 bis 150 Zeilen** pro Datei/Komponente.
* **Soft Limit:** **200 Zeilen.** Ab hier sollte aktiv geprüft werden, ob Subkomponenten oder Hooks extrahiert werden können.
* **Hard Limit:** **300 Zeilen.** Dateien mit mehr als 300 Zeilen sind **verboten** und **MÜSSEN** zwingend refaktoriert und modularisiert werden.

### 1.2 Single Responsibility Principle (SRP)
* Jede Datei und jede Komponente hat **genau eine einzige, klar abgegrenzte Aufgabe**.
* UI-Rendering (JSX), State-Management, Business-Logik, Netzwerk-/API-Aufrufe und Hilfsfunktionen dürfen **niemals** in einer einzigen Komponente vermischt werden.

### 1.3 Feature-Ordnerstruktur (Folder-by-Feature Pattern)
Sobald eine Komponente komplexer wird oder Sub-Elemente benötigt, wird sie in ein eigenes Feature-Verzeichnis umgewandelt:

```
src/components/RecipeDetails/
├── index.tsx                  # Schlanker Einstiegspunkt / Re-Export
├── RecipeDetailsView.tsx      # Hauptansicht / Orchestrator (< 150 Zeilen)
├── RecipeHeader.tsx           # Sub-Komponente: Bild, Titel, Autor
├── RecipeIngredientsList.tsx  # Sub-Komponente: Zutatenliste & Portionsrechner
├── RecipeInstructionsList.tsx # Sub-Komponente: Zubereitungsschritte & Timer-Trigger
├── RecipeNutritionCard.tsx    # Sub-Komponente: Nährwerte-Grid
├── useRecipeDetails.ts        # Custom Hook: State, Scaling, Modals
└── types.ts                   # Feature-spezifische Interfaces & Props
```

### 1.4 Refactoring-Trigger (Wann MUSS extrahiert werden?)
1. **Mehr als 2–3 `useState` / `useEffect` Hooks:** Extrahiere die gesamte State- und Effekt-Logik in einen dedizierten Custom Hook (`use<FeatureName>.ts`).
2. **JSX-Blöcke > 30–40 Zeilen:** Ein langer JSX-Block (z. B. eine Tab-Ansicht, eine Card, eine List-Row, ein Action-Sheet) gehört in eine separate Subkomponente.
3. **Modals, Dialoge & Drawers:** Dürfen **niemals** inline in der Parent-Komponente gerendert werden, sondern müssen als eigenständige Komponenten (`<FeatureName>Modal.tsx` oder `<FeatureName>Drawer.tsx`) existieren.
4. **Hilfs- & Berechnungsfunktionen:** Daten-Transformationen, String-Formatierungen oder Berechnungen gehören in `src/utils/` oder eine lokale `helpers.ts`.

---

## 2. ⚛️ React Best Practices & Komponenten-Architektur

### 2.1 Container & Presentational Separation (Custom Hooks)
Halte React-Komponenten schlank, deklarativ und visuell. Die Komponente beschreibt *wie etwas aussieht*, der Custom Hook bestimmt *wie es funktioniert*.

```tsx
// ❌ SCHLECHT: 300 Zeilen Vermischung von Fetching, State, Timern und JSX
export function RecipeView({ id }: { id: string }) {
  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(4);
  const [timer, setTimer] = useState(0);
  useEffect(() => { /* fetch logic */ }, [id]);
  const handleScale = () => { /* math */ };
  return <div>{/* 200 lines JSX */}</div>;
}

// ✅ GUT: Trennung in Custom Hook und deklarative Subkomponenten
export function RecipeView({ id }: { id: string }) {
  const { recipe, servings, updateServings, isLoading } = useRecipeDetails(id);

  if (isLoading) return <RecipeSkeleton />;
  if (!recipe) return <RecipeNotFound />;

  return (
    <div className="space-y-6">
      <RecipeHeader recipe={recipe} />
      <RecipeIngredientsList 
        ingredients={recipe.ingredients} 
        servings={servings} 
        onServingsChange={updateServings} 
      />
      <RecipeInstructionsList steps={recipe.instructions} />
    </div>
  );
}
```

### 2.2 Keine Monster-Ternaries & Guard Clauses (Early Returns)
* Vermeide verschachtelte ternäre Operatoren (`condition ? (sub ? <A/> : <B/>) : <C/>`).
* Verwende **Early Returns** (Bouncer Pattern), um Lade-, Fehler- oder Leerzustände frühzeitig abzuhandeln.

```tsx
// ❌ SCHLECHT: Tiefe Verschachtelung
return (
  <div>
    {isLoading ? (
      <Spinner />
    ) : error ? (
      <ErrorView msg={error} />
    ) : items.length === 0 ? (
      <EmptyState />
    ) : (
      <ItemList items={items} />
    )}
  </div>
);

// ✅ GUT: Early Returns & flache Hierarchie
if (isLoading) return <Spinner />;
if (error) return <ErrorView message={error} />;
if (items.length === 0) return <EmptyState />;

return <ItemList items={items} />;
```

### 2.3 Sauberes Props-Design & Benennungskonventionen
* Jede Komponente besitzt ein **explizites TypeScript Interface** für ihre Props (`interface <ComponentName>Props`).
* Props direkt im Funktionskopf destructuren.
* **Event-Handler-Konvention:**
  * Intern implementierte Handler: `handle<Action>` (z.B. `handleSave`, `handleDeleteRecipe`).
  * Übergebene Callback-Props: `on<Action>` (z.B. `onSave`, `onDelete`, `onServingsChange`).

```tsx
interface RecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (recipe: Recipe) => void;
}

export function RecipeCard({
  recipe,
  isFavorite = false,
  onToggleFavorite,
  onSelect,
}: RecipeCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(recipe.id);
  };

  return (
    <div onClick={() => onSelect(recipe)}>
      {/* Card Content */}
    </div>
  );
}
```

### 2.4 State Colocation & Render-Optimierung
* **State Colocation:** Halte State so nah wie möglich am Ort der Verwendung ("Colocate state where it belongs"). Hebe State nur dann in Parent-Komponenten oder Context, wenn er von mehreren Komponenten benötigt wird.
* **Gezielte Memoization:**
  * Nutze `useMemo` für spürbar rechenintensive Operationen (z. B. Filter- und Sortier-Pipelines über große Arrays).
  * Nutze `useCallback` für Event-Handler, die an memoized Child-Komponenten (`React.memo`) übergeben werden oder in `useEffect`-Dependency-Arrays vorkommen.
  * Vermeide blinde Über-Memoization von trivialen Primitiven.
* **Keine unnötigen `useEffect`s:**
  * Berechne abgeleitete Daten (Derived State) **direkt im Render-Body** oder via `useMemo` – niemals per `useEffect` mit zusätzlichem `setState`!

### 2.5 Deterministischer Datenfluss & Verbot von String-Heuristiken (Anti-Fragility)
* **Keine Keyword-Listen / Substring-Prüfungen:** Schreibe **niemals** sprachspezifische Keyword-Prüfungen (z. B. `if (name.includes('käse') || name.includes('hähnchen'))`), um im UI oder Backend Attribute wie Kategorien, Icons oder Farben zu erraten.
* **Warum?** Solche Heuristiken sind extrem fragil, brechen sofort bei Synonymen, Markennamen (*„Philadelphia“*), Tippfehlern oder Mehrsprachigkeit (DE/EN) und verbergen strukturelle Datenfluss-Lücken.
* **Der saubere Weg:**
  1. **Sauberer Datenfluss (Prop-Passing):** Reiche Kontextinformationen explizit aus Elternelementen durch (z. B. `<IngredientNutritionSheet category={group.name} />`).
  2. **Typisierte Taxonomien:** Verwende zentrale Taxonomie-Lookups (z. B. `IngredientCategory` und `legacyCategoryMap`) für strukturierte Schlüssel.
  3. **Upstream Anreicherung:** Wenn ein Attribut auf einem Child-Objekt fehlt, reichere es vorab im Datenmodell an, statt es lokal im View-Layer zu erraten.

```tsx
// ❌ SCHLECHT: Fragile sprachabhängige Substring-Heuristik im UI-Layer
function getIcon(name: string) {
  if (name.includes('käse') || name.includes('milch')) return '/icons/dairy.webp';
  if (name.includes('hähnchen') || name.includes('fleisch')) return '/icons/meat.webp';
  return '/icons/other.webp';
}

// ✅ GUT: Deterministischer Lookup über saubere Kategorie-Taxonomie
function getCategoryIcon(category: string) {
  const mapped = legacyCategoryMap[category.toLowerCase()] ?? category;
  return categoryIconFiles[mapped] ?? '/category-icons/other.webp';
}
```

---

## 3. 🛡️ Strikte TypeScript-Regeln & Typensicherheit

### 3.1 Zero-Tolerance Policy für `any`
* `any` ist im gesamten Projekt **strengstens verboten**.
* Wenn ein Typ zur Compile-Zeit nicht bekannt ist, nutze `unknown` zusammen mit Type Narrowing / Type Guards.
* Nutze TypeScript Generics für flexible, typsichere Utilities und Hooks.

### 3.2 Union Types statt TypeScript `enum`
* Bevorzuge String Literal Union Types oder `as const` Maps gegenüber klassischen TypeScript `enum`s.
```tsx
// ❌ Vermeiden:
enum ExtractionStatus { PENDING, RUNNING, DONE, FAILED }

// ✅ Bevorzugt:
export type ExtractionStatus = 'pending' | 'running' | 'done' | 'failed';
```

### 3.3 Nullish Safety & Defensives Coden
* Verwende **Optional Chaining (`?.`)** und den **Nullish Coalescing Operator (`??`)** anstelle des logischen ODER (`||`), um unerwünschte Nebeneffekte bei `0`, `false` oder `""` zu verhindern.
* Vermeide den Non-Null Assertion Operator (`!`). Nutze stattdessen Fallback-Werte oder explizite Runtime-Checks.

```tsx
// ❌ Riskant:
const title = recipe!.title || 'Unbenannt';

// ✅ Sicher:
const title = recipe?.title ?? 'Unbenannt';
```

### 3.4 Zentrale vs. Lokale Typen
* **Zentrale Domain-Typen:** Entitäten, die backend-übergreifend oder app-weit genutzt werden (`Recipe`, `User`, `Ingredient`, `CookEvent`), gehören in `src/types/` bzw. `src/types.ts`.
* **Lokale Typen:** UI-spezifische Props, Filter-States oder Hilfstypen gehören direkt in die Datei der Komponente oder in das `types.ts` des Feature-Ordners.

---

## 4. 🧹 Allgemeine Clean Code Prinzipien

### 4.1 Selbsterklärender Code & Benennung
* Namen müssen den Zweck und die Absicht klar beschreiben (*Intention-Revealing Names*).
* **Booleans:** Verwende prägnante Präfixe: `is...`, `has...`, `should...`, `can...` (z. B. `isSubmitting`, `hasImages`, `canEdit`).
* **Funktionen:** Verwende Verben mit klarem Gegenstand (z. B. `calculatePortionNutrition()`, `validateInstagramUrl()`, `syncOfflineQueue()`).
* Vermeide kryptische Abkürzungen (`r`, `el`, `temp`, `data2`, `btnClick`).

### 4.2 KISS (Keep It Simple, Stupid) & YAGNI (You Aren't Gonna Need It)
* Schreibe nur Code, der für die aktuellen Anforderungen wirklich gebraucht wird.
* Baue keine spekulativen Abstraktionen oder "Universal-Frameworks" für Anforderungen, die vielleicht in der Zukunft existieren könnten.

### 4.3 DRY (Don't Repeat Yourself) mit Augenmaß
* Duplizierte Business-Logik, Regex-Validierungen und API-Transformationen gehören immer in wiederverwendbare Helper/Module.
* **Vorsicht bei UI-Duplizierung:** "Duplication is far cheaper than the wrong abstraction." Wenn zwei UI-Elemente nur optisch ähnlich sind, aber semantisch unterschiedliche Aufgaben erfüllen, erzwinge keine gekoppelte Mega-Komponente.

### 4.4 Dead Code, Logging & Obsoleszenz
* Ungenutzter Code, auskommentierte Blöcke (`// const old...`) und ungenutzte Imports sind vor dem Commit restlos zu entfernen.
* Debug-Logs (`console.log`) dürfen nicht in Produktionscode verbleiben.
* Bei bewussten Architekturwechseln oder ersetztem Code: Dokumentiere den Hintergrund in [`docs/OBSOLETE.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/OBSOLETE.md).

---

## 5. 🎯 Snagbite Cookbook Spezifika

### 5.1 Design-System & Tailwind CSS v4
* Alle UI-Elemente müssen dem **Clean Flat Style** aus [`docs/styleguide.md`](file:///c:/Users/lucas/source/repos/cookbook/docs/styleguide.md) folgen:
  * **Keine Ränder (`border-none`):** Trennung erfolgt über Weißraum, Hintergrundtöne (`bg-gray-50`, `bg-gray-900`) und minimale Schatten (`shadow-[0_2px_6px_rgba(0,0,0,0.03)]`).
  * **Radien:** Durchgängig `rounded-2xl` oder `rounded-3xl` für Karten, Modals und Action-Buttons.
  * **Dark Mode:** Jede neue UI-Komponente muss zwingend `dark:`-Varianten unterstützen.

### 5.2 Internationalisierung (I18n)
* **Keine hardcodierten Text-Strings** (weder deutsch noch englisch) direkt im JSX.
* Alle Benutzertexte müssen über den zentralen Übersetzungskatalog `src/i18n.ts` via `useI18n()` bezogen werden.

### 5.3 Error Codes & User Feedback
* Verwende standardisierte Fehlercodes aus `src/errorCodes.ts`.
* Fehlerzustände werden visuell ansprechend über das `ErrorBanner` oder systemweite Toasts dargestellt – niemals über native `alert()`-Aufrufe.

---

## 📋 Clean Code Checkliste vor jedem Commit

- [ ] **Dateigröße:** Hat die Datei weniger als 200 Zeilen (bzw. absolut < 300)?
- [ ] **SRP:** Erfüllt die Komponente/Datei genau eine einzige Aufgabe?
- [ ] **Hooks:** Wurde komplexe State-/Effekt-Logik in einen Custom Hook ausgelagert?
- [ ] **Subkomponenten:** Wurden große JSX-Blöcke (> 40 Zeilen) oder Modals in Subkomponenten aufgeteilt?
- [ ] **TypeScript:** Sind alle Props, States und Return-Typen strikt typisiert (0x `any`)?
- [ ] **Early Returns:** Werden Lade-/Fehlerzustände frühzeitig abgefangen?
- [ ] **Design:** Wurde der Clean Flat Style (`docs/styleguide.md`) ohne harte Border eingehalten?
- [ ] **I18n:** Sind alle Strings in `i18n.ts` ausgelagert?
- [ ] **Dead Code:** Wurden Debug-Logs, ungenutzte Imports und Kommentare bereinigt?
