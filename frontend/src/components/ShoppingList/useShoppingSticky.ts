import { useState, useEffect } from 'react';

/**
 * Tracks scroll position to collapse the sticky shopping header (tabs & progress)
 * when scrolling down past the page header.
 */
export function useShoppingSticky() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapseSentinel, setCollapseSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const stickyTopHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
        10
      );

      const stickyBar = document.getElementById('shopping-sticky-header');
      if (stickyBar) {
        const barRect = stickyBar.getBoundingClientRect();
        const isStuck = barRect.top <= stickyTopHeight + 1;
        const isPastHeader = collapseSentinel
          ? collapseSentinel.getBoundingClientRect().top <= stickyTopHeight + 2
          : isStuck;
        setIsCollapsed(isStuck && isPastHeader);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [collapseSentinel]);

  return {
    isCollapsed,
    setCollapseSentinel,
  };
}
