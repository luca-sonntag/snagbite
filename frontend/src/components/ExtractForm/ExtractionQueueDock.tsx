import React from 'react';
import { Bookmark, AlertCircle, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { ExtractionQueueDockProps } from './types';

export const ExtractionQueueDock: React.FC<ExtractionQueueDockProps> = ({
  itemsCount,
  failedCount,
  failedJobsCount,
  waitlistCount,
  onOpenSheet,
}) => {
  const { t } = useI18n();

  const totalCount = itemsCount ?? (waitlistCount ?? 0) + (failedJobsCount ?? 0);
  const actualFailed = failedCount ?? (failedJobsCount ?? 0);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          hapticLight();
          onOpenSheet();
        }}
        className="w-full min-h-[48px] p-2.5 px-3.5 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none active:scale-[0.99] transition-all cursor-pointer touch-manipulation group text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              actualFailed > 0
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {actualFailed > 0 ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-2">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {totalCount === 1
                ? t('queue.dock.waitlistOne')
                : t('queue.dock.waitlistMultiple', { count: totalCount })}
            </p>
            {actualFailed > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                {actualFailed === 1
                  ? t('queue.dock.failedBadgeOne')
                  : t('queue.dock.failedBadgeMultiple', { count: actualFailed })}
              </span>
            )}
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 group-hover:translate-x-0.5 transition-all shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
};

export default ExtractionQueueDock;
