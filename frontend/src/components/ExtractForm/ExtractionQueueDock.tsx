import React from 'react';
import { AlertCircle, Bookmark, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { ExtractionQueueDockProps } from './types';

export const ExtractionQueueDock: React.FC<ExtractionQueueDockProps> = ({
  failedJobsCount,
  waitlistCount,
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
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenSheet('failed');
          }}
          className="w-full min-h-[48px] p-2.5 px-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-950 dark:text-amber-100 flex items-center justify-between gap-3 border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-all cursor-pointer touch-manipulation group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
          </div>

          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-700/70 dark:text-amber-300/70 group-hover:text-amber-800 dark:group-hover:text-amber-200 group-hover:translate-x-0.5 transition-all shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* 2. Warteliste (Kompakter Dock-Balken) */}
      {waitlistCount > 0 && (
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenSheet('waitlist');
          }}
          className="w-full min-h-[48px] p-2.5 px-3.5 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none active:scale-[0.99] transition-all cursor-pointer touch-manipulation group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
          </div>

          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 group-hover:translate-x-0.5 transition-all shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      )}
    </div>
  );
};

export default ExtractionQueueDock;
