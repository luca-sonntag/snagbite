import React from 'react';
import { legal } from '../../legal';
import { ExternalLink, Bell, Globe, Trash2 } from 'lucide-react';

export const PartnersAndRightsSection: React.FC = () => {
  return (
    <>
      <section id="empfaenger" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">6. Empfänger und Auftragsverarbeiter</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Wir verkaufen deine personenbezogenen Daten niemals an Dritte. Zur Erbringung unseres Dienstes setzen wir geprüfte technische Dienstleister ein, mit denen Auftragsverarbeitungsverträge (AVV) gem. Art. 28 DSGVO bestehen:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="p-4 rounded-xl glass-panel flex flex-col justify-between gap-2">
            <div>
              <strong className="text-gray-900 dark:text-white block">Supabase Inc. (USA / EU-Hosting)</strong>
              <p className="mt-1 leading-relaxed">Hosting der relationalen PostgreSQL-Datenbank, Benutzer-Authentifizierung und verschlüsselter Objektspeicher.</p>
            </div>
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1 mt-1">
              Datenschutz Supabase <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 rounded-xl glass-panel flex flex-col justify-between gap-2">
            <div>
              <strong className="text-gray-900 dark:text-white block">Google LLC &amp; Google Ireland Ltd.</strong>
              <p className="mt-1 leading-relaxed">Bereitstellung der multimodalen KI-Modelle (Google Gemini), Push-Infrastruktur (FCM) sowie In-App-Werbung (Google AdMob).</p>
            </div>
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1 mt-1">
              Datenschutz Google <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 rounded-xl glass-panel flex flex-col justify-between gap-2">
            <div>
              <strong className="text-gray-900 dark:text-white block">fal.ai / Features Analytics Inc. (USA)</strong>
              <p className="mt-1 leading-relaxed">Generierung formgetreuer Food-Photography Coverbilder auf Basis textlicher Rezeptbeschreibungen (keine personenbezogenen Daten).</p>
            </div>
            <a href="https://fal.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1 mt-1">
              Datenschutz fal.ai <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 rounded-xl glass-panel flex flex-col justify-between gap-2">
            <div>
              <strong className="text-gray-900 dark:text-white block">RevenueCat Inc. &amp; Google Play Store</strong>
              <p className="mt-1 leading-relaxed">Verwaltung und Synchronisierung von In-App-Abonnements sowie Abwicklung von Zahlungen über den Google Play Store.</p>
            </div>
            <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1 mt-1">
              Datenschutz RevenueCat <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 rounded-xl glass-panel flex flex-col justify-between gap-2">
            <div>
              <strong className="text-gray-900 dark:text-white block">RapidAPI / RapiData LLC (USA)</strong>
              <p className="mt-1 leading-relaxed">Beschaffung von öffentlich zugänglichen Beitragsmetadaten und CDN-Links zum vom Nutzer geteilten Social-Media-Beitrag.</p>
            </div>
            <a href="https://rapidapi.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1 mt-1">
              Datenschutz RapidAPI <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 rounded-xl glass-panel flex flex-col justify-between gap-2">
            <div>
              <strong className="text-gray-900 dark:text-white block">Open Food Facts (Lokale Datenbank)</strong>
              <p className="mt-1 leading-relaxed">Die Zutatennormalisierung erfolgt über einen lokalen SQLite-Index auf unserem Backend-Server. Es werden keine Nutzerdaten übertragen.</p>
            </div>
            <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1 mt-1">
              Open Food Facts <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      <section id="drittlaender" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">7. Übermittlung in Drittländer</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Einige unserer Dienstleister (z.&nbsp;B. Google, Supabase, fal.ai, RevenueCat) verarbeiten Daten in den USA oder anderen Drittländern außerhalb der EU. Eine Übermittlung erfolgt ausschließlich auf Basis geeigneter Garantien im Sinne der Art. 44 ff. DSGVO – namentlich dem <strong>EU-U.S. Data Privacy Framework (DPF)</strong> sowie den <strong>Standardvertragsklauseln (SCCs)</strong> der Europäischen Kommission.
        </p>
      </section>

      <section id="dauer" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">8. Speicherdauer der Daten</h2>
        <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-gray-400 space-y-2 leading-relaxed">
          <li><strong>Konto-, Rezept- und Profilinhalte:</strong> Werden für die Dauer deines aktiven Benutzerkontos gespeichert und bei Kontolöschung unwiderruflich entfernt.</li>
          <li><strong>Hochgeladene Rezeptfotos:</strong> Werden nach der Texterkennung unverzüglich, spätestens jedoch nach 24 Stunden, vollständig vom Server gelöscht.</li>
          <li><strong>Kochbeweis-Fotos:</strong> Werden privat gespeichert, solange das zugehörige Koch-Event in deiner Historie existiert oder bis du deinen Account löschst.</li>
          <li><strong>KI-Coverbilder:</strong> Bleiben gespeichert, solange das zugehörige Rezept in der Datenbank existiert.</li>
          <li><strong>Push-Tokens:</strong> Werden bei Deaktivierung in den Einstellungen oder Kontolöschung gelöscht.</li>
          <li><strong>Gesetzliche Aufbewahrungsfristen:</strong> Rechnungs- und Zahlungsbelege werden gemäß § 132 BAO für 7 Jahre aufbewahrt.</li>
        </ul>
        <div className="pt-2">
          <a href="/delete-data" className="text-emerald-500 hover:underline text-xs font-bold inline-flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            Anleitung zur vollständigen Kontolöschung (Art. 17 DSGVO) aufrufen
          </a>
        </div>
      </section>

      <section id="push" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-500" />
          9. Benachrichtigungen (Push &amp; Lokal)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <strong>Lokale Benachrichtigungen:</strong> In-App-Kochtimer und Streak-Erinnerungen werden ausschließlich auf deinem Smartphone generiert; hierfür werden keine Daten an unsere Server übermittelt.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <strong>Server-Push-Benachrichtigungen (Google Firebase Cloud Messaging):</strong> Wir senden dir nur dann Inspirationen zu deinen gespeicherten Rezepten, wenn du dem Empfang ausdrücklich zugestimmt hast (Art. 6 Abs. 1 lit. a DSGVO / § 174 TKG 2021). Du kannst Benachrichtigungen jederzeit in den App-Einstellungen oder deinen Geräteeinstellungen deaktivieren.
        </p>
      </section>

      <section id="community" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-500" />
          10. Community-Rezepte &amp; Sichtbarkeit
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Aus öffentlich zugänglichen Internet-Links erstellte Rezepte stehen der Community als öffentlich einsehbare Rezepte zur Verfügung, um Vorrats- und Rezeptideen zu teilen. Dies geschieht strikt pseudonym – ohne deinen Namen oder deine E-Mail-Adresse offenzulegen. Eigene Foto-Scans und persönliche Rezepte bleiben stets privat. Du kannst die Sichtbarkeit deiner Rezepte jederzeit in den Rezept-Einstellungen anpassen.
        </p>
      </section>

      <section id="rechte" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">11. Deine Rechte nach der DSGVO</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Dir stehen bezüglich deiner bei uns verarbeiteten Daten folgende Rechte zu:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
          <div className="p-3 rounded-xl glass-panel"><strong>Auskunft (Art. 15):</strong> Erfahre, welche Daten wir verarbeiten.</div>
          <div className="p-3 rounded-xl glass-panel"><strong>Berichtigung (Art. 16):</strong> Korrigiere fehlerhafte Angaben.</div>
          <div className="p-3 rounded-xl glass-panel"><strong>Löschung (Art. 17):</strong> Recht auf vollständiges Vergessenwerden.</div>
          <div className="p-3 rounded-xl glass-panel"><strong>Einschränkung (Art. 18):</strong> Verarbeitungsbegrenzung fordern.</div>
          <div className="p-3 rounded-xl glass-panel"><strong>Übertragbarkeit (Art. 20):</strong> Datenexport in gängigem Format.</div>
          <div className="p-3 rounded-xl glass-panel"><strong>Widerspruch (Art. 21):</strong> Gegen Verarbeitungen widersprechen.</div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Zur Ausübung genügt eine formlose E-Mail an <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>.
        </p>
      </section>

      <section id="beschwerde" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">12. Beschwerderecht bei der Aufsichtsbehörde</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Solltest du der Ansicht sein, dass die Verarbeitung deiner Daten gegen geltendes Datenschutzrecht verstößt, hast du das Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde. In Österreich: <strong>Österreichische Datenschutzbehörde</strong>, Barichgasse 40–42, 1030 Wien, E-Mail: <a href="mailto:dsb@dsb.gv.at" className="text-emerald-500 hover:underline">dsb@dsb.gv.at</a>, Web: <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">www.dsb.gv.at</a>.
        </p>
      </section>

      <section id="alter" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">13. Jugendschutz &amp; Mindestalter</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Die App richtet sich an ein allgemeines Publikum und nicht gezielt an Kinder. Die Registrierung setzt gemäß Art. 8 DSGVO i.V.m. § 4 Abs. 4 DSG ein Mindestalter von 14 Jahren voraus. Jüngere Personen dürfen die App nur unter Aufsicht und mit Zustimmung ihrer Erziehungsberechtigten nutzen.
        </p>
      </section>

      <section id="sicherheit" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">14. Datensicherheit</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Sämtliche Datenübertragungen zwischen App, Backend und Datenbank erfolgen verschlüsselt über TLS 1.3 / HTTPS. Alle Datenbanktabellen sind durch strikte Row-Level-Security (RLS) mandantenfähig isoliert, sodass kein Nutzer auf die privaten Daten oder Notizen anderer Nutzer zugreifen kann.
        </p>
      </section>

      <section id="aenderungen" className="scroll-mt-24 pb-8 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">15. Änderungen dieser Datenschutzerklärung</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Wir behalten uns vor, diese Erklärung bei funktionellen Weiterentwicklungen der App oder Gesetzesänderungen anzupassen. Die jeweils gültige Fassung ist jederzeit unter <code>https://snagbite.app/privacy</code> abrufbar.
        </p>
      </section>
    </>
  );
};
