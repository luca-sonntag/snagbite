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
  const { waitlist, failedJobs } = useExtractionQueue();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'waitlist' | 'failed'>('waitlist');

  if (waitlist.length === 0 && failedJobs.length === 0) {
    return null;
  }

  const handleOpenSheet = (tab: 'waitlist' | 'failed' = 'waitlist') => {
    setSheetTab(tab);
    setIsSheetOpen(true);
  };

  return (
    <>
      <ExtractionQueueDock
        failedJobsCount={failedJobs.length}
        waitlistCount={waitlist.length}
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
