import { useState, useEffect, useRef, useCallback } from 'react';
import { getMonday, formatDateIso } from './mealPlannerUtils';

interface UseMealPlanScrollSpyOptions {
  agendaDates: string[];
  currentWeekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  onDeselectDay?: () => void;
}

export function useMealPlanScrollSpy({
  agendaDates,
  currentWeekStart,
  onWeekChange,
  onDeselectDay,
}: UseMealPlanScrollSpyOptions) {
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentWeekStartRef = useRef(currentWeekStart);
  currentWeekStartRef.current = currentWeekStart;

  const onWeekChangeRef = useRef(onWeekChange);
  onWeekChangeRef.current = onWeekChange;

  const onDeselectDayRef = useRef(onDeselectDay);
  onDeselectDayRef.current = onDeselectDay;

  // Deselect active day when user manually scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (!isProgrammaticScrollRef.current) {
        onDeselectDayRef.current?.();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smoothly scroll to a target date section in the agenda stream
  const scrollToDate = useCallback(
    (
      targetDateStr: string,
      behavior: ScrollBehavior = 'smooth',
      align: 'start' | 'center' = 'start',
    ) => {
      const element = document.getElementById(`day-section-${targetDateStr}`);
      if (!element) return;

      isProgrammaticScrollRef.current = true;
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);

      // Trigger visual highlight pulse
      setHighlightedDate(targetDateStr);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedDate(null);
      }, 1400);

      const targetMonday = getMonday(new Date(targetDateStr + 'T00:00:00'));
      if (formatDateIso(targetMonday) !== formatDateIso(currentWeekStartRef.current)) {
        onWeekChangeRef.current(targetMonday);
      }

      // Calculate sticky header & available viewport area
      const stickyHeader = document.getElementById('meal-planner-sticky-header');
      const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 180;
      const bottomNavOffset = 64;
      const availableHeight = Math.max(200, window.innerHeight - headerHeight - bottomNavOffset);

      const elementRect = element.getBoundingClientRect();
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;

      let targetY: number;
      if (align === 'center' && elementRect.height < availableHeight) {
        const targetCenterInViewport = headerHeight + availableHeight / 2;
        const elementCenterInDoc = currentScrollY + elementRect.top + elementRect.height / 2;
        targetY = elementCenterInDoc - targetCenterInViewport;
      } else {
        targetY = currentScrollY + elementRect.top - (headerHeight + 8);
      }

      window.scrollTo({
        top: Math.max(0, targetY),
        behavior,
      });
    },
    [],
  );

  // IntersectionObserver to keep sticky week navigator in sync during scrolling
  useEffect(() => {
    if (agendaDates.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        // Find intersecting entries
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;

        // Sort by distance to top of viewport
        visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const topEntry = visibleEntries[0];
        const dateStr = topEntry.target.getAttribute('data-date');
        if (!dateStr) return;

        const newMonday = getMonday(new Date(dateStr + 'T00:00:00'));
        if (formatDateIso(newMonday) !== formatDateIso(currentWeekStartRef.current)) {
          onWeekChangeRef.current(newMonday);
        }
      },
      {
        rootMargin: '-140px 0px -60% 0px',
        threshold: [0, 0.2, 0.5],
      },
    );

    agendaDates.forEach((dateStr) => {
      const el = document.getElementById(`day-section-${dateStr}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [agendaDates]);

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  return {
    highlightedDate,
    scrollToDate,
  };
}

export default useMealPlanScrollSpy;
