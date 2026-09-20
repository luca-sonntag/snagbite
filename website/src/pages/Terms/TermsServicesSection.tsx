import React from 'react';
import { legal } from '../../legal';
import { ShieldAlert, Video, Sparkles, BookOpen } from 'lucide-react';

export const TermsServicesSection: React.FC = () => {
  return (
    <>
      <section id="geltungsbereich" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">1. Geltungsbereich und Vertragspartner</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der App und Website „Snagbite" sowie für alle darüber abgeschlossenen Verträge zwischen dir und <strong className="text-gray-900 dark:text-white">{legal.operatorName}</strong>, {legal.street}, {legal.city}, {legal.country} („wir", „uns"). Abweichende Bedingungen des Nutzers werden nicht Vertragsbestandteil.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Verbraucher im Sinne dieser AGB ist jede natürliche Person, die den Vertrag zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können (§ 1 KSchG).
        </p>
      </section>

      <section id="leistungen" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Leistungsbeschreibung &amp; Funktionsweise</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Snagbite bietet eine multifunktionale Koch- und Rezeptplattform mit folgenden Kernfunktionen:
          </p>
          <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
            <li>KI-gestützte Extraktion von Rezeptdaten aus öffentlich zugänglichen Social-Media-Links (Instagram, TikTok, YouTube Shorts, Web).</li>
            <li>Foto-Import physischer Rezepte (Kochbuchseiten, Zeitschriften, handschriftliche Notizen) mittels optischer Zeichenerkennung (OCR).</li>
            <li>Interaktiver Rezept-Assistent (Recipe Copilot) zur chatbasierten Anpassung von Zutaten, Mengenumrechnungen und Zubereitungsschritten.</li>
            <li>Wochenplaner zur Vorab-Mahlzeitenplanung und intelligente Einkaufsliste mit automatischem Vorratsabgleich (Anti-Food-Waste).</li>
            <li>Gamification-Elemente (XP-Punkte, Streaks, Koch-Historie mit optionalen Foto-Beweisen) sowie Vernetzung über Freundeslisten und Leaderboards.</li>
            <li>Entdecken und Teilen von Community-Rezepten.</li>
          </ul>
        </div>

        {/* Client-side streaming / private copy disclosure */}
        <div className="p-4 rounded-2xl glass-panel text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-2">
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
            <Video className="w-4 h-4 text-emerald-500" />
            Medienabruf über dein Endgerät
          </div>
          <p className="leading-relaxed m-0">
            Um Rezepte aus geteilten Video-Links zu erstellen, ruft die App die öffentlich zugänglichen Inhalte direkt über dein Endgerät ab. Die Videodaten werden dabei nur kurzzeitig zur Extraktion verarbeitet und nicht dauerhaft auf deinem Gerät oder unseren Servern gespeichert. Der Abruf ist ausschließlich für deinen privaten, nicht-kommerziellen Eigengebrauch bestimmt. Bei Mobilfunkverbindungen kann Datenvolumen deines Tarifs anfallen.
          </p>
        </div>

        {/* AI Cover symbol image disclaimer */}
        <div className="p-4 rounded-2xl glass-panel text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-2">
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-teal-500" />
            KI-Coverbilder als reine illustrative Symbolbilder (Serviervorschläge)
          </div>
          <p className="leading-relaxed m-0">
            Von der KI erzeugte Rezept-Titelbilder sind rein <strong>illustrative Symbolbilder bzw. unverbindliche Serviervorschläge</strong>. Sie stellen keine Zusicherung über das tatsächliche Aussehen, die Textur, die Farbe, die Dekoration oder die Portionsgröße des gekochten Gerichts dar.
          </p>
        </div>

        {/* Health, Healthy Score & Medical disclaimer */}
        <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            Keine medizinische oder Ernährungsberatung / Healthy Score Disclaimer
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Keine Gesundheits- oder Diätberatung:</strong> Snagbite und die darin bereitgestellten Inhalte dienen ausschließlich Informations- und Unterhaltungszwecken. Sie stellen keine medizinische, ernährungsphysiologische oder diätetische Beratung dar und ersetzen nicht die Konsultation eines Arztes oder Ernährungsberaters.
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed m-0">
            <strong>Unverbindlichkeit von Nährwerten &amp; Healthy Score:</strong> Sämtliche Nährwerte (Kalorien, Makronährstoffe, Ballaststoffe), Portionsangaben sowie der berechnete <strong>Healthy Score</strong> basieren ganz oder teilweise auf KI-Schätzungen und algorithmischen Datenbankabgleichen. Wir übernehmen keinerlei Garantie für die Richtigkeit, Vollständigkeit oder Eignung dieser Werte für spezifische gesundheitliche oder sportliche Zielsetzungen.
          </p>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong>Drittanbieter-Abhängigkeit:</strong> Die Verfügbarkeit und Genauigkeit der Extraktion hängen von externen Schnittstellen (Social-Media-Diensten, KI-Providern wie Google Gemini, etc.) ab. Bei Störungen, Sperren oder Änderungen dieser Drittanbieter besteht kein Anspruch auf Schadensersatz oder Erstattung.
        </p>
      </section>

      <section id="konto" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">3. Registrierung und Nutzerkonto</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Für die Nutzung ist ein Benutzerkonto erforderlich. Die Registrierung setzt ein Mindestalter von 14 Jahren voraus; Minderjährige bedürfen der Zustimmung ihrer gesetzlichen Vertreter. Du verpflichtest dich zu wahrheitsgemäßen Angaben und zur Geheimhaltung deiner Zugangsdaten.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Wir sind berechtigt, Konten bei Verstößen gegen diese AGB, unzulässigen Manipulationen (z.&nbsp;B. Umgehung von Quoten, Einsatz von Scrapern oder Bots) sowie bei Verletzung von Rechten Dritter fristlos zu sperren oder zu löschen.
        </p>
      </section>

      <section id="nutzung" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">4. Nutzungsregeln, Urheberrecht &amp; Privatkopie</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Bei der Nutzung von Snagbite sind die Rechte der Urheber und Rechteinhaber strikt zu wahren:
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-panel text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Privatkopie-Schranke (§ 42 UrhG AT / § 53 UrhG DE)
          </div>
          <p className="leading-relaxed m-0">
            Das Extrahieren von Inhalten aus öffentlich zugänglichen Social-Media-Links sowie das Abfotografieren physischer Kochbücher, Zeitschriften oder fremder Rezeptkarten ist <strong>ausschließlich für deinen persönlichen, privaten und nicht-kommerziellen Eigengebrauch</strong> gestattet.
          </p>
          <p className="leading-relaxed m-0">
            Es ist ausdrücklich untersagt, urheberrechtlich geschützte Buchscans, fremde Originaltexte oder Bildwerke ohne Genehmigung der Rechteinhaber öffentlich in der Community bereitzustellen oder an Dritte weiterzuverbreiten.
          </p>
        </div>

        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <p className="leading-relaxed">
            <strong>Community-Rezepte &amp; Nutzerinhalte:</strong> Sofern du ein Rezept öffentlich für die Community freigibst, räumst du uns das unentgeltliche, nicht-exklusive und weltweite Recht ein, diese Inhalte innerhalb der App für andere Nutzer anzuzeigen und suchbar zu machen. Du sicherst zu, dass deine geteilten Inhalte frei von Rechten Dritter sind.
          </p>
          <p className="leading-relaxed">
            <strong>Verbot unzulässiger Inhalte &amp; Gamification-Fairness:</strong> Es ist untersagt, beleidigende, diskriminierende, pornografische oder rechtswidrige Inhalte (als Benutzername, Avatar, Rezepttitel oder Kochbeweisfoto) hochzuladen. Die Manipulation von Gamification-Werten (z.&nbsp;B. Einreichen gefälschter Kochfotos zur Erschleichung von XP) führt zur Aberkennung der Punkte und zum Ausschluss vom Leaderboard.
          </p>
        </div>
      </section>
    </>
  );
};
