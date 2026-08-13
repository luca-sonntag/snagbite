import { Link } from 'react-router-dom';
import { legal } from '../legal';
import { Shield, ArrowRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const sections = [
    { id: 'verantwortlicher', title: '1. Verantwortlicher' },
    { id: 'daten', title: '2. Datenkategorien' },
    { id: 'zwecke', title: '3. Zwecke & Rechtsgrundlagen' },
    { id: 'ki', title: '4. KI-Verarbeitung' },
    { id: 'empfaenger', title: '5. Empfänger & Dienstleister' },
    { id: 'drittlaender', title: '6. Drittland-Übermittlung' },
    { id: 'dauer', title: '7. Speicherdauer' },
    { id: 'push', title: '8. Benachrichtigungen' },
    { id: 'rechte', title: '9. Deine Rechte' },
    { id: 'beschwerde', title: '10. Beschwerderecht' },
    { id: 'alter', title: '11. Jugendschutz' },
    { id: 'sicherheit', title: '12. Datensicherheit' },
    { id: 'aenderungen', title: '13. Änderungen' },
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
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Datenschutz</span>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
              Datenschutzerklärung
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stand: {legal.lastUpdated} • Transparente Informationen über deine Daten.
            </p>
          </div>

        {/* Prose Body */}
        <div className="prose prose-emerald dark:prose-invert max-w-none flex flex-col gap-12">
          
          <p className="lead text-gray-600 dark:text-gray-400">
            Der Schutz deiner personenbezogenen Daten ist uns wichtig. Wir verarbeiten deine Daten ausschließlich auf Grundlage der Datenschutz-Grundverordnung (DSGVO) und des österreichischen Datenschutzgesetzes (DSG). Diese Erklärung informiert dich über Art, Umfang und Zweck der Verarbeitung im Rahmen der Snagbite App und Website.
          </p>

          <section id="verantwortlicher" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne des Art. 4 Z 7 DSGVO ist:<br />
              <strong>{legal.operatorName}</strong><br />
              {legal.street}<br />
              {legal.city}, {legal.country}<br />
              E-Mail: <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Wir haben keinen Datenschutzbeauftragten bestellt, da hierfür die gesetzlichen Voraussetzungen (Art. 37 DSGVO) nicht vorliegen. Bei Fragen zum Datenschutz wende dich bitte an die oben genannte E-Mail-Adresse.
            </p>
          </section>

          <section id="daten" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">2. Welche Daten wir verarbeiten</h2>
            
            <h3 className="text-base font-bold mt-4">a) Konto- und Registrierungsdaten</h3>
            <p>Für die Nutzung der App ist ein Nutzerkonto erforderlich. Dabei verarbeiten wir:</p>
            <ul className="list-disc pl-5">
              <li>E-Mail-Adresse</li>
              <li>Passwort (ausschließlich verschlüsselt/gehasht gespeichert)</li>
              <li>bei Anmeldung über Google: Name und Profilbild deines Google-Kontos</li>
              <li>eindeutige Nutzer-ID sowie Registrierungs- und Login-Zeitpunkte</li>
            </ul>

            <h3 className="text-base font-bold mt-6">b) Nutzungs- und Inhaltsdaten</h3>
            <ul className="list-disc pl-5">
              <li>von dir geteilte bzw. eingegebene Links zu Social-Media-Inhalten (Instagram, TikTok, YouTube, Facebook u.&nbsp;a.)</li>
              <li>die daraus generierten Rezepte samt Zutaten, Zubereitungsschritten und Nährwertschätzungen</li>
              <li>aus den Videos extrahierte Rezeptbilder – diese werden ausschließlich lokal auf deinem Gerät gespeichert (siehe Abschnitt 5 und 7)</li>
              <li>von dir angelegte Sammlungen, Favoriten, Labels und Einkaufslisten</li>
              <li>persönliche Präferenzen (Rezeptsprache, Maßsystem, Temperatureinheit)</li>
              <li>Anzahl und Zeitpunkt deiner Extraktionen (zur Durchsetzung von Nutzungslimits)</li>
            </ul>

            <h3 className="text-base font-bold mt-6">c) Zahlungs- und Abodaten</h3>
            <p>
              Bei Abschluss eines Premium-Abonnements wird die Zahlung über den Google Play Store abgewickelt. Wir selbst erhalten keine Kreditkarten- oder Kontodaten. Über unseren Dienstleister RevenueCat verarbeiten wir lediglich deinen Abo-Status („free"/„premium"), die Kauf-Kennung und den Ablaufzeitpunkt, um dir die Premium-Funktionen freizuschalten.
            </p>

            <h3 className="text-base font-bold mt-6">d) Feedback- und Fehlerberichte</h3>
            <p>
              Wenn du in der App Feedback oder einen Fehlerbericht sendest, verarbeiten wir deine Nachricht sowie – zur Fehlerdiagnose – technischen Kontext (Geräte- und App-Informationen, App-Version, zuletzt aufgetretene Konsolen-/Fehlerprotokolle) und optionale, von dir angehängte Screenshots.
            </p>

            <h3 className="text-base font-bold mt-6">e) Technische Daten (Server-Logs)</h3>
            <p>
              Beim Aufruf unserer Website und bei API-Anfragen der App werden aus technischen Gründen automatisch Daten verarbeitet, die dein Gerät übermittelt (u.&nbsp;a. IP-Adresse, Datum und Uhrzeit, angefragte Ressource, Browser-/Betriebssystem-Kennung). Diese Server-Logs dienen dem sicheren und stabilen Betrieb und werden nur kurzfristig gespeichert.
            </p>
          </section>

          <section id="zwecke" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">3. Zwecke und Rechtsgrundlagen</h2>
            <ul className="list-disc pl-5">
              <li><strong>Bereitstellung des Kontos und der App-Funktionen</strong> (Konto-, Nutzungs- und Inhaltsdaten): Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO.</li>
              <li><strong>Abwicklung von Premium-Abonnements</strong> (Abodaten): Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO.</li>
              <li><strong>Anmeldung über Google</strong>: deine Einwilligung, Art. 6 Abs. 1 lit. a DSGVO.</li>
              <li><strong>Bearbeitung von Feedback/Fehlerberichten</strong> sowie Betriebssicherheit, Missbrauchs- und Betrugsvermeidung (Server-Logs): berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO.</li>
              <li><strong>Erfüllung rechtlicher Pflichten</strong> (z.&nbsp;B. handels- und steuerrechtliche Aufbewahrung): Art. 6 Abs. 1 lit. c DSGVO.</li>
            </ul>
          </section>

          <section id="ki" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">4. Automatisierte Verarbeitung durch Künstliche Intelligenz</h2>
            <p>
              Zur Erstellung der Rezepte werden die von dir übermittelten Inhalte (Video-Frames, Beschreibungstexte) automatisiert durch das KI-Modell Google Gemini ausgewertet. Diese KI-Auswertung dient allein der Strukturierung des Rezepts. Eine ausschließlich automatisierte Entscheidung mit rechtlicher Wirkung oder ähnlich erheblicher Beeinträchtigung im Sinne des Art. 22 DSGVO findet nicht statt.
            </p>
            <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-xl text-sm text-gray-700 dark:text-gray-300">
              Bitte beachte, dass KI-generierte Angaben (insbesondere Zutatenmengen und Nährwerte) fehlerhaft sein können und keine Ernährungs- oder Gesundheitsberatung darstellen.
            </div>
          </section>

          <section id="empfaenger" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">5. Empfänger und Auftragsverarbeiter</h2>
            <p>
              Wir geben deine Daten nicht zum Verkauf oder zu Werbezwecken an Dritte weiter. Zur Erbringung unseres Dienstes setzen wir sorgfältig ausgewählte Dienstleister ein, mit denen entsprechende Vereinbarungen zur Auftragsverarbeitung bestehen:
            </p>
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="p-4 rounded-xl glass-panel">
                <strong>Supabase (Supabase Inc., USA / EU-Hosting)</strong>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">Authentifizierung und Datenbank-Hosting (Konto, Rezepte, Feedback). Rezeptbilder werden dort nur kurzzeitig (in der Regel wenige Sekunden, längstens 24 Stunden) zwischengespeichert, bis sie auf dein Gerät übertragen wurden – nicht dauerhaft.</p>
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">Datenschutzhinweise Supabase</a>
              </div>

              <div className="p-4 rounded-xl glass-panel">
                <strong>Google Gemini (Google Ireland Ltd. / Google LLC, USA)</strong>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">KI-gestützte Analyse der übermittelten Rezeptinhalte.</p>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">Datenschutzhinweise Google</a>
              </div>

              <div className="p-4 rounded-xl glass-panel">
                <strong>Apify & RapidAPI (USA / Tschechien)</strong>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">Abruf öffentlich zugänglicher Social-Media-Inhalte zum übermittelten Link.</p>
                <div className="flex gap-4">
                  <a href="https://apify.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">Apify Datenschutz</a>
                  <a href="https://rapidapi.com/terms-and-privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">RapidAPI Datenschutz</a>
                </div>
              </div>

              <div className="p-4 rounded-xl glass-panel">
                <strong>RevenueCat & Google Play (USA / EU)</strong>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">Verwaltung und Verifizierung des Abo-Status sowie Abwicklung der Zahlungen.</p>
                <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline">Datenschutzhinweise RevenueCat</a>
              </div>
            </div>
          </section>

          <section id="drittlaender" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">6. Übermittlung in Drittländer</h2>
            <p>
              Einige der genannten Dienstleister haben ihren Sitz bzw. betreiben Server in den USA oder anderen Drittländern. Eine Übermittlung erfolgt nur, soweit sie durch geeignete Garantien im Sinne der Art. 44 ff. DSGVO abgesichert ist – insbesondere durch Standardvertragsklauseln der EU-Kommission und, soweit anwendbar, eine Zertifizierung nach dem EU-U.S. Data Privacy Framework.
            </p>
          </section>

          <section id="dauer" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">7. Speicherdauer</h2>
            <p>Wir speichern deine Daten nur so lange, wie es für die genannten Zwecke erforderlich ist:</p>
            <ul className="list-disc pl-5">
              <li><strong>Konto-, Nutzungs- und Inhaltsdaten:</strong> bis zur Löschung deines Kontos.</li>
              <li><strong>Rezeptbilder:</strong> werden ausschließlich lokal auf deinem Gerät gespeichert; auf unseren Servern liegen sie nur kurzzeitig während der Verarbeitung (längstens 24 Stunden).</li>
              <li><strong>Feedback/Fehlerberichte:</strong> bis zur Erledigung bzw. Fehlerbehebung.</li>
              <li><strong>Server-Logs:</strong> in der Regel wenige Tage.</li>
              <li><strong>Gesetzliche Aufbewahrungspflichten:</strong> Belege werden gemäß § 132 BAO für 7 Jahre aufbewahrt.</li>
            </ul>
            <p className="text-sm">
              Wie du dein Konto löschst, erfährst du auf der Seite <a href="/delete-data" className="text-emerald-500 hover:underline font-semibold">Daten löschen</a>.
            </p>
          </section>

          <section id="push" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">8. Push- & Lokale Benachrichtigungen</h2>
            <p>
              Die App kann dir lokale Benachrichtigungen (z.&nbsp;B. bei Ablauf eines Koch-Timers) anzeigen. Diese werden ausschließlich lokal auf deinem Gerät erzeugt; es werden dafür keine personenbezogenen Daten an uns übermittelt.
            </p>
          </section>

          <section id="rechte" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">9. Deine Rechte</h2>
            <p>Dir stehen nach der DSGVO folgende Rechte zu:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
              <div className="p-3 rounded-lg glass-panel text-xs"><strong>Auskunft:</strong> Erhalte Infos über deine Daten</div>
              <div className="p-3 rounded-lg glass-panel text-xs"><strong>Berichtigung:</strong> Korrigiere unrichtige Daten</div>
              <div className="p-3 rounded-lg glass-panel text-xs"><strong>Löschung:</strong> Recht auf Vergessenwerden</div>
              <div className="p-3 rounded-lg glass-panel text-xs"><strong>Widerspruch:</strong> Gegen berechtigte Interessen</div>
            </div>
            <p>
              Zur Ausübung deiner Rechte genügt eine einfache E-Mail an <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>.
            </p>
          </section>

          <section id="beschwerde" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">10. Beschwerderecht bei der Aufsichtsbehörde</h2>
            <p>
              Wenn du der Ansicht bist, dass die Verarbeitung deiner Daten gegen die DSGVO verstößt, hast du das Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde. In Österreich ist dies die Österreichische Datenschutzbehörde, Barichgasse 40–42, 1030 Wien, <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">www.dsb.gv.at</a>.
            </p>
          </section>

          <section id="alter" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">11. Alter der Nutzer</h2>
            <p>
              Die App richtet sich nicht an Kinder. Personen unter 14 Jahren dürfen ohne Zustimmung der Erziehungsberechtigten kein Konto anlegen.
            </p>
          </section>

          <section id="sicherheit" className="scroll-mt-24 border-b border-gray-100 dark:border-gray-800/50 pb-8 last:border-0">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">12. Datensicherheit</h2>
            <p>
              Die Übertragung erfolgt verschlüsselt (TLS/HTTPS). Der Zugriff auf deine gespeicherten Inhalte ist durch Zugriffskontrollen auf Datenbankebene (Row-Level-Security) so abgesichert, dass ausschließlich du auf deine eigenen Daten zugreifen kannst.
            </p>
          </section>

          <section id="aenderungen" className="scroll-mt-24 pb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">13. Änderungen dieser Datenschutzerklärung</h2>
            <p>
              Wir passen diese Datenschutzerklärung an, wenn Änderungen an der App oder der Rechtslage dies erfordern. Es gilt die jeweils auf dieser Seite veröffentlichte Fassung.
            </p>
          </section>

        </div>
      </main>
      </div>
    </div>
  );
}
