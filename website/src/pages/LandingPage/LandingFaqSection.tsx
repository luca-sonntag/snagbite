import { Accordion } from '@heroui/react';
import { Download } from 'lucide-react';
import { PLAY_STORE_URL } from '../../App';

const FAQ_ITEMS = [
  {
    id: '1',
    question: 'Welche Quellen und Plattformen werden unterstützt?',
    answer:
      'Snagbite unterstützt das direkte Teilen von Instagram Reels, TikTok-Videos, YouTube Shorts und Rezept-Websites. Zusätzlich kannst du abfotografierte Seiten aus gedruckten Kochbüchern oder handgeschriebene Rezeptkarten per Kamera-Scan importieren.',
  },
  {
    id: '2',
    question: 'Kostet Snagbite Geld?',
    answer:
      'Die Basisversion ist kostenlos nutzbar. Wenn du regelmäßig viele Rezepte speicherst, komplett werbefrei kochen oder den interaktiven Rezept-Copiloten unbegrenzt nutzen möchtest, kannst du jederzeit auf Snagbite Pro upgraden.',
  },
  {
    id: '3',
    question: 'Kann ich gespeicherte Rezepte nachträglich abändern?',
    answer:
      'Ja. Über den integrierten Rezept-Copiloten kannst du Zutaten ersetzen, das Gericht vegetarisch oder proteinreicher gestalten oder Zubereitungsschritte anpassen und direkt als eigene Variante speichern.',
  },
  {
    id: '4',
    question: 'Wie funktioniert die automatische Einkaufsliste?',
    answer:
      'Sobald du ein Rezept oder deinen Wochenplan auf die Einkaufsliste setzt, werden gleiche Zutaten über mehrere Gerichte hinweg zusammengefasst und automatisch nach Supermarkt-Abteilungen (wie Obst & Gemüse, Kühlregal, Vorrat) geordnet.',
  },
  {
    id: '5',
    question: 'Werden meine Rezepte und Fotos vertraulich behandelt?',
    answer:
      'Ja. Deine persönlichen Sammlungen, Notizen, Wochenpläne und privaten Foto-Scans sind durch strikte Datenbank-Zugriffskontrollen (Row-Level-Security) geschützt. Wir verkaufen deine Daten niemals weiter.',
  },
  {
    id: '6',
    question: 'Sind die Nährwerte und der Healthy Score garantiert exakt?',
    answer:
      'Nährwertprofile, Portionsangaben und der Healthy Score (A–E) basieren auf KI-Schätzungen und Datenbankabgleichen (u. a. Open Food Facts). Sie dienen als schnelle Orientierungshilfe im Alltag, ersetzen jedoch keine medizinische oder diätetische Fachberatung.',
  },
];

export default function LandingFaqSection() {
  return (
    <div className="flex flex-col gap-10 sm:gap-16">
      {/* Grouped FAQ Card Section */}
      <section className="flex flex-col gap-4 sm:gap-6 max-w-3xl mx-auto w-full">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Fragen &amp; Antworten
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white m-0">
            Häufig gestellte Fragen
          </h2>
        </div>

        <div className="rounded-3xl bg-[#fdfbf7] dark:bg-gray-900 ring-1 ring-black/[0.08] dark:ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.03)] px-4 sm:px-6">
          <Accordion
            variant="surface"
            className="w-full bg-transparent flex flex-col divide-y divide-black/[0.07] dark:divide-white/[0.08] p-0"
          >
            {FAQ_ITEMS.map((item) => (
              <Accordion.Item
                key={item.id}
                id={item.id}
                className="border-none bg-transparent rounded-none shadow-none"
              >
                <Accordion.Heading>
                  <Accordion.Trigger className="px-1 py-4 sm:py-5 min-h-[52px] flex items-center justify-between gap-4 text-left text-gray-900 dark:text-white font-bold text-[15px] sm:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
                    <span>{item.question}</span>
                    <Accordion.Indicator className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="px-1 pb-4 sm:pb-5 pt-0 text-[13.5px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.answer}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Distinct Editorial Bottom CTA Banner */}
      <section className="rounded-3xl p-6 sm:p-10 bg-[#18221d] text-white ring-1 ring-black/10 dark:ring-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
        <div className="max-w-lg flex flex-col gap-1.5 sm:gap-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
            Kostenlos starten
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white m-0">
            Bereit für dein nächstes Gericht?
          </h2>
          <p className="text-[13.5px] sm:text-base text-gray-300 leading-relaxed m-0">
            Hol dir Snagbite kostenlos im Google Play Store und verwandle deine gespeicherten Videos in ein aufgeräumtes Kochbuch.
          </p>
        </div>

        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full md:w-auto shrink-0 font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-6 sm:px-7 h-12 sm:h-13 min-h-[48px] rounded-2xl inline-flex items-center justify-center gap-2.5 border-none active:scale-95 transition-all cursor-pointer text-[15px] sm:text-base"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Im Google Play Store laden</span>
        </a>
      </section>
    </div>
  );
}
