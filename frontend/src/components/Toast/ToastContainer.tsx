import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ToastItemData } from './types';
import ToastItem from './ToastItem';
import { useOverlayStack } from '../../context/OverlayStackContext';

interface ToastContainerProps {
  toasts: ToastItemData[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const { isAnyOverlayOpen } = useOverlayStack();
  const [bottomSheetHeight, setBottomSheetHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      // Find active modal or bottom sheet overlay
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"], [data-slot="dialog"], [data-slot="drawer"], [data-slot="modal"], div[class*="fixed inset-0"][class*="z-"] > div[class*="rounded-"]'
        )
      );

      // Filter to visible overlays that are actually on screen
      const visibleOverlays = candidates.filter((el) => {
        // Exclude the toast container itself and closing/hidden dialogs
        if (el.closest('[aria-live="polite"]')) return false;
        if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"], [data-state="closed"]')) return false;

        // Exclude floating popovers, dropdowns, contextual action menus, tooltips
        if (
          el.closest('[data-slot="popover"], [data-slot="menu"], [role="menu"], [role="tooltip"], [data-popover="true"]') ||
          el.getAttribute('data-slot') === 'popover' ||
          el.getAttribute('role') === 'menu'
        ) {
          return false;
        }

        const rect = el.getBoundingClientRect();

        // Popovers/menus are small floating boxes (< 300px), not bottom sheets or full modals
        // A true bottom sheet / modal covers a significant portion of the screen width
        const isWideOverlay = rect.width >= Math.min(window.innerWidth * 0.75, 340);
        const isFullDrawerOrModal = Boolean(el.closest('[data-slot="drawer"], [data-slot="modal"]'));
        if (!isWideOverlay && !isFullDrawerOrModal) {
          return false;
        }

        return (
          rect.height > 80 &&
          rect.width > 80 &&
          rect.top < window.innerHeight &&
          rect.bottom > 50 &&
          window.getComputedStyle(el).display !== 'none' &&
          window.getComputedStyle(el).visibility !== 'hidden' &&
          parseFloat(window.getComputedStyle(el).opacity || '1') > 0.05
        );
      });

      if (visibleOverlays.length > 0) {
        // Select topmost overlay
        const overlay = visibleOverlays[visibleOverlays.length - 1];
        const rect = overlay.getBoundingClientRect();

        if (rect.top >= 100 && rect.top < window.innerHeight - 80) {
          // Bottom sheet / bottom modal: anchor floating 12px above its top edge
          const heightFromBottom = Math.max(0, window.innerHeight - rect.top);
          setBottomSheetHeight(heightFromBottom);
        } else {
          setBottomSheetHeight(null);
        }
      } else {
        setBottomSheetHeight(null);
      }
    };

    updateHeight();
    const interval = setInterval(updateHeight, 80);
    window.addEventListener('resize', updateHeight);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateHeight);
    };
  }, [isAnyOverlayOpen, toasts]);

  if (toasts.length === 0) return null;

  const isAboveBottomSheet = bottomSheetHeight !== null;

  return createPortal(
    <div
      style={
        isAboveBottomSheet
          ? { paddingBottom: `calc(${bottomSheetHeight + 12}px + var(--safe-area-inset-bottom, 0px))` }
          : undefined
      }
      className={`fixed inset-x-0 bottom-0 pointer-events-none flex flex-col-reverse items-center gap-2 p-3 sm:p-4 transition-[padding] duration-200 z-[220] ${
        !isAboveBottomSheet ? 'pb-[calc(var(--safe-area-inset-bottom,0px)+6rem)]' : ''
      }`}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>,
    document.body
  );
}
