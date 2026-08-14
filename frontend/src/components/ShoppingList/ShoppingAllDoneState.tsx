import { useI18n } from '../../context/I18nContext';
import { Sparkles, Check } from 'lucide-react';

interface ShoppingAllDoneStateProps {
  onClear: () => void;
}

export default function ShoppingAllDoneState({ onClear }: ShoppingAllDoneStateProps) {
  const { t } = useI18n();

  return (
    <div className="text-center py-10 px-4 flex flex-col items-center justify-center animate-fade-in-up relative overflow-hidden">
      {/* Self-contained CSS animations for glowing elements & badge */}
      <style>{`
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes steam-rise {
          0% { stroke-dashoffset: 24; opacity: 0; transform: translateY(2px); }
          50% { opacity: 0.7; }
          100% { stroke-dashoffset: 0; opacity: 0; transform: translateY(-8px); }
        }
        @keyframes sparkle-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes check-draw {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          75% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }

        .anim-float {
          animation: float-subtle 4s ease-in-out infinite;
        }
        .anim-steam-1 {
          stroke-dasharray: 24;
          animation: steam-rise 2.5s ease-in-out infinite;
        }
        .anim-steam-2 {
          stroke-dasharray: 24;
          animation: steam-rise 2.5s ease-in-out infinite 0.8s;
        }
        .anim-sparkle {
          animation: sparkle-pulse 2s ease-in-out infinite;
        }
        .anim-sparkle-delay {
          animation: sparkle-pulse 2s ease-in-out infinite 1s;
        }
        .anim-badge-pop {
          animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.4s;
          opacity: 0;
        }
        .anim-check-draw {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: check-draw 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards 0.7s;
        }
      `}</style>

      {/* Ambient background glow & radial light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Icon Centerpiece */}
      <div className="relative mb-5 select-none anim-float">
        {/* Floating Sparkle Stars */}
        <div className="absolute -top-3 -left-3 text-amber-400 dark:text-amber-300 anim-sparkle text-lg select-none pointer-events-none z-10">
          ✨
        </div>
        <div className="absolute -bottom-1 -right-3 text-emerald-400 dark:text-teal-300 anim-sparkle-delay text-base select-none pointer-events-none z-10">
          ✦
        </div>

        {/* Outer Frosted Ring */}
        <div className="w-28 h-28 rounded-3xl p-2 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-emerald-400/25 border border-emerald-500/20 shadow-2xl shadow-emerald-500/20 flex items-center justify-center backdrop-blur-md">
          {/* Inner Radiant Gradient Box */}
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center relative shadow-inner overflow-hidden">
            {/* Top Gloss Highlight */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

            {/* Cloche / Platter SVG Illustration */}
            <svg
              viewBox="0 0 72 72"
              className="w-14 h-14 overflow-visible drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Steam Aromas */}
              <path
                d="M 31 16 Q 28 10 33 5"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="anim-steam-1"
              />
              <path
                d="M 41 16 Q 44 10 39 5"
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="anim-steam-2"
              />

              {/* Cloche Dome */}
              <path
                d="M 17 50 C 17 28, 55 28, 55 50 Z"
                fill="rgba(255, 255, 255, 0.95)"
              />
              <path
                d="M 23 48 C 23 34, 49 34, 49 48"
                stroke="rgba(16, 185, 129, 0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Top Handle Knob */}
              <circle
                cx="36"
                cy="23"
                r="3.5"
                fill="white"
              />

              {/* Platter / Base Line */}
              <rect
                x="11"
                y="50"
                width="50"
                height="4.5"
                rx="2.25"
                fill="white"
              />
            </svg>
          </div>
        </div>

        {/* Pop-in Corner Check Badge */}
        <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-white dark:bg-gray-900 p-0.5 shadow-lg flex items-center justify-center anim-badge-pop">
          <div className="w-full h-full rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <Check className="w-4 h-4 stroke-[3] anim-check-draw" />
          </div>
        </div>
      </div>

      {/* Pill Badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wide uppercase mb-2">
        {t('shopping.allDoneBadge')}
      </span>

      {/* Typography */}
      <h3 className="text-xl font-extrabold text-gray-950 dark:text-white tracking-tight">
        {t('shopping.allDoneTitle')}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-[260px] leading-relaxed">
        {t('shopping.allDoneDesc')}
      </p>

      {/* Celebratory Finish Button */}
      <button
        onClick={onClear}
        type="button"
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer border border-white/15 flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        <span>{t('shopping.finishShopping')}</span>
      </button>
    </div>
  );
}
