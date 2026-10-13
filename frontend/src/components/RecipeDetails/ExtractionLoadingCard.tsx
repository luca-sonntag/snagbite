import { useState, useEffect } from 'react';
import {
  Sparkles,
  Video,
  ChefHat,
  Flame,
  CheckCircle2,
  Clock,
  Utensils,
  Users,
  Check,
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface ExtractionPhase {
  icon: typeof Video;
  text: string;
}

const SUBTITLES_DE: ExtractionPhase[] = [
  { icon: Video, text: 'Video-Frames werden analysiert…' },
  { icon: Sparkles, text: 'Zutaten & Mengen werden erkannt…' },
  { icon: ChefHat, text: 'Zubereitungsschritte werden geordnet…' },
  { icon: Flame, text: 'Nährwerte & Makros werden berechnet…' },
  { icon: CheckCircle2, text: 'Fast fertig: Rezept wird angerichtet…' },
];

const SUBTITLES_EN: ExtractionPhase[] = [
  { icon: Video, text: 'Analyzing video frames…' },
  { icon: Sparkles, text: 'Detecting ingredients & amounts…' },
  { icon: ChefHat, text: 'Structuring cooking instructions…' },
  { icon: Flame, text: 'Calculating nutrition & macros…' },
  { icon: CheckCircle2, text: 'Almost ready: plating the recipe…' },
];

/**
 * ExtractionLoadingCard
 * 
 * Idea 3: "Der magische Rezept-Scanner"
 * A floating 3D clean flat recipe card with a glowing emerald scan beam and
 * a smart rotating subtitle showing current extraction phases.
 */
export default function ExtractionLoadingCard() {
  const { language } = useI18n();
  const phases = language === 'en' ? SUBTITLES_EN : SUBTITLES_DE;

  const [activeIdx, setActiveIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % phases.length);
        setIsVisible(true);
      }, 250);
    }, 2800);
    return () => clearInterval(interval);
  }, [phases.length]);

  const currentPhase = phases[activeIdx] ?? phases[0];
  const CurrentIcon = currentPhase.icon;

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 sm:py-6 animate-fade-in select-none">
      {/* 3D Floating Recipe Card Container */}
      <div className="w-full max-w-[340px] sm:max-w-[380px] animate-float-gentle">
        <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06),0_4px_16px_rgba(16,185,129,0.07)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.5),0_4px_20px_rgba(16,185,129,0.15)] border-none overflow-hidden flex flex-col gap-4">
          
          {/* Glowing Emerald Laser Scan Beam */}
          <div
            className="absolute inset-x-0 h-24 pointer-events-none -translate-y-full animate-scanning-beam z-10"
            aria-hidden="true"
          >
            <div className="w-full h-full bg-gradient-to-b from-transparent via-emerald-400/15 dark:via-emerald-400/20 to-emerald-500/30" />
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          </div>

          {/* Card Header: Badge + Live Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                {language === 'en' ? 'Recipe Scanner' : 'Rezept-Scanner'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>KI SCAN</span>
            </div>
          </div>

          {/* Manifesting Title Placeholder */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="h-4.5 w-4/5 bg-gray-200/90 dark:bg-gray-800/90 rounded-xl" />
            <div className="h-3.5 w-1/2 bg-gray-200/70 dark:bg-gray-800/60 rounded-lg" />
          </div>

          {/* Quick Metrics Bar (Prep · Cook · Servings) */}
          <div className="grid grid-cols-3 gap-2 py-2 px-1 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl">
            <div className="flex flex-col items-center gap-1 py-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
            </div>
            <div className="flex flex-col items-center gap-1 py-1 border-x border-gray-200/60 dark:border-gray-700/60">
              <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
            </div>
            <div className="flex flex-col items-center gap-1 py-1">
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <div className="h-2.5 w-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
            </div>
          </div>

          {/* Manifesting Ingredients Checklist */}
          <div className="border-t border-gray-100/70 dark:border-gray-800/60 pt-3 flex flex-col gap-2.5">
            {[
              { amountWidth: 'w-10', textWidth: 'w-36' },
              { amountWidth: 'w-14', textWidth: 'w-44' },
              { amountWidth: 'w-12', textWidth: 'w-32' },
              { amountWidth: 'w-8', textWidth: 'w-40' },
            ].map((row, idx) => (
              <div key={`extract-item-skel-${idx}`} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <div className={`h-3 ${row.amountWidth} bg-gray-200/90 dark:bg-gray-800/90 rounded-md shrink-0`} />
                <div className={`h-3 ${row.textWidth} bg-gray-200/70 dark:bg-gray-800/70 rounded-md`} />
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Rotating Smart Subtitle Badge */}
      <div className="mt-6 flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-white dark:bg-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] border-none">
        <div className="w-5 h-5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <CurrentIcon className="w-3 h-3 animate-pulse" />
        </div>
        <span
          className={`text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all duration-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
          }`}
        >
          {currentPhase.text}
        </span>
      </div>
    </div>
  );
}
