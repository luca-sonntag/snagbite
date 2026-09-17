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
      align: 'start' | 'center' = 'start',
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
        const targetMondayIso = formatDateIso(targetMonday);
        if (targetMondayIso !== formatDateIso(currentWeekStartRef.current)) {
          onWeekChangeRef.current(targetMonday);
        }

        // Calculate sticky header & available viewport area
        const stickyHeader = document.getElementById('meal-planner-sticky-header');
        const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 180;
        const bottomNavOffset = 64;
        const availableHeight = Math.max(200, window.innerHeight - headerHeight - bottomNavOffset);

        // Keep KW week header visible when scrolling to the beginning of a week
        const weekHeader = document.getElementById(`week-header-${targetMondayIso}`);
        let scrollTargetElement: HTMLElement = element;
        if (weekHeader) {
          const isFirstInWeek = element.parentElement?.querySelector('[data-date]') === element;
          if (isFirstInWeek || targetDateStr === targetMondayIso) {
            scrollTargetElement = weekHeader;
          }
        }

        const elementRect = scrollTargetElement.getBoundingClientRect();
        const currentScrollY = window.scrollY || document.documentElement.scrollTop;

        let targetY: number;
        if (align === 'center' && elementRect.height < availableHeight) {
          const targetCenterInViewport = headerHeight + availableHeight / 2;
          const elementCenterInDoc = currentScrollY + elementRect.top + elementRect.height / 2;
          targetY = elementCenterInDoc - targetCenterInViewport;
        } else {
          // Align directly below the sticky calendar header
          targetY = currentScrollY + elementRect.top - (headerHeight + 6);
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

  // IntersectionObserver with rest-debounce to keep calendar header calm
  useEffect(() => {
    if (agendaDates.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        // Find entries intersecting below the sticky calendar header
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;

        const stickyHeader = document.getElementById('meal-planner-sticky-header');
        const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 180;
        const targetActiveZone = headerHeight + 60;

        visibleEntries.sort((a, b) => {
          const aTop = a.boundingClientRect.top;
          const bTop = b.boundingClientRect.top;
          return Math.abs(aTop - targetActiveZone) - Math.abs(bTop - targetActiveZone);
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
        rootMargin: '-20% 0px -40% 0px',
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
