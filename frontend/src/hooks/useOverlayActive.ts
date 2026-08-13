import { useState, useEffect } from 'react';

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
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const dialog = document.querySelector(
          '[role="dialog"], [aria-modal="true"], [data-slot="backdrop"]'
        );
        setIsOverlayActive(!!dialog);
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
