import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { useExtractionQueue } from '../../context/ExtractionQueueContext';
import { hapticLight } from '../../utils/haptics';
import WaitlistItemCard from './WaitlistItemCard';
import FailedJobCard from './FailedJobCard';

interface ExtractionQueueSectionProps {
  canAnalyze: boolean;
  onAnalyze: (url: string) => void;
}

export const ExtractionQueueSection: React.FC<ExtractionQueueSectionProps> = ({
  canAnalyze,
  onAnalyze,
}) => {
  const { t } = useI18n();
  const {
    waitlist,
    failedJobs,
    removeFromWaitlist,
    clearWaitlist,
    removeFailedJob,
    clearFailedJobs,
    moveFailedToWaitlist,
  } = useExtractionQueue();

  if (waitlist.length === 0 && failedJobs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Fehlgeschlagene Extraktionen (Fail-Safe Queue) */}
      {failedJobs.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('queue.failedTitle')}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                {failedJobs.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                clearFailedJobs();
              }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-none bg-transparent cursor-pointer"
            >
              {t('queue.btnClearAll')}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {failedJobs.map((job) => (
              <FailedJobCard
                key={job.id}
                entry={job}
                onRetry={onAnalyze}
                onDismiss={removeFailedJob}
                onMoveToWaitlist={moveFailedToWaitlist}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Warteliste (Geparkte Rezepte) */}
      {waitlist.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('queue.waitlistTitle')}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {waitlist.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                clearWaitlist();
              }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-none bg-transparent cursor-pointer"
            >
              {t('queue.btnClearAll')}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {waitlist.map((item) => (
              <WaitlistItemCard
                key={item.id}
                item={item}
                canAnalyze={canAnalyze}
                onAnalyze={onAnalyze}
                onRemove={removeFromWaitlist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionQueueSection;
