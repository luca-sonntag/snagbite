import { useState, useEffect, useCallback } from 'react';
import type { Recipe } from '../../types';
import type { RecipeSectionId } from './types';

/**
 * Tracks scroll position to update both active navigation section (scroll spy)
 * and compact title row in sticky sub-navigation.
 */
export function useScrollSpy(recipe: Recipe) {
  const [activeSection, setActiveSection] = useState<RecipeSectionId>('details');
  const [collapseSentinel, setCollapseSentinel] = useState<HTMLDivElement | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const stickyTopHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
        10
      );

      // 1. Collapse state
      if (window.scrollY <= 2) {
        setIsHeaderCollapsed(false);
      } else {
        const stickyBar = document.getElementById('recipe-sticky-bar');
        if (stickyBar && stickyBar.offsetParent !== null) {
          const barRect = stickyBar.getBoundingClientRect();
          if (barRect.height > 0 && barRect.width > 0) {
            const isStuck = barRect.top <= stickyTopHeight + 1;
            const isPastHeader =
              collapseSentinel && collapseSentinel.offsetParent !== null
                ? collapseSentinel.getBoundingClientRect().top <= stickyTopHeight + 2
                : isStuck;
            setIsHeaderCollapsed(isStuck && isPastHeader);
          } else {
            setIsHeaderCollapsed(false);
          }
        } else {
          setIsHeaderCollapsed(false);
        }
      }

      // 2. Section scroll spy
      const sections: RecipeSectionId[] = ['ingredients', 'instructions', 'details'];
      const offset = stickyTopHeight + 48 + 120;
      const scrollPosition = window.scrollY + offset;
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [recipe, collapseSentinel]);

  const scrollToSection = useCallback((sectionId: RecipeSectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const stickyTopHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
      10
    );
    const bar = document.getElementById('recipe-sticky-bar');
    const barHeight = bar?.offsetHeight ?? 44;
    const reserved = Math.max(barHeight, 96);
    const offset = stickyTopHeight + reserved + 20;
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
  }, []);

  return {
    activeSection,
    isHeaderCollapsed,
    setCollapseSentinel,
    scrollToSection,
  };
}
