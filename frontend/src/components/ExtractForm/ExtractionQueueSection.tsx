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
  const { items, failedCount } = useExtractionQueue();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <ExtractionQueueDock
        itemsCount={items.length}
        failedCount={failedCount}
        onOpenSheet={() => setIsSheetOpen(true)}
      />

      <ExtractionQueueSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        canAnalyze={canAnalyze}
        onAnalyze={onAnalyze}
      />
    </>
  );
};

export default ExtractionQueueSection;
