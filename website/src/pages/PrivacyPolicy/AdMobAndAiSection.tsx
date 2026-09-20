import React from 'react';
import { Megaphone, ShieldAlert, Award } from 'lucide-react';

export const AdMobAndAiSection: React.FC = () => {
  return (
    <>
      <section id="admob" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-500" />
            3. In-App-Werbung, Google AdMob &amp; Google UMP Consent
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Um die kostenfreie Grundversion von Snagbite finanzieren zu können, binden wir In-App-Werbung über <strong>Google AdMob</strong> (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland bzw. Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA) ein.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-panel space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            Eingesetzte Werbeformate &amp; Verarbeitungszwecke:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Werbebanner:</strong> Kompakte Anzeigenkarten während der Rezept-Erstellung.</li>
            <li><strong>Start-Anzeigen (App-Open):</strong> Gelegentliche Anzeigen beim Starten bzw. Wiederaufrufen der App.</li>
            <li><strong>Belohnungsvideos (Rewarded Ads):</strong> Nutzer der kostenlosen Version können sich freiwillig kurze Werbevideos ansehen, um zusätzliche Extraktions-Credits freizuschalten.</li>
          </ul>

          <p className="font-semibold text-gray-800 dark:text-gray-200 pt-2">
            Verarbeitete Daten &amp; Gerätekennungen:
          </p>
          <p className="leading-relaxed">
            Beim Abruf von Werbeanzeigen verarbeitet Google AdMob pseudonymisierte Gerätekennungen (insbesondere die Google Werbe-ID / GAID auf Android), die gekürzte IP-Adresse, Geräteparameter (Hersteller, Modell, Betriebssystemversion) sowie Nutzungs- und Interaktionsdaten (z.&nbsp;B. Werbeimpressionen und Klicks).
          </p>

          <p className="font-semibold text-gray-800 dark:text-gray-200 pt-2">
            Einwilligungsmanagement (Google UMP nach EU-DSGVO / IAB TCF v2.2):
          </p>
          <p className="leading-relaxed">
            Nutzer im Europäischen Wirtschaftsraum (EWR) und dem Vereinigten Königreich erhalten beim ersten Öffnen der App ein DSGVO-konformes Einwilligungsbanner (Google User Messaging Platform).
            Sofern du der Personalisierung zustimmst, werden Anzeigen auf Basis deiner Interessen ausgeliefert (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO).
            Lehnst du die Personalisierung ab, werden ausschließlich <strong>nicht-personalisierte Anzeigen</strong> geschaltet, die keine Werbeprofile erstellen (Rechtsgrundlage: berechtigtes Interesse an der werbefinanzierten Bereitstellung des kostenlosen Dienstes, Art. 6 Abs. 1 lit. f DSGVO).
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
            Hinweis für Premium-Abonnenten: Im kostenpflichtigen Abonnement (Snagbite Pro / Premium) ist die gesamte App 100&nbsp;% werbefrei; das AdMob-SDK wird für Abonnenten vollständig deaktiviert.
          </p>
        </div>
      </section>

      <section id="zwecke" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">4. Zwecke und Rechtsgrundlagen der Verarbeitung</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300">
          <div className="p-4 rounded-xl glass-panel">
            <strong className="text-gray-900 dark:text-white block mb-1">Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</strong>
            Bereitstellung des Benutzerkontos, Extraktion und Verwaltung von Rezepten, Wochenplaner, Einkaufslisten, Vorratskammer, Gamification sowie Abwicklung von Premium-Abonnements.
          </div>
          <div className="p-4 rounded-xl glass-panel">
            <strong className="text-gray-900 dark:text-white block mb-1">Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</strong>
            Anmeldung über Google OAuth, Auslieferung personalisierter Werbung via AdMob UMP, Empfang von Push-Benachrichtigungen und freiwilliger Upload von Kochbeweisfotos.
          </div>
          <div className="p-4 rounded-xl glass-panel">
            <strong className="text-gray-900 dark:text-white block mb-1">Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</strong>
            Gewährleistung der IT-Sicherheit, Abwehr von Missbrauch/Betrug, Lastbegrenzung (Rate Limiting), Fehleranalyse über Feedbackberichte und Auslieferung nicht-personalisierter Werbung.
          </div>
          <div className="p-4 rounded-xl glass-panel">
            <strong className="text-gray-900 dark:text-white block mb-1">Rechtliche Pflichten (Art. 6 Abs. 1 lit. c DSGVO)</strong>
            Einhaltung gesetzlicher, handels- und steuerrechtlicher Aufbewahrungspflichten (§ 132 BAO).
          </div>
        </div>
      </section>

      <section id="ki" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            5. KI-Verarbeitung, Healthy Score &amp; illustrative Symbolbilder
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Snagbite nutzt modernste multimodale KI-Systeme (insbesondere Google Gemini sowie fal.ai FLUX.1) zur Strukturierung von Rezepten, zur Generierung von Coverbildern und zur interaktiven Kochassistenz.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            Wichtiger Haftungsausschluss: Keine medizinische oder Ernährungsberatung!
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Keine Gewähr für Richtigkeit:</strong> Sämtliche Nährwerte (Kalorien, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe), Portionsangaben, Mengenumrechnungen sowie der <strong>Healthy Score</strong> werden ganz oder teilweise durch künstliche Intelligenz und algorithmische Datenbankabgleiche (u.&nbsp;a. Open Food Facts) geschätzt. Sie können unvollständig, ungenau oder fehlerhaft sein.
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Keine Gesundheitsberatung:</strong> Die Inhalte stellen ausdrücklich keine ärztliche, ernährungswissenschaftliche oder diätetische Beratung dar. Sie ersetzen bei Unverträglichkeiten, Allergien, Krankheiten oder Diäten niemals die Konsultation einer qualifizierten Fachperson.
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Allergene &amp; Lebensmittelsicherheit:</strong> Nutzer sind verpflichtet, alle Zutaten, Allergenkennzeichnungen, Zubereitungshinweise und Mindestkerntemperaturen vor dem Kochen und Verzehr eigenverantwortlich anhand der tatsächlich verwendeten Lebensmittel zu prüfen.
          </p>
        </div>

        <div className="p-4 rounded-xl glass-panel text-xs text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-white block mb-1">Hinweis zu KI-generierten Coverbildern (Symbolbilder):</strong>
          Die von der KI erzeugten Rezept-Titelbilder (Cover) sind rein <strong>illustrative Symbolbilder bzw. unverbindliche Serviervorschläge</strong>. Sie bilden nicht zwingend das exakte reale Kochergebnis ab; Aussehen, Farbe, Garnierung und Textur können vom tatsächlichen physischen Gericht abweichen.
        </div>
      </section>
    </>
  );
};
