import { useState, useEffect } from 'react';

/**
 * Tracks scroll position to collapse the unified shopping card into a compact 1-line progress
 * when scrolling down, using a hysteresis buffer to eliminate jitter and flickering.
 */
export function useShoppingSticky(isActive: boolean = true) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setCollapseSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

      // Hysteresis buffer:
      // Collapse when scrolled down past 40px
      // Expand only when scrolled back near the top (< 15px)
      setIsCollapsed((prev) => {
        if (scrollY <= 15) return false;
        if (scrollY >= 40) return true;
        return prev;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isActive]);

  return {
    isCollapsed: isActive ? isCollapsed : false,
    setCollapseSentinel,
  };
}
