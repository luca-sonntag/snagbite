import React from 'react';
import { AlertCircle, Bookmark, Play, RefreshCw, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import type { ExtractionQueueDockProps } from './types';

export const ExtractionQueueDock: React.FC<ExtractionQueueDockProps> = ({
  failedJobsCount,
  waitlistCount,
  canAnalyze,
  onQuickStartWaitlist,
  onQuickRetryFailed,
  onOpenSheet,
}) => {
  const { t } = useI18n();

  if (failedJobsCount === 0 && waitlistCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 1. Fehlgeschlagene Versuche (Kompakter Dock-Balken) */}
      {failedJobsCount > 0 && (
        <div className="p-2.5 px-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-950 dark:text-amber-100 flex items-center justify-between gap-2.5 border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onOpenSheet('failed');
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left border-none bg-transparent cursor-pointer p-0 touch-manipulation group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                {failedJobsCount === 1
                  ? t('queue.dock.failedOne')
                  : t('queue.dock.failedMultiple', { count: failedJobsCount })}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticMedium();
                onQuickRetryFailed();
              }}
              title={t('queue.dock.retry')}
              className="min-h-[44px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 border-none shadow-none cursor-pointer transition-all touch-manipulation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('queue.dock.retry')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenSheet('failed');
              }}
              aria-label={t('queue.dock.viewAll')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-amber-700 dark:text-amber-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 border-none bg-transparent cursor-pointer transition-all -mr-1.5 touch-manipulation"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Warteliste (Kompakter Dock-Balken) */}
      {waitlistCount > 0 && (
        <div className="p-2.5 px-3.5 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-between gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none transition-all">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onOpenSheet('waitlist');
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left border-none bg-transparent cursor-pointer p-0 touch-manipulation group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {waitlistCount === 1
                  ? t('queue.dock.waitlistOne')
                  : t('queue.dock.waitlistMultiple', { count: waitlistCount })}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticMedium();
                onQuickStartWaitlist();
              }}
              title={t('queue.dock.startNext')}
              className={`min-h-[44px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border-none active:scale-95 cursor-pointer touch-manipulation ${
                canAnalyze
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/25'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('queue.dock.startNext')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenSheet('waitlist');
              }}
              aria-label={t('queue.dock.viewAll')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 border-none bg-transparent cursor-pointer transition-all -mr-1.5 touch-manipulation"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionQueueDock;
