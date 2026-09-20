import React from 'react';
import { legal } from '../../legal';
import { PlayCircle } from 'lucide-react';

export const TermsCommerceSection: React.FC = () => {
  return (
    <>
      <section id="preise" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">5. Premium-Abonnement, Preise &amp; Rewarded Video Ads</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Die Basisfunktionen von Snagbite sind kostenlos nutzbar (mit rollierenden Extraktionslimits). Zusätzliche Funktionen und unbegrenzte Extraktionen sind über ein kostenpflichtiges Abonnement verfügbar:
          </p>
          <ul className="list-disc pl-5 my-2 text-xs text-gray-600 dark:text-gray-400">
            <li><strong>Monatsabonnement:</strong> {legal.priceMonthly} pro Monat</li>
            <li><strong>Jahresabonnement:</strong> {legal.priceYearly} pro Jahr (inkl. eventueller kostenloser Testphase)</li>
          </ul>
        </div>

        <div className="p-4 rounded-2xl glass-panel text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-2">
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
            <PlayCircle className="w-4 h-4 text-emerald-500" />
            Rewarded Video Ads (Werbe-Credits)
          </div>
          <p className="leading-relaxed m-0">
            Nutzer der kostenlosen Basisversion können sich freiwillig kurze Werbevideos ansehen, um zusätzliche Extraktions-Credits freizuschalten.
          </p>
          <ul className="list-disc pl-5 space-y-1 m-0">
            <li>Bonus-Credits sind rein virtuelle Berechtigungen, an das jeweilige Benutzerkonto gebunden und <strong>nicht übertragbar</strong>.</li>
            <li>Eine Auszahlung in bar, eine Verrechnung oder Erstattung ist ausgeschlossen.</li>
            <li>Es besteht kein Rechtsanspruch auf ununterbrochene oder unbegrenzte Bereitstellung von Werbevideos durch das Werbenetzwerk.</li>
            <li>Bei Löschung des Benutzerkontos verfallen verbleibende Bonus-Credits ersatzlos.</li>
          </ul>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <p className="leading-relaxed">
            Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer. Die Zahlungsabwicklung erfolgt über den Google Play Store; es gelten ergänzend dessen Nutzungsbedingungen.
          </p>
          <p className="leading-relaxed">
            Das Abonnement verlängert sich automatisch um die gewählte Laufzeit, sofern es nicht bis spätestens 24 Stunden vor Ablauf des Abrechnungszeitraums in der Google Play Abo-Verwaltung gekündigt wird.
          </p>
        </div>
      </section>

      <section id="kuendigung" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">6. Kündigung &amp; Beendigung</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Du kannst dein Abonnement jederzeit zum Ende des laufenden Abrechnungszeitraums direkt in den Kontoeinstellungen deines Google-Play-Kontos kündigen. Bis zum Ablauf des bezahlten Zeitraums bleiben alle Premium-Funktionen uneingeschränkt aktiv.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Das kostenlose Basiskonto kann jederzeit durch Kontolöschung in den App-Einstellungen oder über unsere Website beendet werden.
        </p>
      </section>

      <section id="widerruf" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">7. Gesetzliches Widerrufsrecht für Verbraucher</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Verbrauchern steht bei Fernabsatzverträgen nach dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG) ein 14-tägiges Widerrufsrecht zu.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 shadow-sm text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-150 dark:border-gray-800 pb-1.5">
            Widerrufsbelehrung
          </h3>
          <p className="leading-relaxed m-0">
            Du hast das Recht, binnen vierzehn Tagen ab Vertragsabschluss ohne Angabe von Gründen diesen Vertrag zu widerrufen. Um dein Widerrufsrecht auszuüben, musst du uns (<strong className="text-gray-900 dark:text-white">{legal.operatorName}</strong>, {legal.street}, {legal.city}, {legal.country}, E-Mail: <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>) mittels einer eindeutigen Erklärung (z.&nbsp;B. per E-Mail) über deinen Entschluss informieren.
          </p>
          <p className="leading-relaxed m-0">
            Wenn du den Vertrag widerrufst, erstatten wir alle erhaltenen Zahlungen unverzüglich und spätestens binnen 14 Tagen zurück. Erfolgte der Kauf über den Google Play Store, wird die Rückabwicklung über Google Play durchgeführt.
          </p>
          <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/15">
            <strong className="text-gray-900 dark:text-white block mb-1">Vorzeitiges Erlöschen des Widerrufsrechts:</strong>
            Das Widerrufsrecht erlischt bei Verträgen über digitale Dienstleistungen, wenn du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der Ausführung beginnen, und du bestätigt hast, dass du dadurch dein Widerrufsrecht verlierst (§ 18 Abs. 1 Z 11 FAGG).
          </div>
        </div>

        <blockquote className="border border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-xl text-xs italic text-gray-600 dark:text-gray-400">
          Muster-Widerrufstext: An {legal.operatorName}, {legal.street}, {legal.city}, E-Mail: {legal.email}:<br />
          Hiermit widerrufe(n) ich/wir den Vertrag über das Snagbite Premium-Abonnement. Bestellt am: _____, Name: _____, Anschrift: _____, Datum: _____
        </blockquote>
      </section>
    </>
  );
};
