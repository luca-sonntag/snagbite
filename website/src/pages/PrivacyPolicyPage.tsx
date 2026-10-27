import { legal } from '../legal';
import { PRIVACY_SECTIONS } from './PrivacyPolicy/types';
import { GeneralDataSection } from './PrivacyPolicy/GeneralDataSection';
import { AdMobAndAiSection } from './PrivacyPolicy/AdMobAndAiSection';
import { PartnersAndRightsSection } from './PrivacyPolicy/PartnersAndRightsSection';

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-8 md:py-12 flex flex-col gap-6 sm:gap-10">
      {/* Editorial Document Header */}
      <header className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4 sm:pb-6 flex flex-col gap-1.5 sm:gap-2">
        <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Datenschutz
        </span>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
          Datenschutzerklärung
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 m-0">
          Stand: {legal.lastUpdated} • Vollständige Transparenz über deine Daten nach Art. 13 &amp; 14 DSGVO.
        </p>
      </header>

      {/* Mobile-First Horizontal Quick-Jump Chip Bar (< md) */}
      <nav
        aria-label="Abschnitte"
        className="md:hidden -mx-4 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1"
      >
        {PRIVACY_SECTIONS.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className="shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center active:scale-95 transition-all"
          >
            {sec.title}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start">
        {/* Cardless Editorial Sidebar TOC (Desktop) */}
        <aside className="md:col-span-4 lg:col-span-3 sticky top-10 hidden md:block">
          <div className="border-l border-black/[0.08] dark:border-white/[0.08] pl-4 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">
            <span className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Inhalt
            </span>
            <nav className="flex flex-col gap-1.5">
              {PRIVACY_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5 truncate"
                >
                  {sec.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-6 sm:gap-8">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed m-0">
            Der Schutz deiner persönlichen Daten ist uns ein elementares Anliegen. Wir verarbeiten personenbezogene Daten streng im Einklang mit der EU-Datenschutz-Grundverordnung (DSGVO), dem österreichischen Datenschutzgesetz (DSG) sowie dem Telekommunikationsgesetz (TKG 2021). Diese Datenschutzerklärung informiert dich über alle Datenverarbeitungen in der Snagbite App und auf dieser Website.
          </p>

          <div className="flex flex-col gap-8 sm:gap-10">
            <GeneralDataSection />
            <AdMobAndAiSection />
            <PartnersAndRightsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
