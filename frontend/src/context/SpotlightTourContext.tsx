import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ScreenTourId, TourState, SpotlightTourContextValue } from '../types/tour';
import { TOUR_DEFINITIONS } from '../utils/tourDefinitions';
import { useI18n } from './I18nContext';
import { useAuth } from './AuthContext';
import { useModalOverlay } from './OverlayStackContext';
import { hapticLight } from '../utils/haptics';

const STORAGE_KEY = 'snagbite_tour_state_v1';

const defaultTourState: TourState = {
  extract: false,
  catalog: false,
  recipeDetails: false,
  cookingMode: false,
  shoppingList: false,
};

function loadStoredTourState(): TourState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTourState;
    const parsed = JSON.parse(raw);
    return { ...defaultTourState, ...parsed };
  } catch {
    return defaultTourState;
  }
}

const SpotlightTourContext = createContext<SpotlightTourContextValue | null>(null);

export const SpotlightTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  const { updateUserMetadata } = useAuth();
  const [tourState, setTourState] = useState<TourState>(loadStoredTourState);
  const [activeTourId, setActiveTourId] = useState<ScreenTourId | null>(null);
  const driverRef = useRef<{ destroy: () => void } | null>(null);

  const isTourCompleted = useCallback(
    (id: ScreenTourId): boolean => !!tourState[id],
    [tourState]
  );

  const markTourCompleted = useCallback(
    (id: ScreenTourId) => {
      setTourState((prev) => {
        const next = { ...prev, [id]: true };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        // Best-effort sync to user metadata
        updateUserMetadata({ tours_completed: next }).catch(() => {});
        return next;
      });
    },
    [updateUserMetadata]
  );

  const stopActiveTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    setActiveTourId(null);
  }, []);

  // Trap Android hardware back button while a tour is active
  useModalOverlay(!!activeTourId, stopActiveTour);

  const startTour = useCallback(
    async (id: ScreenTourId) => {
      const stepConfigs = TOUR_DEFINITIONS[id];
      if (!stepConfigs || stepConfigs.length === 0) return;

      // Filter steps to those currently present in DOM
      const availableSteps = stepConfigs.filter(
        (cfg) => !!document.querySelector(cfg.elementSelector)
      );
      if (availableSteps.length === 0) return;

      try {
        const { driver } = await import('driver.js');

        const driveSteps = availableSteps.map((cfg) => ({
          element: cfg.elementSelector,
          popover: {
            title: t(cfg.titleKey),
            description: t(cfg.descKey),
            side: cfg.side ?? 'bottom',
            align: cfg.align ?? 'center',
          },
        }));

        const rawProgress = t('tour.progress');
        const progressText = rawProgress
          .replace(/(?<!\{)\{current\}(?!\})/g, '{{current}}')
          .replace(/(?<!\{)\{total\}(?!\})/g, '{{total}}');

        const d = driver({
          showProgress: true,
          animate: true,
          duration: 300,
          stageRadius: 20,
          stagePadding: 8,
          allowClose: true,
          nextBtnText: t('tour.btn.next'),
          prevBtnText: t('tour.btn.prev'),
          doneBtnText: t('tour.btn.done'),
          progressText,
          onHighlightStarted: () => {
            hapticLight();
          },
          onDestroyed: () => {
            markTourCompleted(id);
            setActiveTourId(null);
            driverRef.current = null;
          },
        });

        d.setSteps(driveSteps);
        driverRef.current = d;
        setActiveTourId(id);
        d.drive();
      } catch (err) {
        console.warn('Failed to launch tour:', err);
      }
    },
    [t, markTourCompleted]
  );

  const resetAllTours = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setTourState(defaultTourState);
    updateUserMetadata({ tours_completed: defaultTourState }).catch(() => {});
  }, [updateUserMetadata]);

  // Global event listener for resetting tours from other components (e.g. SettingsView)
  useEffect(() => {
    const handleReset = () => resetAllTours();
    window.addEventListener('app:reset-tours', handleReset);
    return () => window.removeEventListener('app:reset-tours', handleReset);
  }, [resetAllTours]);

  return (
    <SpotlightTourContext.Provider
      value={{
        isTourCompleted,
        markTourCompleted,
        startTour,
        resetAllTours,
        activeTourId,
      }}
    >
      {children}
    </SpotlightTourContext.Provider>
  );
};

export function useSpotlightTourContext(): SpotlightTourContextValue {
  const context = useContext(SpotlightTourContext);
  if (!context) {
    throw new Error('useSpotlightTourContext must be used within SpotlightTourProvider');
  }
  return context;
}
