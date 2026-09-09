import { useEffect } from 'react';

/**
 * Robust cross-platform body scroll lock for modals, sheets, and overlays.
 * Works on Desktop, iOS Safari, Android Chrome, and Capacitor WebViews
 * by locking both documentElement and body (using position: fixed + scroll position preservation).
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    const scrollY = window.scrollY;
    // Lock both html and body
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('left');
      document.body.style.removeProperty('right');
      document.body.style.removeProperty('width');

      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
