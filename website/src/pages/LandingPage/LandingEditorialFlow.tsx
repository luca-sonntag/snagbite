const STATIONS = [
  {
    num: '01',
    step: 'Schritt 1',
    title: 'Teilen oder Buchseite scannen',
    description:
      'Tippe in Instagram, TikTok oder YouTube Shorts einfach auf „Teilen“ und wähle Snagbite – oder fotografiere ein Rezept aus einem gedruckten Kochbuch direkt in der App ab.',
  },
  {
    num: '02',
    step: 'Schritt 2',
    title: 'Struktur statt Pause-Taste',
    description:
      'Tonspur, Video-Einblendungen und Beschreibungstexte werden automatisch zusammengeführt und in präzise Grammangaben, Teil-Komponenten und klare Arbeitsschritte übersetzt.',
  },
  {
    num: '03',
    step: 'Schritt 3',
    title: 'Mit Ruhe am Herd kochen',
    description:
      'Skaliere Portionen mit einem Fingertipp, hake Zutaten beim Einkaufen nach Supermarkt-Abteilungen ab und starte Timer direkt aus dem jeweiligen Kochschritt.',
  },
];

export default function LandingEditorialFlow() {
  return (
    <section id="how-it-works" className="scroll-mt-16 flex flex-col gap-5 sm:gap-7">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4">
        <div className="max-w-xl flex flex-col gap-1">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Ablauf in 3 Schritten
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight m-0">
            In Sekunden vom Fundstück zum fertigen Rezept
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs m-0">
          Kein Abtippen von Zutatenlisten und kein Zurückspulen mit mehligen Fingern.
        </p>
      </div>

      {/* Clear, tactile step cards with distinct boundaries on mobile & desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
        {STATIONS.map((item) => (
          <div
            key={item.step}
            className="rounded-2xl bg-[#fdfbf7] dark:bg-gray-900 p-4 sm:p-6 ring-1 ring-black/[0.08] dark:ring-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs tabular-nums inline-flex items-center justify-center shrink-0">
                {item.num}
              </span>
              <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight m-0">
                {item.title}
              </h3>
            </div>
            <p className="text-[13.5px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
