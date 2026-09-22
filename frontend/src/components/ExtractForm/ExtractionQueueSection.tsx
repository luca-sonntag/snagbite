import React, { useState } from 'react';
import { useExtractionQueue } from '../../context/ExtractionQueueContext';
import { ExtractionQueueDock } from './ExtractionQueueDock';
import { ExtractionQueueSheet } from './ExtractionQueueSheet';

interface ExtractionQueueSectionProps {
  canAnalyze: boolean;
  onAnalyze: (url: string) => void;
}

export const ExtractionQueueSection: React.FC<ExtractionQueueSectionProps> = ({
  canAnalyze,
  onAnalyze,
}) => {
  const { waitlist, failedJobs, removeFromWaitlist } = useExtractionQueue();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'waitlist' | 'failed'>('waitlist');

  if (waitlist.length === 0 && failedJobs.length === 0) {
    return null;
  }

  const handleQuickStartWaitlist = () => {
    if (waitlist.length === 0) return;
    const top = waitlist[0];
    removeFromWaitlist(top.id);
    onAnalyze(top.url);
  };

  const handleQuickRetryFailed = () => {
    if (failedJobs.length === 0) return;
    const latest = failedJobs[0];
    onAnalyze(latest.sourceUrl);
  };

  const handleOpenSheet = (tab: 'waitlist' | 'failed' = 'waitlist') => {
    setSheetTab(tab);
    setIsSheetOpen(true);
  };

  return (
    <>
      <ExtractionQueueDock
        failedJobsCount={failedJobs.length}
        waitlistCount={waitlist.length}
        canAnalyze={canAnalyze}
        onQuickStartWaitlist={handleQuickStartWaitlist}
        onQuickRetryFailed={handleQuickRetryFailed}
        onOpenSheet={handleOpenSheet}
      />

      <ExtractionQueueSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialTab={sheetTab}
        canAnalyze={canAnalyze}
        onAnalyze={onAnalyze}
      />
    </>
  );
};

export default ExtractionQueueSection;
