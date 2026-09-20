import { Link } from 'react-router-dom';
import { legal } from '../legal';
import { Shield, ArrowRight } from 'lucide-react';
import { PRIVACY_SECTIONS } from './PrivacyPolicy/types';
import { GeneralDataSection } from './PrivacyPolicy/GeneralDataSection';
import { AdMobAndAiSection } from './PrivacyPolicy/AdMobAndAiSection';
import { PartnersAndRightsSection } from './PrivacyPolicy/PartnersAndRightsSection';

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-6">
      <div>
        <Link
          to="/"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
        >
          ← Zurück zur Startseite
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Table of Contents / Sidebar */}
        <aside className="md:col-span-4 lg:col-span-3 sticky top-12 hidden md:block">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none">
            <div className="flex items-center gap-2 pb-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Inhalt
              </h3>
            </div>
            <nav className="flex flex-col gap-1.5">
              {PRIVACY_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 group py-0.5"
                >
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 shrink-0" />
                  <span className="truncate">{sec.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-8 lg:col-span-9 flex flex-col gap-8">
          {/* Banner/Header */}
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-none rounded-2xl p-6 md:p-8 flex flex-col gap-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Datenschutz
            </span>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
              Datenschutzerklärung
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stand: {legal.lastUpdated} • Vollständige Transparenz über deine Daten nach Art. 13 &amp; 14 DSGVO.
            </p>
          </div>

          <p className="lead text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Der Schutz deiner persönlichen Daten ist uns ein elementares Anliegen. Wir verarbeiten personenbezogene Daten streng im Einklang mit der EU-Datenschutz-Grundverordnung (DSGVO), dem österreichischen Datenschutzgesetz (DSG) sowie dem Telekommunikationsgesetz (TKG 2021). Diese Datenschutzerklärung informiert dich über alle Datenverarbeitungen in der Snagbite App und auf dieser Website.
          </p>

          <div className="flex flex-col gap-10">
            <GeneralDataSection />
            <AdMobAndAiSection />
            <PartnersAndRightsSection />
          </div>
        </main>
      </div>
    </div>
  );
}
