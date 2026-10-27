const SHOPPING_PREVIEW_GROUPS = [
  {
    name: 'Obst & Gemüse',
    barColor: 'bg-emerald-500',
    items: [
      { amount: '2 Stk.', name: 'Bio-Zitronen' },
      { amount: '1 Bund', name: 'Glatte Petersilie' },
    ],
  },
  {
    name: 'Kühlregal & Käse',
    barColor: 'bg-amber-500',
    items: [
      { amount: '60 g', name: 'Parmigiano Reggiano' },
      { amount: '250 g', name: 'Frische Tagliatelle' },
    ],
  },
];

export default function LandingBentoShowcase() {
  return (
    <section className="flex flex-col gap-6 sm:gap-8">
      <div className="max-w-xl">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-1.5 sm:mb-2">
          Gebaut für den echten Alltag in der Küche
        </h2>
        <p className="text-xs sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed m-0">
          Keine überladenen Kacheln, sondern ruhige Werkzeuge, die genau dann helfen, wenn du einkaufst, planst oder am Herd stehst.
        </p>
      </div>

      {/* Asymmetric Magazine Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Left Feature (7 cols): Supermarket Shopping List & Portion Scaling */}
        <div className="lg:col-span-7 rounded-3xl bg-black/[0.03] dark:bg-white/[0.04] p-5 sm:p-8 flex flex-col justify-between gap-5 sm:gap-6 border-none">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Einkaufsliste &amp; Wochenplaner
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
              Automatisch nach Supermarkt-Abteilungen sortiert
            </h3>
            <p className="text-[13.5px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0 max-w-lg">
              Übertrage einzelne Rezepte oder deinen gesamten Wochenplan auf einmal in den Einkaufswagen. Gleiche Zutaten über mehrere Gerichte hinweg werden sauber zusammengerechnet.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Mini Week Strip */}
            <div className="rounded-2xl bg-[#fdfbf7] dark:bg-gray-900 px-3.5 sm:px-4 py-2.5 sm:py-3 ring-1 ring-black/[0.04] dark:ring-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                Wochenplan Mo–So
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {(['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const).map((day, idx) => (
                  <span
                    key={day}
                    className={`px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-[10.5px] sm:text-[11px] ${
                      idx < 3
                        ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>

            {/* Mini UI Preview: 2-Column Supermarket Aisle Grid (Even on Mobile) */}
            <div className="rounded-2xl bg-[#fdfbf7] dark:bg-gray-900 p-3.5 sm:p-5 ring-1 ring-black/[0.04] dark:ring-white/10 grid grid-cols-2 gap-3.5 sm:gap-5">
              {SHOPPING_PREVIEW_GROUPS.map((group) => (
                <div key={group.name} className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
                  <div className="flex flex-col gap-1">
                    <span className={`w-6 sm:w-7 h-1 rounded-full ${group.barColor}`} />
                    <span className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white truncate">
                      {group.name}
                    </span>
                  </div>
                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {group.items.map((item) => (
                      <div
                        key={item.name}
                        className="py-1.5 flex items-baseline justify-between gap-1.5 text-[11px] sm:text-xs"
                      >
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {item.name}
                        </span>
                        <span className="font-bold tabular-nums text-gray-500 dark:text-gray-400 shrink-0 text-[10.5px] sm:text-xs">
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Stacked Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-5">
          {/* Top Right Card: Nutrition & Healthy Score */}
          <div className="flex-1 rounded-3xl bg-black/[0.03] dark:bg-white/[0.04] p-5 sm:p-7 flex flex-col justify-between gap-4 sm:gap-5 border-none">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Nährwerte &amp; Healthy Score
                </span>
                <div className="flex items-center gap-1">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map((letter, i) => {
                    const colors = [
                      'bg-emerald-600',
                      'bg-teal-600',
                      'bg-amber-500',
                      'bg-orange-500',
                      'bg-rose-500',
                    ];
                    return (
                      <span
                        key={letter}
                        className={`w-4 h-4 rounded-full ${colors[i]} text-white font-black text-[9px] inline-flex items-center justify-center ${
                          i === 0 ? 'ring-2 ring-emerald-500/30 scale-110' : 'opacity-65'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
                Makros auf einen Blick verstehen
              </h3>
              <p className="text-[13.5px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
                Kalorien, Eiweiß, Kohlenhydrate und Fett werden pro Portion berechnet und mit der offenen Lebensmittel-Datenbank abgeglichen.
              </p>
            </div>

            {/* Proportional Macro Bar Preview */}
            <div className="rounded-2xl bg-[#fdfbf7] dark:bg-gray-900 p-3.5 ring-1 ring-black/[0.04] dark:ring-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  Pro Portion
                </span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                  480 kcal
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/10 flex overflow-hidden">
                <div style={{ width: '24%' }} className="bg-emerald-500" />
                <div style={{ width: '52%' }} className="bg-amber-500" />
                <div style={{ width: '24%' }} className="bg-rose-500" />
              </div>
              <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-300 tabular-nums font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  22 g Eiweiß
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  58 g Carbs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  16 g Fett
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Right Card: Recipe Copilot & Cooking Mode */}
          <div className="flex-1 rounded-3xl bg-black/[0.03] dark:bg-white/[0.04] p-5 sm:p-7 flex flex-col justify-between gap-4 border-none">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Rezept-Copilot &amp; Kochmodus
              </span>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
                Rezepte flexibel an deinen Vorrat anpassen
              </h3>
              <p className="text-[13.5px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
                Kein Parmesan im Haus oder lieber vegetarisch? Frag den integrierten Rezept-Copiloten nach Alternativen und übernimm die Anpassung direkt ins Rezept.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Vegan abwandeln',
                'High-Protein Variante',
                'Auf Airfryer umstellen',
              ].map((chip) => (
                <span
                  key={chip}
                  className="px-3 py-1.5 rounded-full bg-[#fdfbf7] dark:bg-gray-900 ring-1 ring-black/[0.05] dark:ring-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
