import { useState, useEffect } from 'react';

/**
 * Tracks scroll position to collapse the sticky shopping header (revealing compact progress)
 * when scrolling down past the full progress card sentinel, exactly like RecipeDetails.
 */
export function useShoppingSticky(isActive: boolean = true) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapseSentinel, setCollapseSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleScroll = () => {
      // If user is at or near the very top of the page, header is never collapsed
      if (window.scrollY <= 2) {
        setIsCollapsed(false);
        return;
      }

      const stickyBar = document.getElementById('shopping-sticky-header');
      if (!stickyBar || stickyBar.offsetParent === null) {
        setIsCollapsed(false);
        return;
      }

      const barRect = stickyBar.getBoundingClientRect();
      // Element is hidden or has no rendered dimensions
      if (barRect.height === 0 || barRect.width === 0) {
        setIsCollapsed(false);
        return;
      }

      const stickyTopHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
        10
      );

      const isStuck = barRect.top <= stickyTopHeight + 1;
      const isPastHeader =
        collapseSentinel && collapseSentinel.offsetParent !== null
          ? collapseSentinel.getBoundingClientRect().top <= stickyTopHeight + barRect.height + 2
          : isStuck;
      setIsCollapsed(isStuck && isPastHeader);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run after frame to ensure DOM layout measurements are ready
    const frameId = requestAnimationFrame(handleScroll);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [collapseSentinel, isActive]);

  return {
    isCollapsed: isActive ? isCollapsed : false,
    setCollapseSentinel,
  };
}
