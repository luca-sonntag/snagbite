import { legal } from '../legal';
import { TERMS_SECTIONS } from './Terms/types';
import { TermsServicesSection } from './Terms/TermsServicesSection';
import { TermsCommerceSection } from './Terms/TermsCommerceSection';
import { TermsLiabilitySection } from './Terms/TermsLiabilitySection';

export default function TermsPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 py-8 md:py-12 flex flex-col gap-10">
      {/* Editorial Document Header */}
      <header className="border-b border-black/[0.06] dark:border-white/[0.08] pb-6 flex flex-col gap-2">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Rechtliches
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight m-0">
          Allgemeine Geschäftsbedingungen
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
          Stand: {legal.lastUpdated} • Verbindliche Nutzungsbedingungen für Snagbite.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
        {/* Cardless Editorial Sidebar TOC */}
        <aside className="md:col-span-4 lg:col-span-3 sticky top-10 hidden md:block">
          <div className="border-l border-black/[0.08] dark:border-white/[0.08] pl-4 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">
            <span className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Inhalt
            </span>
            <nav className="flex flex-col gap-1.5">
              {TERMS_SECTIONS.map((sec) => (
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
        <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-10">
          <TermsServicesSection />
          <TermsCommerceSection />
          <TermsLiabilitySection />
        </div>
      </div>
    </div>
  );
}
