import { useState, useEffect, useCallback, useRef } from 'react';
import type { Recipe } from '../../types';
import type { RecipeSectionId } from './types';

const SECTIONS: RecipeSectionId[] = ['details', 'ingredients', 'instructions'];

/**
 * Tracks scroll position to update both active navigation section (scroll spy)
 * and compact title row in sticky sub-navigation.
 */
export function useScrollSpy(recipe: Recipe) {
  const [activeSection, setActiveSection] = useState<RecipeSectionId>('details');
  const [collapseSentinel, setCollapseSentinel] = useState<HTMLDivElement | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

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

      // If user clicked a tab, let the programmatic smooth scroll finish without overriding
      if (isClickScrollingRef.current) return;

      // 2. Check if near bottom of page -> activate last section
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight >= documentHeight - 60) {
        setActiveSection(SECTIONS[SECTIONS.length - 1]);
        return;
      }

      // 3. Section scroll spy: Find which section is currently active
      const stickyBar = document.getElementById('recipe-sticky-bar');
      const barHeight = stickyBar?.offsetHeight ?? 44;
      const triggerOffset = stickyTopHeight + barHeight + 40;

      let currentSection: RecipeSectionId = 'details';
      for (const sectionId of SECTIONS) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= triggerOffset) {
            currentSection = sectionId;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [recipe, collapseSentinel]);

  const scrollToSection = useCallback((sectionId: RecipeSectionId) => {
    // Immediately set active tab
    setActiveSection(sectionId);
    isClickScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    // Re-enable scroll spy after smooth scroll animation completes
    scrollTimeoutRef.current = window.setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 800);

    const el = document.getElementById(sectionId);
    if (!el) return;

    const stickyTopHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
      10
    );
    const bar = document.getElementById('recipe-sticky-bar');
    const barHeight = bar?.offsetHeight ?? 44;
    const reserved = Math.max(barHeight, 60);
    const offset = stickyTopHeight + reserved + 16;
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: Math.max(0, elementPosition - offset),
      behavior: 'smooth',
    });
  }, []);

  return {
    activeSection,
    isHeaderCollapsed,
    setCollapseSentinel,
    scrollToSection,
  };
}
