import { useState, useRef, useCallback } from 'react';
import { hapticLight } from '../utils/haptics';

interface UseBottomSheetDragOptions {
  onClose: () => void;
  dismissThreshold?: number;
}

/**
 * Reusable hook for native-feeling mobile bottom sheet drag-to-dismiss gestures.
 */
export function useBottomSheetDrag({
  onClose,
  dismissThreshold = 90,
}: UseBottomSheetDragOptions) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;
      // Dragging downward with slight natural damping
      if (deltaY > 0) {
        setDragY(deltaY * 0.9);
      } else {
        // Resistance when pulling up
        setDragY(deltaY * 0.15);
      }
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > dismissThreshold) {
      hapticLight();
      onClose();
    }
    setDragY(0);
  }, [isDragging, dragY, dismissThreshold, onClose]);

  return {
    dragY,
    isDragging,
    sheetStyle: {
      transform: dragY !== 0 ? `translateY(${Math.max(0, dragY)}px)` : undefined,
      transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)',
    },
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export default useBottomSheetDrag;

