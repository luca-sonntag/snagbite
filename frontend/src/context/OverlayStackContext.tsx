import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { hideAdBanner, resumeAdBanner } from '../utils/ads';

/**
 * Overlay-Stack: A simple ref-counted registry that tracks how many overlays
 * (dialogs, sheets, drawers, modals, paywalls) are currently open.
 *
 * When the count transitions from 0 → 1 the native AdMob banner is hidden.
 * When the count transitions back to 0 the banner is resumed.
 *
 * Usage in any overlay component:
 *   const { pushOverlay, popOverlay } = useOverlayStack();
 *   useEffect(() => { if (isOpen) { pushOverlay(); return popOverlay; } }, [isOpen]);
 *
 * Or use the convenience hook:
 *   useAdOverlay(isOpen);
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

export function useOverlayStack(): OverlayStackContextValue {
  const ctx = useContext(OverlayStackContext);
  if (!ctx) throw new Error('useOverlayStack must be used within an OverlayStackProvider');
  return ctx;
}

/**
 * Convenience hook: automatically pushes/pops the overlay stack when `isOpen` changes.
 * Drop this single line into any overlay component that accepts an `isOpen` prop.
 */
export function useAdOverlay(isOpen: boolean): void {
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

export function OverlayStackProvider({ children }: { children: React.ReactNode }) {
  const depth = useRef(0);
  const [isAnyOverlayOpen, setIsAnyOverlayOpen] = useState(false);

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
