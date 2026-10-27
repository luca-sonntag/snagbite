import { ArrowRight, Download } from 'lucide-react';
import { PLAY_STORE_URL } from '../../App';
import HeroRecipeShowcase from './HeroRecipeShowcase';

export default function LandingHero() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-10 lg:gap-12 items-center pt-1 sm:pt-6">
      {/* Left Column: Editorial Headline & Actions */}
      <div className="lg:col-span-7 flex flex-col items-start text-left">
        <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 mb-2 sm:mb-3">
          Dein digitales Kochbuch für Reels &amp; Kochbücher
        </span>

        <h1 className="font-heading text-[2rem] sm:text-5xl md:text-[3.35rem] font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1] sm:leading-[1.08] mb-3.5 sm:mb-5">
          Vom kurzen Video zum Rezept auf dem Küchentisch.
        </h1>

        <p className="text-[15px] sm:text-lg text-gray-600 dark:text-gray-300 mb-5 sm:mb-8 max-w-xl leading-relaxed font-normal">
          Schluss mit endlosem Pausieren in der Küche: Teile Reels, TikToks oder Shorts direkt mit Snagbite – oder fotografiere eine Seite aus deinem Lieblingskochbuch ab. Du erhältst sofort klare Zutatenmengen, ruhige Kochschritte und ehrliche Nährwerte.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-6 sm:px-7 h-12 sm:h-13 min-h-[48px] rounded-2xl inline-flex items-center justify-center gap-2.5 border-none active:scale-95 transition-all cursor-pointer text-[15px] sm:text-base"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Im Google Play Store laden</span>
          </a>

          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-sm text-gray-800 dark:text-gray-200 bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] rounded-2xl h-11 sm:h-13 min-h-[44px] px-5 sm:px-6 border-none active:scale-95 transition-all"
          >
            <span>So funktioniert’s</span>
            <ArrowRight className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          </a>
        </div>
      </div>

      {/* Right Column: Authentic Cookbook Recipe Sheet */}
      <div className="lg:col-span-5 w-full">
        <HeroRecipeShowcase />
      </div>
    </section>
  );
}
