import { useState, useEffect } from 'react';
import { hideExtractionBanner } from '../utils/ads';

/**
 * Automatically detects whether any overlay (HeroUI Modal, Drawer, Dialog,
 * Paywall, or Portal) is currently active on screen by observing DOM mutations
 * for modal dialogs, backdrop elements, and active React overlay states.
 */
export function useOverlayActive(): boolean {
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;

    const checkOverlay = () => {
      const dialog = document.querySelector(
        '[role="dialog"], [aria-modal="true"], [data-slot="backdrop"]'
      );
      const active = !!dialog;

      // If an overlay DOM node is present, trigger native hide immediately in 0ms microtask
      if (active) {
        void hideExtractionBanner();
      }

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setIsOverlayActive(active);
      });
    };

    // Initial check
    checkOverlay();

    // Observe body for added/removed overlay nodes
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Instant touch capture: Hide banner the exact millisecond the user touches any button/trigger
    const handleInstantTouch = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest(
        'button, [role="button"], [data-slot="trigger"], [data-paywall], a, [onclick]'
      );
      if (isInteractive) {
        void hideExtractionBanner();
      }
    };

    window.addEventListener('pointerdown', handleInstantTouch, { capture: true, passive: true });
    window.addEventListener('touchstart', handleInstantTouch, { capture: true, passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('pointerdown', handleInstantTouch, { capture: true });
      window.removeEventListener('touchstart', handleInstantTouch, { capture: true });
    };
  }, []);

  return isOverlayActive;
}
