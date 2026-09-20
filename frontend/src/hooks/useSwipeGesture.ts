import { useRef, useCallback, useState, useMemo, type CSSProperties } from 'react';

const AXIS_LOCK_SLOP = 8;

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';
export type SwipeNavDirection = 'next' | 'prev';

export interface UseSwipeGestureOptions {
  /** Called when a horizontal swipe to the left is completed */
  onSwipeLeft?: () => void;
  /** Called when a horizontal swipe to the right is completed */
  onSwipeRight?: () => void;
  /** Called when a vertical swipe upwards is completed */
  onSwipeUp?: () => void;
  /** Called when a vertical swipe downwards is completed */
  onSwipeDown?: () => void;
  /** Primary swipe axis to track (default: 'x') */
  axis?: 'x' | 'y' | 'both';
  /** Minimum distance in pixels required to trigger a swipe (default: 45) */
  threshold?: number;
  /** Maximum perpendicular movement in pixels allowed (default: 100) */
  maxPerpendicular?: number;
  /** Whether the container tracks finger displacement in real time (default: true) */
  interactive?: boolean;
  /** Custom CSS class applied when swiping to next item / left */
  nextClassName?: string;
  /** Custom CSS class applied when swiping to prev item / right */
  prevClassName?: string;
  /** Spring-back transition on touch release (default: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)') */
  springTransition?: string;
}

export interface SwipeGestureResult {
  /** Touch event handlers for React JSX */
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  /** Current drag offset in pixels along the active axis */
  dragOffset: number;
  /** Whether a touch drag gesture is currently active */
  isDragging: boolean;
  /** Raw direction of the last completed swipe */
  direction: SwipeDirection | null;
  /** Semantic navigation direction ('next' for swipe-left, 'prev' for swipe-right) */
  navDirection: SwipeNavDirection | null;
  /** Manually set or reset the navigation direction */
  setNavDirection: (dir: SwipeNavDirection | null) => void;
  /** Active animation class based on navDirection and options */
  animationClass: string;
  /** Inline CSS style to apply to the swipeable element */
  containerStyle: CSSProperties;
  /** Convenient spreadable object containing touch handlers and containerStyle */
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    style: CSSProperties;
  };
}

/**
 * Generic, framework-agnostic hook detecting horizontal and/or vertical swipe
 * gestures on touch-enabled elements with real-time finger tracking, axis locking,
 * and customizable slide animations.
 *
 * @example
 * const swipe = useSwipeGesture({ onSwipeLeft: nextItem, onSwipeRight: prevItem });
 * <div {...swipe.containerProps}>...</div>
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  axis = 'x',
  threshold = 45,
  maxPerpendicular = 100,
  interactive = true,
  nextClassName = 'animate-tab-in-right',
  prevClassName = 'animate-tab-in-left',
  springTransition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
}: UseSwipeGestureOptions = {}): SwipeGestureResult {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState<SwipeDirection | null>(null);
  const [navDirection, setNavDirection] = useState<SwipeNavDirection | null>(null);

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
      const dy = touch.clientY - startRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (axisRef.current === null) {
        if (absDx < AXIS_LOCK_SLOP && absDy < AXIS_LOCK_SLOP) return;
        axisRef.current = absDx > absDy ? 'horizontal' : 'vertical';
        if (
          ((axis === 'x' || axis === 'both') && axisRef.current === 'horizontal') ||
          ((axis === 'y' || axis === 'both') && axisRef.current === 'vertical')
        ) {
          if (interactive) setIsDragging(true);
        }
      }

      if (axis === 'x') {
        if (axisRef.current !== 'horizontal' || absDy > maxPerpendicular) return;
        if (interactive) setDragOffset(dx);
      } else if (axis === 'y') {
        if (axisRef.current !== 'vertical' || absDx > maxPerpendicular) return;
        if (interactive) setDragOffset(dy);
      } else {
        if (interactive) setDragOffset(axisRef.current === 'horizontal' ? dx : dy);
      }
    },
    [axis, interactive, maxPerpendicular],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!trackingRef.current || !startRef.current) return;
      trackingRef.current = false;
      const currentAxis = axisRef.current;
      axisRef.current = null;
      setIsDragging(false);
      setDragOffset(0);

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      startRef.current = null;

      if (axis === 'x' || (axis === 'both' && currentAxis === 'horizontal')) {
        if (absDy > maxPerpendicular || absDx < threshold || absDy >= absDx) return;
        if (dx < 0) {
          setDirection('left');
          setNavDirection('next');
          onSwipeLeft?.();
        } else {
          setDirection('right');
          setNavDirection('prev');
          onSwipeRight?.();
        }
      } else if (axis === 'y' || (axis === 'both' && currentAxis === 'vertical')) {
        if (absDx > maxPerpendicular || absDy < threshold || absDx >= absDy) return;
        if (dy < 0) {
          setDirection('up');
          setNavDirection('next');
          onSwipeUp?.();
        } else {
          setDirection('down');
          setNavDirection('prev');
          onSwipeDown?.();
        }
      }
    },
    [axis, maxPerpendicular, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown],
  );

  const animationClass = useMemo(() => {
    if (navDirection === 'next') return nextClassName;
    if (navDirection === 'prev') return prevClassName;
    return '';
  }, [navDirection, nextClassName, prevClassName]);

  const containerStyle: CSSProperties = useMemo(() => {
    const isHorizontal = axis === 'x' || axis === 'both';
    const transform =
      dragOffset !== 0
        ? isHorizontal
          ? `translateX(${dragOffset}px)`
          : `translateY(${dragOffset}px)`
        : undefined;

    return {
      touchAction: axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none',
      transform,
      transition: isDragging ? 'none' : springTransition,
      willChange: isDragging ? 'transform' : undefined,
    };
  }, [axis, dragOffset, isDragging, springTransition]);

  const containerProps = useMemo(
    () => ({
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      style: containerStyle,
    }),
    [onTouchStart, onTouchMove, onTouchEnd, containerStyle],
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    dragOffset,
    isDragging,
    direction,
    navDirection,
    setNavDirection,
    animationClass,
    containerStyle,
    containerProps,
  };
}

