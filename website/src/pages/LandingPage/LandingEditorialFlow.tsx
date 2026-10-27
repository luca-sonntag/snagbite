const STATIONS = [
  {
    step: 'Schritt 1',
    title: 'Teilen oder Buchseite scannen',
    description:
      'Tippe in Instagram, TikTok oder YouTube Shorts einfach auf „Teilen“ und wähle Snagbite – oder fotografiere ein Rezept aus einem gedruckten Kochbuch direkt in der App ab.',
  },
  {
    step: 'Schritt 2',
    title: 'Struktur statt Pause-Taste',
    description:
      'Tonspur, Video-Einblendungen und Beschreibungstexte werden automatisch zusammengeführt und in präzise Grammangaben, Teil-Komponenten und klare Arbeitsschritte übersetzt.',
  },
  {
    step: 'Schritt 3',
    title: 'Mit Ruhe am Herd kochen',
    description:
      'Skaliere Portionen mit einem Fingertipp, hake Zutaten beim Einkaufen nach Supermarkt-Abteilungen ab und starte Timer direkt aus dem jeweiligen Kochschritt.',
  },
];

export default function LandingEditorialFlow() {
  return (
    <section id="how-it-works" className="scroll-mt-16 flex flex-col gap-5 sm:gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2.5 sm:gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 sm:pb-6">
        <div className="max-w-xl">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight m-0">
            In Sekunden vom Fundstück zum fertigen Rezept
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs m-0">
          Kein Abtippen von Zutatenlisten und kein Zurückspulen mit mehligen Fingern.
        </p>
      </div>

      {/* Cardless 3-column flow on the warm paper canvas */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y divide-black/[0.06] dark:divide-white/[0.08] md:divide-y-0 md:divide-x">
        {STATIONS.map((item, idx) => (
          <div
            key={item.step}
            className={`flex flex-col gap-1.5 sm:gap-2.5 py-4 sm:py-6 md:py-2 ${
              idx === 0
                ? 'pt-1 md:pt-2 md:pr-8'
                : idx === 1
                  ? 'md:px-8'
                  : 'pb-1 md:pb-2 md:pl-8'
            }`}
          >
            <div className="flex items-baseline gap-2.5 md:flex-col md:gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide shrink-0">
                {item.step}
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
