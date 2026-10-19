import { useEffect, useRef } from 'react';
import type { ScreenTourId } from '../types/tour';
import { useSpotlightTourContext } from '../context/SpotlightTourContext';
import { useOverlayStack } from '../context/OverlayStackContext';
import { useAuth } from '../context/AuthContext';
import { TOUR_DEFINITIONS, isTourElementVisible } from '../utils/tourDefinitions';

interface UseSpotlightTourOptions {
  /** Whether to automatically launch the tour when ready. Default true. */
  autoStart?: boolean;
  /** Delay in milliseconds before triggering the tour (allows DOM paint). Default 500ms. */
  delayMs?: number;
  /** Guard condition (e.g. data is loaded, modal is visible). Default true. */
  enabled?: boolean;
}

export function useSpotlightTour(
  screenId: ScreenTourId,
  options: UseSpotlightTourOptions = {}
) {
  const { autoStart = true, delayMs = 500, enabled = true } = options;
  const { isTourCompleted, startTour, activeTourId } = useSpotlightTourContext();
  const { overlayCount } = useOverlayStack();
  const { loading: authLoading } = useAuth();

  const isCompleted = isTourCompleted(screenId);
  const isTourActive = activeTourId === screenId;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CookingMode itself registers 1 overlay on OverlayStackContext; all other screens expect 0.
  const expectedMaxOverlays = screenId === 'cookingMode' ? 1 : 0;
  const isBlockedByOverlay = authLoading || overlayCount > expectedMaxOverlays;

  useEffect(() => {
    if (!enabled || !autoStart || isCompleted || activeTourId !== null || isBlockedByOverlay) {
      return;
    }

    const tryStart = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        if (screenId !== 'cookingMode' && document.querySelector('[role="dialog"][aria-modal="true"]')) {
          return;
        }
        const firstStep = TOUR_DEFINITIONS[screenId]?.[0];
        const targetEl = firstStep ? document.querySelector(firstStep.elementSelector) : null;
        if (!isTourElementVisible(targetEl)) {
          return;
        }
        startTour(screenId);
      }, delayMs);
    };

    tryStart();

    // Re-check whenever the user navigates between tabs/routes via hashchange
    window.addEventListener('hashchange', tryStart);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('hashchange', tryStart);
    };
  }, [
    screenId,
    enabled,
    autoStart,
    isCompleted,
    activeTourId,
    isBlockedByOverlay,
    delayMs,
    startTour,
  ]);

  return {
    isCompleted,
    isTourActive,
    startTour: () => startTour(screenId),
  };
}
