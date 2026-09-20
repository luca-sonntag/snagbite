# 🍳 Food & Recipe UI Layouts (Anti-Slop Craft)

> **Kernprinzip:** Eine Koch- und Rezept-App muss **appetitlich, ruhig, luftig und auf Distanz in der Küche lesbar** sein. Vermeide das „SaaS-Card-Kit“ (alles in winzige graue Kacheln gepackt).

---

## 1. Zutaten-Liste (Ingredients List)

### ❌ AI-Slop Anti-Pattern (Vermeiden!)
```tsx
// SCHLECHT: Verschachtelte Boxen mit harten Rahmen und winzigem Text
<div className="border border-gray-200 rounded-xl p-4 space-y-2">
  <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500">ZUTATEN</h3>
  {ingredients.map(ing => (
    <div key={ing.name} className="border border-gray-100 bg-gray-50 rounded-lg p-2.5 flex justify-between">
      <span className="font-semibold text-xs">{ing.name}</span>
      <span className="text-xs text-gray-500">{ing.amount} {ing.unit}</span>
    </div>
  ))}
</div>
```
* **Probleme:** Kachel-in-Kachel, unruhiges Gitter, winzige Schriftgrößen (`text-xs`), krampfhaftes All-Caps-Eyebrow.

---

### ✅ Craft & Human Solution (Verwenden!)
```tsx
// GUT: Offener Whitespace, Tabular Numbers, großzügige Touch-Targets, taktile Checkboxen
<section className="space-y-4">
  <div className="flex items-baseline justify-between">
    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
      Zutaten
    </h2>
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
      für {portions} Portionen
    </span>
  </div>

  <div className="divide-y-0 space-y-1">
    {ingredients.map(ing => {
      const isChecked = checkedItems.has(ing.id);
      return (
        <label
          key={ing.id}
          className={`
            group flex items-center gap-3.5 px-3 py-3 rounded-2xl cursor-pointer
            transition-all duration-150 active:scale-[0.98] select-none
            ${isChecked 
              ? 'bg-gray-100/60 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-900/60 text-gray-800 dark:text-gray-100'}
          `}
        >
          {/* Fühlbare Checkbox mit Touch-Fläche */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleItem(ing.id)}
            className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-0 focus:ring-offset-0 transition-all border-none bg-gray-200/80 dark:bg-gray-700"
          />

          {/* Mengenangabe: Tabellarisch & optisch stabil */}
          <span className="min-w-[65px] font-bold text-sm tabular-nums text-gray-900 dark:text-white text-right">
            {ing.amount ? `${ing.amount} ${ing.unit || ''}` : '—'}
          </span>

          {/* Name der Zutat */}
          <span className={`text-sm font-medium leading-snug flex-1 ${isChecked ? 'line-through' : ''}`}>
            {ing.name}
          </span>
        </label>
      );
    })}
  </div>
</section>
```
* **Vorteile:** Keine überflüssigen Kastenrahmen. Der Hintergrund reagiert beim Abhaken mit sanfter Dämpfung. Tabellarische Zahlen halten den Blick ruhig.

---

## 2. Zubereitungsschritte (Cooking Steps)

### ❌ AI-Slop Anti-Pattern
```tsx
// SCHLECHT: Deko-Nummern "01", grauer Rahmen, künstlicher Pfeil-Button
<div className="border border-gray-200 rounded-2xl p-4 mb-3">
  <div className="text-emerald-500 font-mono text-xs">STEP 01</div>
  <p className="text-xs text-gray-700 mt-1">Zwiebeln fein würfeln und in Öl anbraten.</p>
  <button className="text-xs font-bold text-emerald-600 mt-2">TIMER STARTEN →</button>
</div>
```

---

### ✅ Craft & Human Solution
```tsx
// GUT: Natürlicher Lesefluss, großzügiger Zeilenabstand, organisch integrierter Timer
<div className="space-y-6">
  {steps.map((step, idx) => (
    <article key={idx} className="relative flex gap-4 items-start group">
      {/* Schritt-Nummerierung: Markant, organisch, ohne "01"-Monospace-Gimmick */}
      <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center mt-0.5">
        {idx + 1}
      </span>

      <div className="space-y-3 flex-1 min-w-0">
        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
          {step.instruction}
        </p>

        {/* Wenn ein Timer vorhanden ist: Integrierter Soft-Button ohne Kasten-Overkill */}
        {step.timerMinutes && (
          <button
            onClick={() => startStepTimer(step.timerMinutes)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold active:scale-95 transition-all"
          >
            <ClockIcon className="w-4 h-4" />
            <span>{step.timerMinutes} Min. Timer starten</span>
          </button>
        )}
      </div>
    </article>
  ))}
</div>
```

---

## 3. Makro- & Nährwert-Leiste (Nutrition Bar)

### ❌ AI-Slop Anti-Pattern
```tsx
// SCHLECHT: 4 identische quadratische Kacheln mit ALL-CAPS Labels und grauen Rändern
<div className="grid grid-cols-4 gap-2">
  <div className="border border-gray-200 p-2 rounded text-center">
    <div className="text-[10px] uppercase text-gray-400">KALORIEN</div>
    <div className="font-bold text-sm">540</div>
  </div>
  {/* Wiederholt für Protein, Kohlenhydrate, Fett */}
</div>
```

---

### ✅ Craft & Human Solution
```tsx
// GUT: Einheitliche, ruhige Nährwert-Skala mit proportionalem Makro-Balken
<div className="bg-gray-100/70 dark:bg-gray-900/60 rounded-2xl p-3.5 space-y-2.5">
  <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
    <span>Nährwerte pro Portion</span>
    <span className="font-bold text-gray-900 dark:text-white text-sm tabular-nums">
      {calories} kcal
    </span>
  </div>

  {/* Proportionaler, stufenloser Makro-Verteilungsbalken */}
  <div className="h-2 w-full rounded-full bg-gray-200/80 dark:bg-gray-800 flex overflow-hidden">
    <div style={{ width: `${proteinPct}%` }} className="bg-emerald-500" title="Protein" />
    <div style={{ width: `${carbsPct}%` }} className="bg-amber-500" title="Kohlenhydrate" />
    <div style={{ width: `${fatPct}%` }} className="bg-rose-500" title="Fett" />
  </div>

  {/* Dezente Makro-Legende */}
  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 tabular-nums">
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      {protein}g Protein
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      {carbs}g Carbs
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-rose-500" />
      {fat}g Fett
    </span>
  </div>
</div>
```

---

## 4. Rezept-Karten im Katalog (`RecipePosterCard`)

* **Bild zuerst:** Food lebt von Ästhetik. Hochwertige Bilder nicht durch 5 verschiedene Badges überdecken.
* **Maximal 1 akzentuiertes Badge:** Nur das Wesentliche (z. B. Zubereitungszeit oder Vegan-Tag).
* **Metadaten:** Keine `·` Punkte-Batterien. Besser: `25 Min. • 4 Portionen` als dezenter Fließtext mit klaren Abständen.
