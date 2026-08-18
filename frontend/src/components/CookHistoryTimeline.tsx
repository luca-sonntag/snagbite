import { useState, useMemo } from 'react';
import { UtensilsCrossed, Camera, Clock } from 'lucide-react';
import type { CookHistory } from '../hooks/useCookHistory';
import { useI18n } from '../context/I18nContext';
import { formatRelative } from '../utils/formatRelative';
import FullscreenImageModal from './FullscreenImageModal';

interface CookHistoryTimelineProps {
  history: CookHistory | null;
}

/**
 * Clean, flat list of past cooks for a recipe, newest first.
 * Shows dish photos, attempt number, exact timestamp, XP earned, and cooking mode info.
 */
export default function CookHistoryTimeline({ history }: CookHistoryTimelineProps) {
  const { t, language } = useI18n();
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);

  // Collect all photos from history so user can swipe through them in fullscreen
  const historyPhotos = useMemo(() => {
    if (!history) return [];
    return history.items
      .map(item => item.photoUrl)
      .filter((url): url is string => Boolean(url));
  }, [history]);

  if (!history || history.count === 0) {
    return (
      <div className="rounded-3xl bg-white dark:bg-gray-900 p-5 text-center border border-black/5 dark:border-white/5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <p className="text-base font-extrabold text-gray-900 dark:text-white">
          {t('app.gamification.cookedTimelineTitle')}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          {t('app.gamification.cookedTimelineEmpty')}
        </p>
      </div>
    );
  }

  const formatExactDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString(language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 p-5 border border-black/5 dark:border-white/5 shadow-2xs">
      {/* Clean section header without extra badges */}
      <h4 className="text-base font-extrabold text-gray-900 dark:text-white mb-3">
        {t('app.gamification.cookedTimelineTitle')}
      </h4>

      {/* History cards timeline */}
      <div className="space-y-3">
        {history.items.map((item, index) => {
          const attemptNum = history.count - index;
          const exactTime = formatExactDate(item.cookedAt);
          const photoIndex = item.photoUrl ? historyPhotos.indexOf(item.photoUrl) : -1;

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-black/5 dark:border-white/10 p-3.5 flex items-start gap-3.5 transition-colors hover:bg-gray-100/70 dark:hover:bg-gray-800/60"
            >
              {/* Photo thumbnail */}
              {item.photoUrl ? (
                <button
                  type="button"
                  onClick={() => setFullscreenPhotoIndex(photoIndex !== -1 ? photoIndex : 0)}
                  className="block flex-shrink-0 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 shadow-2xs focus:outline-none group cursor-pointer"
                >
                  <img
                    src={item.photoUrl}
                    alt=""
                    className="h-14 w-14 object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </button>
              ) : (
                <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-gray-200/60 dark:bg-gray-700/50 flex flex-col items-center justify-center text-gray-400 border border-black/5 dark:border-white/5">
                  <Camera className="h-5 w-5" />
                  <span className="text-[9px] font-medium mt-0.5 text-gray-400">
                    {t('app.gamification.cookedNoPhoto')}
                  </span>
                </div>
              )}

              {/* Info block */}
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                {/* Attempt title */}
                <div className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                  {t('app.gamification.cookedAttempt', { count: attemptNum })}
                </div>

                {/* Timestamp row */}
                <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Clock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{formatRelative(item.cookedAt, language)}</span>
                  {exactTime && (
                    <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">
                      ({exactTime})
                    </span>
                  )}
                </div>

                {/* XP earned line directly under timestamp */}
                {item.xpAwarded && item.xpAwarded > 0 ? (
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    +{item.xpAwarded} XP
                  </div>
                ) : null}

                {/* Cooking mode tag if applicable */}
                {item.viaCookingMode && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 border border-teal-500/20">
                      <UtensilsCrossed className="h-3 w-3 text-teal-500" />
                      {t('app.gamification.cookedViaMode')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Photo Lightbox Modal using shared FullscreenImageModal component */}
      <FullscreenImageModal
        images={historyPhotos}
        initialIndex={fullscreenPhotoIndex}
        onClose={() => setFullscreenPhotoIndex(null)}
      />
    </div>
  );
}
