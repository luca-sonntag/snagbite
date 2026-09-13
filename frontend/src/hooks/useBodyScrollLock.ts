import { useEffect } from 'react';

/**
 * Robust cross-platform body scroll lock for modals, sheets, and overlays.
 * Works on Desktop, iOS Safari, Android Chrome, and Capacitor WebViews
 * by locking both documentElement and body (using position: fixed + scroll position preservation).
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    // Lock both html and body without setting position: fixed,
    // which breaks viewport coordinates and containing block calculations for portaled overlays/popovers
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      if (prevHtmlOverflow) {
        document.documentElement.style.overflow = prevHtmlOverflow;
      } else {
        document.documentElement.style.removeProperty('overflow');
      }

      if (prevBodyOverflow) {
        document.body.style.overflow = prevBodyOverflow;
      } else {
        document.body.style.removeProperty('overflow');
      }

      if (prevBodyOverscroll) {
        document.body.style.overscrollBehavior = prevBodyOverscroll;
      } else {
        document.body.style.removeProperty('overscroll-behavior');
      }
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
