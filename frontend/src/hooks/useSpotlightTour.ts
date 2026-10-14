import { useEffect, useRef } from 'react';
import type { ScreenTourId } from '../types/tour';
import { useSpotlightTourContext } from '../context/SpotlightTourContext';

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

  const isCompleted = isTourCompleted(screenId);
  const isTourActive = activeTourId === screenId;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !autoStart || isCompleted || activeTourId !== null) {
      return;
    }

    timerRef.current = setTimeout(() => {
      startTour(screenId);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [screenId, enabled, autoStart, isCompleted, activeTourId, delayMs, startTour]);

  return {
    isCompleted,
    isTourActive,
    startTour: () => startTour(screenId),
  };
}
