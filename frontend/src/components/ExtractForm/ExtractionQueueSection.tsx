import React from 'react';
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
  const { items, failedCount, isQueueSheetOpen, openQueueSheet, closeQueueSheet } = useExtractionQueue();

  if (items.length === 0 && !isQueueSheetOpen) {
    return null;
  }

  return (
    <>
      {items.length > 0 && (
        <ExtractionQueueDock
          itemsCount={items.length}
          failedCount={failedCount}
          onOpenSheet={openQueueSheet}
        />
      )}

      <ExtractionQueueSheet
        isOpen={isQueueSheetOpen}
        onClose={closeQueueSheet}
        canAnalyze={canAnalyze}
        onAnalyze={onAnalyze}
      />
    </>
  );
};

export default ExtractionQueueSection;
