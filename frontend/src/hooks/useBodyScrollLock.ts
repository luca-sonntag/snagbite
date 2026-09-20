import { useEffect, useRef } from 'react';

/**
 * Unconditionally and completely unlocks scrolling on both documentElement and body.
 * Removes inline overflow and overscroll-behavior styles and resets them to empty string.
 * Never restores a previously 'hidden' overflow value.
 */
export function forceUnlockBodyScroll(): void {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;

  html.style.removeProperty('overflow');
  body.style.removeProperty('overflow');
  html.style.removeProperty('overscroll-behavior');
  body.style.removeProperty('overscroll-behavior');
  html.style.removeProperty('padding-right');
  body.style.removeProperty('padding-right');
  html.style.removeProperty('scrollbar-gutter');
  body.style.removeProperty('scrollbar-gutter');

  if (html.style.overflow) {
    html.style.overflow = '';
  }
  if (body.style.overflow) {
    body.style.overflow = '';
  }
  if (body.style.overscrollBehavior) {
    body.style.overscrollBehavior = '';
  }
}

/**
 * Robust cross-platform body scroll lock for modals, sheets, and overlays.
 * Locks both documentElement and body without setting position: fixed.
 *
 * When unlocked, forcefully restores scrolling both immediately and after delayed
 * timeouts (150ms, 350ms) to counteract late unmount animations from HeroUI / React Aria
 * (usePreventScroll) which might write back their cached 'hidden' overflow values.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isLocked) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      return () => {
        // Immediate release when lock condition turns false or unmounts
        forceUnlockBodyScroll();

        // Delayed check to counteract late React Aria / HeroUI exit animations restoring 'hidden'
        setTimeout(() => {
          if (!isLockedRef.current) {
            document.documentElement.style.removeProperty('overflow');
            document.body.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('padding-right');
            document.documentElement.style.removeProperty('scrollbar-gutter');
            forceUnlockBodyScroll();
          }
        }, 350);
      };
    } else {
      // Immediate unconditional release when not locked
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overscroll-behavior');
      document.body.style.removeProperty('overscroll-behavior');
      forceUnlockBodyScroll();

      // Catch late unmount cleanups from HeroUI / React Aria (transitions typically 200-300ms)
      const t1 = setTimeout(() => {
        if (!isLockedRef.current) {
          forceUnlockBodyScroll();
        }
      }, 150);

      const t2 = setTimeout(() => {
        if (!isLockedRef.current) {
          document.documentElement.style.removeProperty('overflow');
          document.body.style.removeProperty('overflow');
          document.documentElement.style.removeProperty('padding-right');
          document.documentElement.style.removeProperty('scrollbar-gutter');
          forceUnlockBodyScroll();
        }
      }, 350);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isLocked]);
}

export default useBodyScrollLock;

