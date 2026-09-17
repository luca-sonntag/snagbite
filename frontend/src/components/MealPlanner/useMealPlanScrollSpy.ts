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

  // Active viewport scroll listener to reliably sync the calendar week
  useEffect(() => {
    if (agendaDates.length === 0) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (isProgrammaticScrollRef.current) return;

        const stickyHeader = document.getElementById('meal-planner-sticky-header');
        const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 180;
        const scanLine = headerHeight + 40;

        let activeDateStr: string | null = null;

        for (const dateStr of agendaDates) {
          const el = document.getElementById(`day-section-${dateStr}`);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= scanLine && rect.bottom >= scanLine) {
            activeDateStr = dateStr;
            break;
          }
          if (rect.top > scanLine) {
            activeDateStr = dateStr;
            break;
          }
        }

        if (!activeDateStr && agendaDates.length > 0) {
          activeDateStr = agendaDates[agendaDates.length - 1];
        }

        if (activeDateStr) {
          const newMonday = getMonday(new Date(activeDateStr + 'T00:00:00'));
          const newMondayIso = formatDateIso(newMonday);
          const currentMondayIso = formatDateIso(currentWeekStartRef.current);

          if (newMondayIso !== currentMondayIso) {
            onWeekChangeRef.current(newMonday);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
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
