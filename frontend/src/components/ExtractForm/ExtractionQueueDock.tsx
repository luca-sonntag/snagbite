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
        className={`w-full p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] cursor-pointer touch-manipulation group border-none select-none ${
          actualFailed > 0
            ? 'bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/15'
            : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              actualFailed > 0
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {actualFailed > 0 ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                {totalCount === 1
                  ? t('queue.dock.waitlistOne')
                  : t('queue.dock.waitlistMultiple', { count: totalCount })}
              </p>
              {actualFailed > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-200 shrink-0">
                  {actualFailed === 1
                    ? t('queue.dock.failedBadgeOne')
                    : t('queue.dock.failedBadgeMultiple', { count: actualFailed })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {actualFailed > 0
                ? t('queue.dock.tapToRetry')
                : t('queue.dock.tapToManage')}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-all">
          <span>{t('queue.dock.open')}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:text-gray-300" />
        </div>
      </button>
    </div>
  );
};

export default ExtractionQueueDock;
