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

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return isOverlayActive;
}
