import { useState, useRef, useEffect, useCallback, type PointerEvent } from 'react';

const DRAG_THRESHOLD_PX = 6;
const SWIPE_THRESHOLD_PX = 60;

export function usePlaystoreGallery(itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  // Drag-to-scroll state for carousel on desktop
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialScrollLeft, setInitialScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Fullscreen touch swipe state
  const [fullscreenSwipeOffset, setFullscreenSwipeOffset] = useState(0);
  const [isFullscreenDragging, setIsFullscreenDragging] = useState(false);
  const fullscreenDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !el.children.length) return;
    const scrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll > 0 && scrollLeft >= maxScroll - 16) {
      setActiveIndex(itemCount - 1);
      return;
    }

    const firstOffset = (el.children[0] as HTMLElement).offsetLeft;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const target = child.offsetLeft - firstOffset;
      const distance = Math.abs(target - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex !== activeIndex && closestIndex >= 0 && closestIndex < itemCount) {
      setActiveIndex(closestIndex);
    }
  }, [activeIndex, itemCount]);

  const scrollToSlide = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || !el.children.length) return;
    const safeIndex = Math.max(0, Math.min(index, el.children.length - 1));
    const child = el.children[safeIndex] as HTMLElement | undefined;
    const firstChild = el.children[0] as HTMLElement;

    if (child && firstChild) {
      const targetLeft = child.offsetLeft - firstChild.offsetLeft;
      el.scrollTo({
        left: targetLeft,
        behavior: 'smooth',
      });
      setActiveIndex(safeIndex);
    }
  }, []);

  const handlePrevSlide = useCallback(() => {
    scrollToSlide(activeIndex - 1);
  }, [activeIndex, scrollToSlide]);

  const handleNextSlide = useCallback(() => {
    scrollToSlide(activeIndex + 1);
  }, [activeIndex, scrollToSlide]);

  // Pointer drag for desktop carousel
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !scrollRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragStartX(e.clientX);
    setInitialScrollLeft(scrollRef.current.scrollLeft);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    const deltaX = e.clientX - dragStartX;
    if (Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
      setHasDragged(true);
    }
    scrollRef.current.scrollLeft = initialScrollLeft - deltaX;
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    setIsDragging(false);

    if (hasDragged) {
      const deltaX = e.clientX - dragStartX;
      const threshold = 50;
      if (deltaX < -threshold) {
        handleNextSlide();
      } else if (deltaX > threshold) {
        handlePrevSlide();
      }
    }
  };

  // Fullscreen Lightbox keyboard controls
  useEffect(() => {
    if (fullscreenIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenIndex(null);
      } else if (e.key === 'ArrowRight') {
        setFullscreenIndex((prev) => (prev !== null && prev < itemCount - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setFullscreenIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIndex, itemCount]);

  const openFullscreen = (index: number) => {
    if (!hasDragged) {
      setFullscreenIndex(index);
      setFullscreenSwipeOffset(0);
    }
  };

  const closeFullscreen = useCallback(() => {
    setFullscreenIndex(null);
    setFullscreenSwipeOffset(0);
  }, []);

  // Fullscreen touch swipe handlers
  const handleFullscreenTouchStart = (clientX: number, clientY: number) => {
    fullscreenDragStartRef.current = { x: clientX, y: clientY };
    setIsFullscreenDragging(true);
  };

  const handleFullscreenTouchMove = (clientX: number) => {
    if (!isFullscreenDragging) return;
    const dx = clientX - fullscreenDragStartRef.current.x;
    setFullscreenSwipeOffset(dx);
  };

  const handleFullscreenTouchEnd = () => {
    if (!isFullscreenDragging) return;
    setIsFullscreenDragging(false);

    if (fullscreenSwipeOffset < -SWIPE_THRESHOLD_PX && fullscreenIndex !== null && fullscreenIndex < itemCount - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    } else if (fullscreenSwipeOffset > SWIPE_THRESHOLD_PX && fullscreenIndex !== null && fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    }
    setFullscreenSwipeOffset(0);
  };

  return {
    scrollRef,
    activeIndex,
    fullscreenIndex,
    isDragging,
    fullscreenSwipeOffset,
    isFullscreenDragging,
    handleScroll,
    scrollToSlide,
    handlePrevSlide,
    handleNextSlide,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    openFullscreen,
    closeFullscreen,
    setFullscreenIndex,
    handleFullscreenTouchStart,
    handleFullscreenTouchMove,
    handleFullscreenTouchEnd,
  };
}
