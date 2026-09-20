/**
 * Global Animation & Motion Configuration
 * Provides centralized tokens, helpers, and reduced-motion safety guards.
 */

// ─── Timing & Easing Tokens ──────────────────────────────────────────────────

export const MOTION_EASINGS = {
  /** Snappy spring with pleasant overshoot — ideal for small micro-interactions */
  springSnappy: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** Gentle smooth curve — ideal for step transitions and full card movements */
  springSmooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Material-like standard decelerate */
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Standard ease-out */
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const MOTION_DURATIONS = {
  instant: 0,
  fast: 200,
  normal: 280,
  smooth: 320,
  slow: 450,
} as const;

// ─── Accessibility: Reduced Motion Guard ─────────────────────────────────────

/**
 * Checks if the user or operating system prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── Directional Step Transitions (Cooking Mode / Multi-step Flows) ──────────

export type SlideDirection = 'forward' | 'backward' | 'none';

/**
 * Returns the CSS animation class for step-by-step slide transitions.
 * Gracefully degrades to a simple fade-in if reduced-motion is requested.
 */
export function getStepSlideClass(direction: SlideDirection = 'forward'): string {
  if (direction === 'none' || prefersReducedMotion()) {
    return 'animate-fade-in';
  }
  return direction === 'forward' ? 'animate-step-in-right' : 'animate-step-in-left';
}

// ─── Directional Tab Transitions (Saved Catalog / View Switchers) ────────────

export type TabSlideDirection = 'left' | 'right' | 'none';

/**
 * Returns the CSS animation class for horizontal tab transitions.
 */
export function getTabSlideClass(direction: TabSlideDirection = 'none'): string {
  if (direction === 'none' || prefersReducedMotion()) {
    return 'animate-fade-in';
  }
  return direction === 'left' ? 'animate-tab-in-left' : 'animate-tab-in-right';
}

// ─── Modal / Dialog / Sheet Animations ───────────────────────────────────────

export type ModalAnimationType = 'fade' | 'slide-up' | 'scale';

/**
 * Returns the CSS animation class for overlay and modal entries.
 */
export function getModalAnimationClass(type: ModalAnimationType = 'scale'): string {
  if (prefersReducedMotion()) {
    return 'animate-fade-in';
  }
  switch (type) {
    case 'slide-up':
      return 'animate-fade-in-up';
    case 'scale':
      return 'animate-fade-in';
    default:
      return 'animate-fade-in';
  }
}
