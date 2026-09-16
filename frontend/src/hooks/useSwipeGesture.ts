import { useRef, useCallback, useState, type CSSProperties } from 'react';

const AXIS_LOCK_SLOP = 8;

export interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance in px to trigger a swipe (default: 45) */
  threshold?: number;
  /** Maximum vertical distance to still count as horizontal swipe (default: 100) */
  maxVertical?: number;
  /** Enable interactive drag translation during swipe gesture (default: true) */
  interactive?: boolean;
}

export interface SwipeGestureResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  dragOffset: number;
  isDragging: boolean;
  direction: 'next' | 'prev' | null;
  setDirection: (dir: 'next' | 'prev' | null) => void;
  animationClass: string;
  containerStyle: CSSProperties;
}

/**
 * Detects horizontal swipe gestures on touch-enabled elements with optional
 * real-time finger tracking and directional CSS animations.
 *
 * @example
 * const swipe = useSwipeGesture({ onSwipeLeft: nextWeek, onSwipeRight: prevWeek });
 * <div onTouchStart={swipe.onTouchStart} onTouchMove={swipe.onTouchMove} onTouchEnd={swipe.onTouchEnd} style={swipe.containerStyle}>...</div>
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 45,
  maxVertical = 100,
  interactive = true,
}: UseSwipeGestureOptions): SwipeGestureResult {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<'horizontal' | 'vertical' | null>(null);
  const trackingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    axisRef.current = null;
    trackingRef.current = true;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!trackingRef.current || !startRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = Math.abs(touch.clientY - startRef.current.y);

      if (axisRef.current === null) {
        if (Math.abs(dx) < AXIS_LOCK_SLOP && dy < AXIS_LOCK_SLOP) return;
        axisRef.current = Math.abs(dx) > dy ? 'horizontal' : 'vertical';
        if (axisRef.current === 'horizontal' && interactive) {
          setIsDragging(true);
        }
      }

      if (axisRef.current !== 'horizontal') return;
      if (dy > maxVertical) return;

      if (interactive) {
        setDragOffset(dx);
      }
    },
    [interactive, maxVertical],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!trackingRef.current || !startRef.current) return;
      trackingRef.current = false;
      const wasHorizontal = axisRef.current === 'horizontal';
      axisRef.current = null;
      setIsDragging(false);
      setDragOffset(0);

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = Math.abs(touch.clientY - startRef.current.y);
      startRef.current = null;

      if (!wasHorizontal && Math.abs(dx) <= dy) return;
      if (dy > maxVertical) return;
      if (Math.abs(dx) < threshold) return;

      if (dx < 0) {
        setDirection('next');
        onSwipeLeft?.();
      } else {
        setDirection('prev');
        onSwipeRight?.();
      }
    },
    [onSwipeLeft, onSwipeRight, threshold, maxVertical],
  );

  const animationClass =
    direction === 'next'
      ? 'animate-tab-in-right'
      : direction === 'prev'
        ? 'animate-tab-in-left'
        : '';

  const containerStyle: CSSProperties = {
    touchAction: 'pan-y',
    transform: dragOffset !== 0 ? `translateX(${dragOffset}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: isDragging ? 'transform' : undefined,
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    dragOffset,
    isDragging,
    direction,
    setDirection,
    animationClass,
    containerStyle,
  };
}

