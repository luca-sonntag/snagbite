import React from 'react';
import type { QueueItem } from '../../context/ExtractionQueueContext';
import { WaitlistItemCard } from './WaitlistItemCard';

/**
 * @deprecated Use `WaitlistItemCard` instead. The separate failed jobs queue has been
 * unified into `QueueItem` and rendered centrally in `ExtractionQueueSheet`.
 */
interface FailedJobCardProps {
  entry: QueueItem;
  onRetry: (url: string) => void;
  onDismiss: (id: string) => void;
  onMoveToWaitlist?: (id: string) => void;
}

export const FailedJobCard: React.FC<FailedJobCardProps> = ({
  entry,
  onRetry,
  onDismiss,
}) => {
  return (
    <WaitlistItemCard
      item={entry}
      canAnalyze={true}
      onAnalyze={onRetry}
      onRemove={onDismiss}
    />
  );
};

export default FailedJobCard;
