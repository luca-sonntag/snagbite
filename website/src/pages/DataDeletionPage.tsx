import { legal } from '../legal';

const DELETION_STEPS = [
  'Öffne die Snagbite App auf deinem Smartphone.',
  'Wechsle unten rechts zum Tab „Profil & Fortschritt“ und tippe oben auf das Zahnrad-Icon (Einstellungen).',
  'Scrolle nach unten zum Abschnitt „Konto-Aktionen“.',
  'Tippe auf „Account & Daten löschen“ und bestätige die Sicherheitsabfrage.',
];

export default function DataDeletionPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 md:py-12 flex flex-col gap-6 sm:gap-10">
      {/* Editorial Document Header */}
      <header className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4 sm:pb-6 flex flex-col gap-1.5 sm:gap-2">
        <span className="text-[11px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
          Account-Verwaltung
        </span>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
          Daten löschen
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 m-0">
          Vollständiges Recht auf Löschung deiner personenbezogenen Daten (Art. 17 DSGVO / Google Play Data Safety).
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct App Deletion + Scope */}
        <div className="md:col-span-7 flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white m-0">
              Löschung direkt in der App
            </h2>
            <ol className="divide-y divide-black/[0.06] dark:divide-white/[0.08] border-y border-black/[0.06] dark:border-white/[0.08] list-none p-0 m-0">
              {DELETION_STEPS.map((text, idx) => (
                <li key={idx} className="py-3.5 flex gap-3.5 items-baseline text-sm">
                  <span className="font-bold text-xs tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                    0{idx + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200 leading-relaxed">
                    {text}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="glass-panel rounded-2xl p-6 flex flex-col gap-3">
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white m-0">
              Was wird unwiderruflich gelöscht?
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
              Bei der Kontolöschung werden alle deine persönlichen Daten vollständig von unseren Servern und Datenbanken entfernt:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1.5 m-0">
              <li>Dein Benutzerkonto (E-Mail, Login-Daten, Passworthash)</li>
              <li>Deine persönlichen Kochbuch-Einträge, Sammlungen, Labels und Notizen</li>
              <li>Dein Wochenplaner, deine Einkaufslisten und Vorratsbestände</li>
              <li>Deine Gamification-Daten (XP-Punkte, Level, Streaks, Koch-Historie und Badges)</li>
              <li>Deine privat hochgeladenen Kochbeweis-Fotos und Feedback-Screenshots</li>
              <li>Dein soziales Profil (Anzeigename, Avatar, Freundescode) und Freundschaften</li>
              <li>Deine registrierten Push-Benachrichtigungstokens</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic m-0 pt-1">
              Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden.
            </p>
          </section>
        </div>

        {/* Right Column: Subscription Notice & Email Fallback */}
        <div className="md:col-span-5 flex flex-col gap-5">
          <div className="p-6 rounded-2xl bg-amber-500/[0.06] dark:bg-amber-500/10 border-none flex flex-col gap-2">
            <h3 className="font-heading text-base font-bold text-amber-800 dark:text-amber-300 m-0">
              Abonnement im Play Store kündigen
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed m-0">
              Ein bestehendes Premium-Abo wird durch die Kontolöschung nicht automatisch bei Google beendet. Bitte kündige es in der Google Play Abo-Verwaltung, um weitere Abbuchungen zu vermeiden.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-2">
            <h3 className="font-heading text-base font-bold text-gray-900 dark:text-white m-0">
              Löschung per E-Mail anfordern
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed m-0">
              Falls du keinen Zugriff mehr auf die App hast, sende uns eine kurze E-Mail von deiner registrierten Adresse an:
            </p>
            <a
              href={`mailto:${legal.email}`}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-xs sm:text-sm font-semibold pt-1 break-all"
            >
              {legal.email}
            </a>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed px-1 m-0">
            <strong>Hinweis zu gesetzlichen Aufbewahrungspflichten:</strong> Daten, die wir aufgrund gesetzlicher Vorschriften (z.&nbsp;B. steuer- oder handelsrechtlicher Aufbewahrungspflichten) weiter aufbewahren müssen, werden bis zum Ablauf der Frist gesperrt und erst danach endgültig gelöscht.
          </p>
        </div>
      </div>
    </div>
  );
}
