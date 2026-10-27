import { legal } from '../legal';

export default function LegalPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 py-8 md:py-12 flex flex-col gap-10">
      {/* Editorial Document Header */}
      <header className="border-b border-black/[0.06] dark:border-white/[0.08] pb-6 flex flex-col gap-2">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Rechtliches
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
          Impressum
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
          Offenlegung gemäß § 5 ECG, § 63 GewO sowie §§ 24 f. MedienG.
        </p>
      </header>

      {/* Main Grid for Corporate Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Medieninhaber &amp; Betreiber
          </span>
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-0.5">
            <p className="font-bold text-base text-gray-900 dark:text-white m-0">{legal.operatorName}</p>
            <p className="m-0">{legal.street}</p>
            <p className="m-0">{legal.city}</p>
            <p className="m-0">{legal.country}</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Kontakt
          </span>
          <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">E-Mail</span>
              <a
                href={`mailto:${legal.email}`}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {legal.email}
              </a>
            </div>
            {legal.phone && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Telefon</span>
                <span>{legal.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Details & Disclaimers */}
      <div className="flex flex-col gap-8 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white m-0">
            Unternehmensdaten &amp; Behörden
          </h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-2 m-0">
            {legal.vatId && !legal.vatId.startsWith('AUSFÜLLEN') && (
              <li><strong>Umsatzsteuer-Identifikationsnummer (UID):</strong> {legal.vatId}</li>
            )}
            {legal.companyRegister && (
              <li><strong>Firmenbuch:</strong> {legal.companyRegister}</li>
            )}
            {legal.tradeAuthority && !legal.tradeAuthority.startsWith('AUSFÜLLEN') && (
              <li><strong>Gewerbebehörde:</strong> {legal.tradeAuthority}</li>
            )}
            <li>
              <strong>Unternehmensgegenstand:</strong> Entwicklung und Betrieb der App und Website „Snagbite“ (KI-gestützte Strukturierung von Kochrezepten aus öffentlich zugänglichen Internet- und physischen Quellen, intelligente Vorrats- und Mahlzeitenplanung sowie interaktive Kochassistenz).
            </li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 pt-1">
            Anwendbare Rechtsvorschriften: Gewerbeordnung (GewO), abrufbar unter{' '}
            <a
              href="https://www.ris.bka.gv.at"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              www.ris.bka.gv.at
            </a>. Kammerzugehörigkeit: Wirtschaftskammer Österreich (soweit ein Gewerbe angemeldet ist).
          </p>
        </section>

        <section className="pt-8 flex flex-col gap-2">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white m-0">
            Offenlegung gemäß § 25 MedienG
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            Medieninhaber, Herausgeber und für den Inhalt verantwortlich: <strong>{legal.operatorName}</strong>, {legal.mediaOwnerLocation}.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            <strong>Grundlegende Richtung (Blattlinie):</strong> Diese Website dient der Information über die App „Snagbite“ sowie der Bereitstellung der zugehörigen Rechtstexte. Sie verfolgt keine darüber hinausgehende politische oder weltanschauliche Ausrichtung.
          </p>
        </section>

        <section className="pt-8">
          <div className="bg-amber-500/[0.06] dark:bg-amber-500/10 p-5 sm:p-6 rounded-2xl border-none flex flex-col gap-2">
            <h2 className="font-heading text-lg font-bold text-amber-800 dark:text-amber-300 m-0">
              Online-Streitbeilegung &amp; Verbraucherschlichtung
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed m-0">
              Die von der Europäischen Kommission bereitgestellte Plattform zur Online-Streitbeilegung (OS-Plattform) wurde eingestellt. Für außergerichtliche Streitbeilegung steht Verbraucherinnen und Verbrauchern in Österreich unter anderem die Internet Ombudsstelle (
              <a
                href="https://www.ombudsstelle.at"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                www.ombudsstelle.at
              </a>
              ) zur Verfügung. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>

        <section className="pt-8 flex flex-col gap-3">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white m-0">
            Urheberrecht, KI-Hinweise &amp; Haftung
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            <strong>Fremdinhalte &amp; Privatkopie:</strong> Über die App verarbeitete Videos, Bilder und Texte Dritter (z.&nbsp;B. der jeweiligen Creator) verbleiben im ausschließlichen Eigentum ihrer jeweiligen Rechteinhaber; Snagbite beansprucht daran keine Rechte. Der Medienabruf erfolgt flüchtig auf Veranlassung des Nutzers auf dessen Endgerät im Rahmen der gesetzlichen Privatkopie-Schranke (§ 42 UrhG AT / § 53 UrhG DE).
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            <strong>KI-Coverbilder:</strong> Durch KI generierte Rezept-Coverbilder sind unverbindliche, rein illustrative Symbolbilder (Serviervorschläge) und bilden nicht das reale physische Kochergebnis ab.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            <strong>Keine Gesundheitsberatung:</strong> Nährwerte und der Healthy Score sind algorithmische Schätzungen ohne Gewähr und stellen keine medizinische, ernährungsphysiologische oder diätetische Beratung dar. Allergene und Zubereitungssicherheit sind stets eigenverantwortlich zu prüfen.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            <strong>Haftung für Links:</strong> Unsere Angebote können Links zu externen Websites Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte übernehmen wir keine Gewähr; verantwortlich ist stets der jeweilige Anbieter der verlinkten Seite.
          </p>
        </section>
      </div>
    </div>
  );
}
