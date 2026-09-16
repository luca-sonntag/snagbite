import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance in px to trigger a swipe (default: 50) */
  threshold?: number;
  /** Maximum vertical distance to still count as horizontal swipe (default: 100) */
  maxVertical?: number;
}

/**
 * Detects horizontal swipe gestures on a touch-enabled element.
 * Returns touch event handlers to spread onto the target element.
 *
 * @example
 * const swipe = useSwipeGesture({ onSwipeLeft: nextDay, onSwipeRight: prevDay });
 * <div {...swipe}>...</div>
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  maxVertical = 100,
}: UseSwipeGestureOptions): SwipeHandlers {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = Math.abs(touch.clientY - startRef.current.y);
      startRef.current = null;

      if (dy > maxVertical) return; // too much vertical movement
      if (dy >= Math.abs(dx)) return; // vertical scroll, not a swipe
      if (Math.abs(dx) < threshold) return; // not enough horizontal

      if (dx < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    },
    [onSwipeLeft, onSwipeRight, threshold, maxVertical],
  );

  return { onTouchStart, onTouchEnd };
}
