import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const TermsLiabilitySection: React.FC = () => {
  return (
    <>
      <section id="haftung" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">8. Gewährleistung, Haftungsausschluss &amp; Gesundheit</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Es gelten die gesetzlichen Gewährleistungsbestimmungen. Für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie bei Vorsatz und grober Fahrlässigkeit haften wir unbeschränkt.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            Wichtige Haftungsbegrenzung: Allergien, Nährwerte &amp; Lebensmittelsicherheit
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Eigenverantwortliche Prüfung von Allergenen:</strong> Wir übernehmen keinerlei Haftung für Schäden, allergische Reaktionen oder gesundheitliche Nachteile, die durch die Verwendung von über die App extrahierten, modifizierten oder vorgeschlagenen Rezepten entstehen. Zutatenlisten, Mengenangaben, Portionsskalierungen und Allergeninformationen müssen vor der Zubereitung und vor dem Verzehr stets eigenverantwortlich überprüft werden.
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Keine Gewähr für Nährwerte &amp; Healthy Score:</strong> Die berechneten Nährwertprofile und der Healthy Score sind rein rechnerische Orientierungshilfen ohne Anspruch auf wissenschaftliche oder medizinische Exaktheit. Eine Haftung für ernährungsphysiologische Fehlannahmen oder das Nichterreichen diätetischer Ziele ist ausgeschlossen.
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Zubereitungssicherheit:</strong> Anweisungen bezüglich Garzeiten, Mindestkerntemperaturen (insbesondere bei Geflügel, Eiern, Fleisch und Fisch) sowie Hygienehinweise sind vom Nutzer nach den anerkannten Regeln der Lebensmittelzubereitung eigenständig zu befolgen.
          </p>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong>Drittanbieter-Ausfälle:</strong> Eine Haftung für die permanente Verfügbarkeit, Schnittstellenstabilität oder Fehlerfreiheit von Drittanbieter-Diensten (Social-Media-Plattformen, KI-APIs von Google, Zahlungsdienste) wird im gesetzlich zulässigen Rahmen ausgeschlossen.
        </p>
      </section>

      <section id="aenderungen" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">9. Änderungen dieser AGB</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Wir behalten uns vor, diese AGB aus sachlichem Grund (z.&nbsp;B. bei Gesetzesänderungen oder Funktionserweiterungen) mit Wirkung für die Zukunft anzupassen, sofern dich dies nicht unangemessen benachteiligt. Über wesentliche Änderungen informieren wir dich rechtzeitig in Textform.
        </p>
      </section>

      <section id="recht" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">10. Anwendbares Recht und Gerichtsstand</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts sowie der Verweisungsnormen des internationalen Privatrechts. Zwingende Verbraucherschutzvorschriften des Wohnsitzstaates des Verbrauchers bleiben unberührt. Für Verbraucher gelten die gesetzlichen Gerichtsstände gem. § 14 KSchG.
        </p>
      </section>

      <section id="salvatorisch" className="scroll-mt-24 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">11. Salvatorische Klausel</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. Anstelle der unwirksamen Bestimmung treten die gesetzlichen Vorschriften.
        </p>
      </section>
    </>
  );
};
