import { Link } from 'react-router-dom';
import { legal } from '../legal';
import { FileText, ArrowRight } from 'lucide-react';

export default function TermsPage() {
  const sections = [
    { id: 'geltungsbereich', title: '1. Geltungsbereich' },
    { id: 'leistungen', title: '2. Leistungsbeschreibung' },
    { id: 'konto', title: '3. Registrierung & Konto' },
    { id: 'nutzung', title: '4. Nutzungsregeln' },
    { id: 'preise', title: '5. Preise & Zahlung' },
    { id: 'kuendigung', title: '6. Kündigung' },
    { id: 'widerruf', title: '7. Widerrufsrecht' },
    { id: 'haftung', title: '8. Gewährleistung & Haftung' },
    { id: 'aenderungen', title: '9. AGB-Änderungen' },
    { id: 'recht', title: '10. Anwendbares Recht' },
    { id: 'salvatorisch', title: '11. Salvatorische Klausel' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-6">
      <div>
        <Link to="/" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
          ← Zurück zur Startseite
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Table of Contents / Sidebar */}
        <aside className="md:col-span-4 lg:col-span-3 sticky top-12 hidden md:block">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none">
            <div className="flex items-center gap-2 pb-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Inhalt</h3>
            </div>
            <nav className="flex flex-col gap-1.5">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 group py-0.5"
                >
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                  <span>{sec.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-8 lg:col-span-9 flex flex-col gap-10">
          
          {/* Banner/Header */}
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-none rounded-2xl p-6 md:p-8 flex flex-col gap-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Rechtliches</span>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
              Allgemeine Geschäftsbedingungen
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stand: {legal.lastUpdated} • Gültig für alle Nutzer von Snagbite.
            </p>
          </div>

        {/* Prose Body divided into scroll-mt sections */}
        <div className="prose prose-emerald dark:prose-invert max-w-none flex flex-col gap-12">
          
          <section id="geltungsbereich" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">1. Geltungsbereich und Vertragspartner</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der App und Website „Snagbite" sowie für alle darüber abgeschlossenen Verträge zwischen dir und <strong>{legal.operatorName}</strong>, {legal.street}, {legal.city}, {legal.country} („wir", „uns"). Abweichende Bedingungen des Nutzers werden nicht Vertragsbestandteil, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.
            </p>
            <p>
              Verbraucher im Sinne dieser AGB ist jede natürliche Person, die den Vertrag zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können (§ 1 KSchG).
            </p>
          </section>

          <section id="leistungen" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">2. Leistungsbeschreibung</h2>
            <p>
              Snagbite ermöglicht das automatisierte Extrahieren von Rezeptdaten aus öffentlich zugänglichen Social-Media-Beiträgen (z.&nbsp;B. Instagram, TikTok, YouTube, Facebook) mithilfe Künstlicher Intelligenz sowie das Verwalten dieser Rezepte, das Erstellen von Einkaufslisten und die Nutzung eines Kochmodus.
            </p>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/10 rounded-xl my-4 text-sm text-gray-700 dark:text-gray-300">
              <strong>Wichtiger Hinweis zur KI-Genauigkeit:</strong> Die Rezepte, Zutatenlisten, Mengen- und Nährwertangaben werden automatisiert und KI-gestützt erzeugt. Wir übernehmen keine Gewähr für deren Richtigkeit, Vollständigkeit oder Eignung für einen bestimmten Zweck. Die Angaben ersetzen insbesondere keine ärztliche oder ernährungswissenschaftliche Beratung.
            </div>
            <p>
              Wir weisen ausdrücklich darauf hin, dass das Extrahieren und Speichern von Rezepten von der Verfügbarkeit, den technischen Schnittstellen und der Funktionsweise externer Drittanbieter-Dienste (wie Social-Media-Plattformen, Scraping-Diensten, API-Schnittstellen und KI-Modellen) abhängt. Sollten diese externen Dienste vorübergehend oder dauerhaft ausfallen, den Zugriff beschränken oder ihren Betrieb einstellen, kann dies dazu führen, dass Rezepte nicht mehr extrahiert oder gespeichert werden können. Dies gilt insbesondere auch für Nutzer des kostenpflichtigen Premium-Abonnements; in solchen Fällen von Drittanbieter-Ausfällen besteht kein Anspruch auf Rückerstattung der Gebühren oder Schadensersatz.
            </p>
            <p>
              Es besteht kein Anspruch auf ununterbrochene Verfügbarkeit des Dienstes. Wir sind berechtigt, den Funktionsumfang weiterzuentwickeln, zu ändern oder – unter Wahrung berechtigter Nutzerinteressen – einzustellen.
            </p>
          </section>

          <section id="konto" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">3. Registrierung und Nutzerkonto</h2>
            <p>
              Für die Nutzung ist ein Nutzerkonto erforderlich. Du verpflichtest dich, wahrheitsgemäße Angaben zu machen und deine Zugangsdaten geheim zu halten. Die Nutzung setzt ein Mindestalter von 14 Jahren voraus; Minderjährige benötigen die Zustimmung ihrer Erziehungsberechtigten.
            </p>
            <p>
              Wir behalten uns das Recht vor, Nutzerkonten bei Verstößen gegen diese AGB, missbräuchlicher Nutzung der App (z.&nbsp;B. Umgehung von Ratenbegrenzungen, Einsatz von automatisierten Skripten oder Versuchen zur Systemmanipulation) oder bei Verletzung von Rechten Dritter vorübergehend zu sperren oder dauerhaft zu löschen. Im Falle einer berechtigten Sperrung oder Löschung besteht kein Anspruch auf Rückerstattung bereits gezahlter Gebühren.
            </p>
          </section>

          <section id="nutzung" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">4. Nutzungsregeln und Verantwortung für Inhalte</h2>
            <p>
              Die über die App verarbeiteten Videos, Bilder und Texte können urheber-, marken- oder leistungsschutzrechtlich geschützt sein. Du darfst die App nur im Rahmen des geltenden Rechts und ausschließlich für deine private, nicht-kommerzielle Nutzung verwenden. Du sicherst zu, nur Links zu öffentlich zugänglichen Inhalten zu übermitteln und keine Rechte Dritter zu verletzen. Snagbite beansprucht keine Rechte an den Inhalten der jeweiligen Creator.
            </p>
          </section>

          <section id="preise" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">5. Premium-Abonnement, Preise und Zahlung</h2>
            <p>
              Die Grundfunktionen von Snagbite sind kostenlos nutzbar (mit Nutzungslimits). Zusätzliche Funktionen sind über ein kostenpflichtiges Premium-Abonnement verfügbar:
            </p>
            <ul className="list-disc pl-5 my-2">
              <li><strong>Monatsabo:</strong> {legal.priceMonthly} pro Monat</li>
              <li><strong>Jahresabo:</strong> {legal.priceYearly} pro Jahr</li>
            </ul>
            <p>
              Alle Preise verstehen sich als Endpreise inklusive der gesetzlichen Umsatzsteuer. Der maßgebliche Preis wird dir vor Abschluss im Kaufdialog des Google Play Stores angezeigt. Sofern ein kostenloser Testzeitraum (z.&nbsp;B. 7 Tage) angeboten wird, geht dieser nach Ablauf automatisch in ein kostenpflichtiges Abonnement über, sofern du nicht vorher kündigst.
            </p>
            <p>
              Der Kauf und die Zahlungsabwicklung erfolgen über den Google Play Store; es gelten ergänzend dessen Nutzungsbedingungen. Das Abonnement verlängert sich automatisch um die jeweils gewählte Laufzeit, solange es nicht bis spätestens 24 Stunden vor Ablauf des laufenden Zeitraums gekündigt wird.
            </p>
          </section>

          <section id="kuendigung" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">6. Kündigung</h2>
            <p>
              Du kannst dein Abonnement jederzeit zum Ende des laufenden Abrechnungszeitraums über die Abo-Verwaltung deines Google-Play-Kontos kündigen. Nach der Kündigung bleiben die Premium-Funktionen bis zum Ende des bereits bezahlten Zeitraums verfügbar. Das kostenlose Basiskonto kannst du jederzeit durch Löschung des Kontos in der App beenden.
            </p>
          </section>

          <section id="widerruf" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">7. Widerrufsrecht für Verbraucher</h2>
            <p>
              Bei Abschluss eines kostenpflichtigen Abonnements steht dir als Verbraucher ein gesetzliches Rücktrittsrecht (Widerrufsrecht) nach dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG) zu.
            </p>

            <div className="glass-panel rounded-2xl p-6 my-6 shadow-sm">
              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Widerrufsbelehrung</h3>
              <p className="font-semibold mb-2">Widerrufsrecht</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Um dein Widerrufsrecht auszuüben, musst du uns (<strong>{legal.operatorName}</strong>, {legal.street}, {legal.city}, {legal.country}, E-Mail: <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>) mittels einer eindeutigen Erklärung (z.&nbsp;B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist genügt es, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
              </p>
              <p className="font-semibold mb-2">Folgen des Widerrufs</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Erfolgte die Zahlung über den Google Play Store, wird die Rückerstattung über diesen abgewickelt.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Vorzeitiges Erlöschen des Widerrufsrechts:</strong> Wenn du ausdrücklich zugestimmt hast, dass wir mit der Erbringung der digitalen Dienstleistung vor Ablauf der Widerrufsfrist beginnen, und du zur Kenntnis genommen hast, dass du dadurch dein Widerrufsrecht verlierst, erlischt das Widerrufsrecht mit Beginn der Vertragsausführung (§ 18 Abs. 1 Z 11 FAGG).
              </p>
            </div>

            <p className="font-semibold mt-4 mb-2">Muster-Widerrufsformular</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              (Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfüllen und per E-Mail oder Post an uns senden):
            </p>
            <blockquote className="border border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-xl text-sm italic text-gray-600 dark:text-gray-400 my-4">
              An {legal.operatorName}, {legal.street}, {legal.city}, {legal.country}, E-Mail: {legal.email}:<br /><br />
              Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: Snagbite Premium-Abonnement<br />
              Bestellt am / erhalten am: __________<br />
              Name des/der Verbraucher(s): __________<br />
              Anschrift des/der Verbraucher(s): __________<br /><br />
              Datum, Unterschrift (nur bei Mitteilung auf Papier): __________
            </blockquote>
          </section>

          <section id="haftung" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">8. Gewährleistung und Haftung</h2>
            <p>
              Es gelten die gesetzlichen Gewährleistungsbestimmungen. Wir haften unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die wir vorsätzlich oder grob fahrlässig verursacht haben. Für leicht fahrlässig verursachte Sachschäden haften wir nur bei Verletzung einer wesentlichen Vertragspflicht und begrenzt auf den vertragstypischen, vorhersehbaren Schaden. Eine weitergehende Haftung ist ausgeschlossen. Gesetzlich zwingende Haftungsbestimmungen, insbesondere nach dem Konsumentenschutzgesetz (KSchG) und dem Produkthaftungsgesetz, bleiben unberührt.
            </p>
            <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 rounded-xl my-4 text-sm text-gray-700 dark:text-gray-300">
              <strong>Allergien & Unverträglichkeiten:</strong> Wir übernehmen keine Haftung für Schäden, die aus der Verwendung fehlerhaft oder unvollständig extrahierter Rezepte, Mengen- oder Nährwertangaben entstehen. Prüfe alle Zutaten und Angaben stets eigenverantwortlich vor dem Verzehr.
            </div>
            <p>
              Eine Haftung oder Gewährleistung für die ständige Verfügbarkeit, Funktionsfähigkeit oder Fehlerfreiheit von Drittanbieter-Systemen und externen Social-Media-Schnittstellen wird ausgeschlossen. Wir haften nicht für Leistungseinschränkungen oder den Verlust von Funktionen (wie das Unvermögen, Rezepte zu extrahieren oder zu speichern), die durch Störungen, Blockaden oder Abschaltungen bei diesen externen Anbietern verursacht werden. Dies gilt ausdrücklich auch für Premium-Nutzer; ein Anspruch auf Rückerstattung der Abonnement-Gebühren oder Schadensersatz ist in diesen Fällen ausgeschlossen.
            </p>
          </section>

          <section id="aenderungen" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">9. Änderungen dieser AGB</h2>
            <p>
              Wir behalten uns vor, diese AGB mit Wirkung für die Zukunft zu ändern, soweit dies aus sachlichem Grund (z.&nbsp;B. Änderungen der Rechtslage oder des Funktionsumfangs) erforderlich ist und dich nicht unangemessen benachteiligt. Über wesentliche Änderungen informieren wir dich rechtzeitig. Widersprichst du nicht innerhalb einer angemessenen Frist, gelten die geänderten Bedingungen als angenommen; auf die Bedeutung des Schweigens weisen wir dich in der Mitteilung gesondert hin.
            </p>
          </section>

          <section id="recht" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">10. Anwendbares Recht und Gerichtsstand</h2>
            <p>
              Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts und der Verweisungsnormen des internationalen Privatrechts. Zwingende Verbraucherschutzbestimmungen des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, bleiben unberührt. Für Verbraucher gelten die gesetzlichen Gerichtsstände; insbesondere kann ein Verbraucher gemäß § 14 KSchG nur vor dem Gericht seines Wohnsitzes, gewöhnlichen Aufenthalts oder Beschäftigungsorts geklagt werden.
            </p>
          </section>

          <section id="salvatorisch" className="scroll-mt-24 pb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">11. Salvatorische Klausel</h2>
            <p>
              Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.
            </p>
          </section>

        </div>
      </main>
      </div>
    </div>
  );
}
