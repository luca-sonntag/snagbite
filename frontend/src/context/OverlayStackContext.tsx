import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { hideAdBanner, resumeAdBanner } from '../utils/ads';
import { useBodyScrollLock, forceUnlockBodyScroll } from '../hooks/useBodyScrollLock';

/**
 * Overlay-Stack: A stack-based registry that tracks open overlays
 * (dialogs, sheets, drawers, modals, paywalls) and integrates them directly
 * with the Android hardware back button.
 *
 * Capabilities:
 *  - Closes overlays in LIFO order (topmost first) on Android back press
 *  - Hides AdMob banners when any overlay is active
 *  - Locks body scroll when any overlay is active
 *  - Allows in-page states to register prioritised back-actions
 *
 * Usage in any overlay component:
 *   useModalOverlay(isOpen, onClose);
 */

export interface OverlayItem {
  id: string;
  onClose?: () => void;
}

export interface CustomBackHandler {
  id: string;
  priority: number;
  handler: () => boolean;
}

interface OverlayStackContextValue {
  /** Push an overlay with optional close callback. Returns unique overlay ID. */
  pushOverlay: (onClose?: () => void) => string;
  /** Pop an overlay by ID (or topmost if omitted). */
  popOverlay: (id?: string) => void;
  /** Update the onClose callback of an active overlay without altering stack order. */
  updateOverlay: (id: string, onClose?: () => void) => void;
  /** Handle an Android hardware back button event. Returns true if handled. */
  handleBack: () => boolean;
  /** Reactive boolean: true when any overlay is currently open. */
  isAnyOverlayOpen: boolean;
  /** Register a custom back-action handler with an optional priority. */
  registerBackHandler: (handler: () => boolean, priority?: number) => () => void;
}

let nextOverlayId = 0;
let nextHandlerId = 0;

const OverlayStackContext = createContext<OverlayStackContextValue | undefined>(undefined);

const fallbackOverlayStack: OverlayStackContextValue = {
  pushOverlay: () => '',
  popOverlay: () => {},
  updateOverlay: () => {},
  handleBack: () => false,
  isAnyOverlayOpen: false,
  registerBackHandler: () => () => {},
};

export function useOverlayStack(): OverlayStackContextValue {
  const ctx = useContext(OverlayStackContext);
  return ctx ?? fallbackOverlayStack;
}

/**
 * Convenience hook: automatically pushes/pops the overlay stack when `isOpen` changes.
 * When an Android Back event occurs, `onClose` is invoked and the event is consumed.
 */
export function useModalOverlay(isOpen: boolean, onClose?: () => void): void {
  const { pushOverlay, popOverlay, updateOverlay } = useOverlayStack();
  const idRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen && !idRef.current) {
      const id = pushOverlay(() => onCloseRef.current?.());
      idRef.current = id;
    } else if (!isOpen && idRef.current) {
      popOverlay(idRef.current);
      idRef.current = null;
    }
  }, [isOpen, pushOverlay, popOverlay]);

  // Keep latest onClose callback in sync
  useEffect(() => {
    if (idRef.current && onClose) {
      updateOverlay(idRef.current, () => onCloseRef.current?.());
    }
  }, [onClose, updateOverlay]);

  // Safety: pop on unmount if still open
  useEffect(() => {
    return () => {
      if (idRef.current) {
        popOverlay(idRef.current);
        idRef.current = null;
      }
    };
  }, [popOverlay]);
}

/**
 * @deprecated Use `useModalOverlay` instead. Renamed for clarity since overlays are not ads.
 */
export const useAdOverlay = useModalOverlay;

/**
 * Register an in-page back-button handler (e.g. for selection mode or active search).
 * Handlers run in descending priority order when no modal overlays are active.
 */
export function useBackHandler(
  isActive: boolean,
  onBack: () => boolean | void,
  priority: number = 0
): void {
  const { registerBackHandler } = useOverlayStack();
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isActive) return;
    return registerBackHandler(() => {
      const result = onBackRef.current();
      return result !== false;
    }, priority);
  }, [isActive, priority, registerBackHandler]);
}

export function OverlayStackProvider({ children }: { children: React.ReactNode }) {
  const overlaysRef = useRef<OverlayItem[]>([]);
  const customHandlersRef = useRef<CustomBackHandler[]>([]);
  const [isAnyOverlayOpen, setIsAnyOverlayOpen] = useState(false);

  // Global scroll lock: locks documentElement and body whenever any overlay is open
  useBodyScrollLock(isAnyOverlayOpen);

  const pushOverlay = useCallback((onClose?: () => void) => {
    const id = `overlay_${++nextOverlayId}`;
    overlaysRef.current.push({ id, onClose });
    if (overlaysRef.current.length === 1) {
      setIsAnyOverlayOpen(true);
      void hideAdBanner();
    }
    return id;
  }, []);

  const popOverlay = useCallback((id?: string) => {
    if (id) {
      overlaysRef.current = overlaysRef.current.filter((item) => item.id !== id);
    } else {
      overlaysRef.current.pop();
    }
    if (overlaysRef.current.length === 0) {
      setIsAnyOverlayOpen(false);
      void resumeAdBanner();

      // Unconditionally clear scroll lock styles immediately
      forceUnlockBodyScroll();
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overscroll-behavior');
      document.body.style.removeProperty('overscroll-behavior');
      document.documentElement.style.removeProperty('padding-right');
      document.body.style.removeProperty('padding-right');

      // Delayed cleanup to counteract late unmount animations from HeroUI / React Aria
      setTimeout(() => {
        if (overlaysRef.current.length === 0) {
          forceUnlockBodyScroll();
          document.documentElement.style.removeProperty('overflow');
          document.body.style.removeProperty('overflow');
          document.documentElement.style.removeProperty('overscroll-behavior');
          document.body.style.removeProperty('overscroll-behavior');
          document.documentElement.style.removeProperty('padding-right');
          document.body.style.removeProperty('padding-right');
          document.documentElement.style.removeProperty('scrollbar-gutter');
        }
      }, 350);
    }
  }, []);

  const updateOverlay = useCallback((id: string, onClose?: () => void) => {
    const item = overlaysRef.current.find((entry) => entry.id === id);
    if (item) {
      item.onClose = onClose;
    }
  }, []);

  const registerBackHandler = useCallback((handler: () => boolean, priority: number = 0) => {
    const id = `back_handler_${++nextHandlerId}`;
    customHandlersRef.current.push({ id, priority, handler });
    return () => {
      customHandlersRef.current = customHandlersRef.current.filter((h) => h.id !== id);
    };
  }, []);

  const handleBack = useCallback(() => {
    // 1. Topmost overlay in LIFO stack has highest priority
    const stack = overlaysRef.current;
    if (stack.length > 0) {
      for (let i = stack.length - 1; i >= 0; i--) {
        const entry = stack[i];
        if (entry.onClose) {
          entry.onClose();
          return true;
        }
      }
      // If overlays are open but lack onClose, still block back to avoid app exit
      return true;
    }

    // 2. Custom in-page back handlers (sorted by priority descending)
    const handlers = [...customHandlersRef.current].sort((a, b) => b.priority - a.priority);
    for (const item of handlers) {
      try {
        if (item.handler()) {
          return true;
        }
      } catch (err) {
        console.error('[OverlayStack] Custom back handler error:', err);
      }
    }

    return false;
  }, []);

  return (
    <OverlayStackContext.Provider
      value={{
        pushOverlay,
        popOverlay,
        updateOverlay,
        handleBack,
        isAnyOverlayOpen,
        registerBackHandler,
      }}
    >
      {children}
    </OverlayStackContext.Provider>
  );
}

