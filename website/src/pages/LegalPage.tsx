import { Link } from 'react-router-dom';
import { legal } from '../legal';
import { Card } from '@heroui/react';
import { Mail, Phone, MapPin, Building, ShieldAlert } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8">
      <div>
        <Link to="/" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
          ← Zurück zur Startseite
        </Link>
      </div>

      {/* Page Header */}
      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-none rounded-2xl p-6 md:p-8 flex flex-col gap-2">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Rechtliches</span>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
          Impressum
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Offenlegung gemäß § 5 ECG, § 63 GewO sowie §§ 24 f. MedienG.
        </p>
      </div>

      {/* Main Grid for Corporate Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Operator / Media Owner */}
        <Card className="glass-panel border-none shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-150 dark:border-gray-800">
            <Building className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-md text-gray-900 dark:text-white">Medieninhaber &amp; Betreiber</h2>
          </div>
          <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-200">{legal.operatorName}</p>
              <p>{legal.street}</p>
              <p>{legal.city}</p>
              <p>{legal.country}</p>
            </div>
          </div>
        </Card>

        {/* Card 2: Contact Info */}
        <Card className="glass-panel border-none shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-150 dark:border-gray-800">
            <Mail className="w-5 h-5 text-teal-500" />
            <h2 className="font-bold text-md text-gray-900 dark:text-white">Kontakt</h2>
          </div>
          <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{legal.phone}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Corporate Details & Disclaimers */}
      <div className="prose prose-emerald dark:prose-invert max-w-none flex flex-col gap-8 mt-4">
        
        <section className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-white mt-0">Unternehmensdaten &amp; Behörden</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-2">
            {legal.vatId && !legal.vatId.startsWith('AUSFÜLLEN') && (
              <li><strong>Umsatzsteuer-Identifikationsnummer (UID):</strong> {legal.vatId}</li>
            )}
            {legal.companyRegister && (
              <li><strong>Firmenbuch:</strong> {legal.companyRegister}</li>
            )}
            {legal.tradeAuthority && !legal.tradeAuthority.startsWith('AUSFÜLLEN') && (
              <li><strong>Gewerbebehörde:</strong> {legal.tradeAuthority}</li>
            )}
            <li><strong>Unternehmensgegenstand:</strong> Betrieb der App und Website „Snagbite" (KI-gestützte Extraktion von Rezepten aus öffentlich zugänglichen Social-Media-Inhalten).</li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Anwendbare Rechtsvorschriften: Gewerbeordnung (GewO), abrufbar unter{' '}
            <a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
              www.ris.bka.gv.at
            </a>. Kammerzugehörigkeit: Wirtschaftskammer Österreich (soweit ein Gewerbe angemeldet ist).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Offenlegung gemäß § 25 MedienG</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Medieninhaber, Herausgeber und für den Inhalt verantwortlich: <strong>{legal.operatorName}</strong>, {legal.mediaOwnerLocation}.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Grundlegende Richtung (Blattlinie):</strong> Diese Website dient der Information über die App „Snagbite" sowie der Bereitstellung der zugehörigen Rechtstexte. Sie verfolgt keine darüber hinausgehende politische oder weltanschauliche Ausrichtung.
          </p>
        </section>

        <section className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 p-5 rounded-2xl">
          <h2 className="text-lg font-bold mb-2 text-amber-700 dark:text-amber-400 mt-0 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            Online-Streitbeilegung &amp; Verbraucherschlichtung
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
            Die von der Europäischen Kommission bereitgestellte Plattform zur Online-Streitbeilegung (OS-Plattform) wurde eingestellt. Für außergerichtliche Streitbeilegung steht Verbraucherinnen und Verbrauchern in Österreich unter anderem die Internet Ombudsstelle (<a href="https://www.ombudsstelle.at" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">www.ombudsstelle.at</a>) zur Verfügung.
            Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Urheberrecht &amp; Haftung</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Die Inhalte dieser Website und der App unterliegen dem österreichischen Urheberrecht. Über die App verarbeitete Videos, Bilder und Texte Dritter (z.&nbsp;B. der jeweiligen Creator) bleiben im Eigentum ihrer Rechteinhaber; Snagbite beansprucht daran keine Rechte.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Als Diensteanbieter sind wir für eigene Inhalte verantwortlich, jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Unsere Angebote können Links zu externen Websites Dritter enthalten, auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte übernehmen wir keine Gewähr; verantwortlich ist stets der jeweilige Anbieter der verlinkten Seite.
          </p>
        </section>

      </div>
    </div>
  );
}
