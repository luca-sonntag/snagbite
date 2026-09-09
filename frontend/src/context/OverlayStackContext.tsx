import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { hideAdBanner, resumeAdBanner } from '../utils/ads';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

/**
 * Overlay-Stack: A ref-counted registry that tracks how many overlays
 * (dialogs, sheets, drawers, modals, paywalls) are currently open.
 *
 * When the count transitions from 0 → 1:
 *  - Native AdMob banner is hidden
 *  - Underlying body and html scroll is locked (preserving scroll position)
 *
 * When the count transitions back to 0:
 *  - Native AdMob banner is resumed
 *  - Underlying scroll is restored to the previous position
 *
 * Usage in any overlay component:
 *   useModalOverlay(isOpen);
 */

interface OverlayStackContextValue {
  /** Call when an overlay opens. Returns the new stack depth. */
  pushOverlay: () => number;
  /** Call when an overlay closes. Returns the new stack depth. */
  popOverlay: () => number;
  /** Reactive depth counter — true when at least one overlay is open. */
  isAnyOverlayOpen: boolean;
}

const OverlayStackContext = createContext<OverlayStackContextValue | undefined>(undefined);

const fallbackOverlayStack: OverlayStackContextValue = {
  pushOverlay: () => 0,
  popOverlay: () => 0,
  isAnyOverlayOpen: false,
};

export function useOverlayStack(): OverlayStackContextValue {
  const ctx = useContext(OverlayStackContext);
  return ctx ?? fallbackOverlayStack;
}

/**
 * Convenience hook: automatically pushes/pops the overlay stack when `isOpen` changes.
 * Drop this single line into any overlay component (modal, sheet, dialog, drawer) that accepts an `isOpen` prop.
 * Ensures native AdMob banners are hidden while active to prevent covering action buttons.
 */
export function useModalOverlay(isOpen: boolean): void {
  const { pushOverlay, popOverlay } = useOverlayStack();
  const pushed = useRef(false);

  useEffect(() => {
    if (isOpen && !pushed.current) {
      pushed.current = true;
      pushOverlay();
    } else if (!isOpen && pushed.current) {
      pushed.current = false;
      popOverlay();
    }
  }, [isOpen, pushOverlay, popOverlay]);

  // Safety: pop on unmount if still pushed
  useEffect(() => {
    return () => {
      if (pushed.current) {
        pushed.current = false;
        popOverlay();
      }
    };
  }, [popOverlay]);
}

/**
 * @deprecated Use `useModalOverlay` instead. Renamed for clarity since overlays are not ads.
 */
export const useAdOverlay = useModalOverlay;

export function OverlayStackProvider({ children }: { children: React.ReactNode }) {
  const depth = useRef(0);
  const [isAnyOverlayOpen, setIsAnyOverlayOpen] = useState(false);

  // Global scroll lock: locks documentElement and body whenever any overlay is open
  useBodyScrollLock(isAnyOverlayOpen);

  const pushOverlay = useCallback(() => {
    depth.current += 1;
    if (depth.current === 1) {
      setIsAnyOverlayOpen(true);
      void hideAdBanner();
    }
    console.log(`[OverlayStack] push → depth=${depth.current}`);
    return depth.current;
  }, []);

  const popOverlay = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) {
      setIsAnyOverlayOpen(false);
      void resumeAdBanner();
    }
    console.log(`[OverlayStack] pop → depth=${depth.current}`);
    return depth.current;
  }, []);

  return (
    <OverlayStackContext.Provider value={{ pushOverlay, popOverlay, isAnyOverlayOpen }}>
      {children}
    </OverlayStackContext.Provider>
  );
}
