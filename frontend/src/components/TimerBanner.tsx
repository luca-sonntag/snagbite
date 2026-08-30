import { Bell, X, Timer } from 'lucide-react';
import { useTimerManager } from '../hooks/useTimerManager';
import { useI18n } from '../context/I18nContext';
import { stripInlineIngredientTags } from '../utils/ingredientMatch';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';

/** Compute remaining seconds from a timer's endAt timestamp */
function getRemainingSeconds(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

/** Format seconds as mm:ss */
function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerBanner() {
  const { timers, removeTimer, dismissFinished, setPendingNavigation } = useTimerManager();
  const { t } = useI18n();

  if (timers.length === 0) return null;

  return (
    <div
      className="w-full bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md border-none shadow-xs py-2.5 transition-all"
      style={{ animation: 'timerBannerSlideDown 0.25s cubic-bezier(0.32,0.72,0,1) both' }}
    >
      <div className="w-full max-w-md mx-auto px-4 flex flex-col gap-2">
        {timers.map(timer => {
          const remaining = getRemainingSeconds(timer.endAt);
          const isFinished = timer.isFinished;

          // Progress 0→1 as time runs down
          const progress = isFinished ? 0 : remaining / timer.durationSeconds;

          const { recipeId, stepNum } = timer;
          const isAssociated = !!(recipeId && stepNum);

          return (
            <div
              key={timer.id}
              onClick={isAssociated ? () => {
                hapticLight();
                setPendingNavigation({ recipeId: recipeId!, stepNum: stepNum! });
                window.dispatchEvent(new CustomEvent('app:navigate-to-timer-step', {
                  detail: { recipeId, stepNum }
                }));
              } : undefined}
              className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${
                isAssociated ? 'cursor-pointer active:scale-[0.99]' : ''
              } ${
                isFinished
                  ? 'bg-rose-600 dark:bg-rose-700 animate-pulse'
                  : 'bg-blue-600 dark:bg-blue-700'
              }`}
            >
              {/* Background progress track */}
              {!isFinished && (
                <div
                  className="absolute inset-0 bg-white/15 origin-left transition-all duration-500"
                  style={{ transform: `scaleX(${progress})` }}
                />
              )}

              {/* Icon + Label + Countdown */}
              <div className="relative flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {isFinished ? (
                    <Bell className="w-4 h-4 text-white animate-bounce" />
                  ) : (
                    <Timer className="w-4 h-4 text-white" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-white/85 truncate leading-snug">
                    {stripInlineIngredientTags(timer.label)}
                  </span>
                  <span className="text-sm font-extrabold text-white tabular-nums leading-tight">
                    {isFinished
                      ? t('timer.finished')
                      : formatCountdown(remaining)
                    }
                  </span>
                </div>
              </div>

              {/* Dismiss / Cancel button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFinished) {
                    hapticMedium();
                    dismissFinished(timer.id);
                  } else {
                    hapticHeavy();
                    removeTimer(timer.id);
                  }
                }}
                className="relative shrink-0 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer outline-none border-none"
                aria-label={isFinished ? t('timer.dismiss') : 'Cancel timer'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes timerBannerSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}
