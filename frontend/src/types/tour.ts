export type ScreenTourId =
  | 'extract'
  | 'catalog'
  | 'recipeDetails'
  | 'cookingMode'
  | 'shoppingList'
  | 'mealPlanner';

export interface TourStepConfig {
  /** Target element selector (e.g. '#tour-extract-link') */
  elementSelector: string;
  /** Translation key for step title */
  titleKey: string;
  /** Translation key for step description */
  descKey: string;
  /** Preferred popover side placement */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Preferred popover alignment along side axis */
  align?: 'start' | 'center' | 'end';
}

export type TourState = Record<ScreenTourId, boolean>;

export interface SpotlightTourContextValue {
  /** Check if a specific tour has already been completed */
  isTourCompleted: (id: ScreenTourId) => boolean;
  /** Mark a specific tour as completed (persists locally & best-effort user metadata) */
  markTourCompleted: (id: ScreenTourId) => void;
  /** Trigger a tour on-demand for a screen (resets its seen status for this run) */
  startTour: (id: ScreenTourId) => void;
  /** Reset all screen tours so they will appear again */
  resetAllTours: () => void;
  /** Currently active running tour ID or null */
  activeTourId: ScreenTourId | null;
}
