import { useState, useEffect, useRef, useCallback } from 'react';
import { getMonday, formatDateIso } from './mealPlannerUtils';

interface UseMealPlanScrollSpyOptions {
  agendaDates: string[];
  currentWeekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
}

export function useMealPlanScrollSpy({
  agendaDates,
  currentWeekStart,
  onWeekChange,
}: UseMealPlanScrollSpyOptions) {
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentWeekStartRef = useRef(currentWeekStart);
  currentWeekStartRef.current = currentWeekStart;

  const onWeekChangeRef = useRef(onWeekChange);
  onWeekChangeRef.current = onWeekChange;

  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Smoothly scroll to a target date section in the agenda stream
  const scrollToDate = useCallback(
    (
      targetDateStr: string,
      behavior: ScrollBehavior = 'smooth',
      align: 'start' | 'center' = 'center',
    ) => {
      const performScroll = (retryCount = 0) => {
        const element = document.getElementById(`day-section-${targetDateStr}`);
        if (!element) {
          if (retryCount < 8) {
            requestAnimationFrame(() => {
              setTimeout(() => performScroll(retryCount + 1), 40);
            });
          }
          return;
        }

        if (scrollDebounceTimerRef.current) {
          clearTimeout(scrollDebounceTimerRef.current);
          scrollDebounceTimerRef.current = null;
        }

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
      };

      performScroll(0);
    },
    [],
  );

  // Center-weighted IntersectionObserver with rest-debounce to keep calendar header calm
  useEffect(() => {
    if (agendaDates.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        // Find entries intersecting the central screen zone
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;

        // Find the day section closest to the vertical center of the viewport
        const viewportCenter = window.innerHeight / 2;
        visibleEntries.sort((a, b) => {
          const aCenter = a.boundingClientRect.top + a.boundingClientRect.height / 2;
          const bCenter = b.boundingClientRect.top + b.boundingClientRect.height / 2;
          return Math.abs(aCenter - viewportCenter) - Math.abs(bCenter - viewportCenter);
        });

        const centerEntry = visibleEntries[0];
        const dateStr = centerEntry.target.getAttribute('data-date');
        if (!dateStr) return;

        const newMonday = getMonday(new Date(dateStr + 'T00:00:00'));
        const newMondayIso = formatDateIso(newMonday);
        const currentMondayIso = formatDateIso(currentWeekStartRef.current);

        if (newMondayIso !== currentMondayIso) {
          if (scrollDebounceTimerRef.current) {
            clearTimeout(scrollDebounceTimerRef.current);
          }
          // Rest-debounce: only switch weeks once scrolling pauses or slows down (~220ms)
          scrollDebounceTimerRef.current = setTimeout(() => {
            if (formatDateIso(newMonday) !== formatDateIso(currentWeekStartRef.current)) {
              onWeekChangeRef.current(newMonday);
            }
          }, 220);
        }
      },
      {
        rootMargin: '-35% 0px -35% 0px',
        threshold: [0, 0.1, 0.5],
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
      if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
    };
  }, []);

  return {
    highlightedDate,
    scrollToDate,
  };
}

export default useMealPlanScrollSpy;
