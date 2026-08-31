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
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');

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
        const rect = el.getBoundingClientRect();
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
          setPlacement('bottom');
        } else if (rect.top < 100 && rect.bottom > 100) {
          // Fullscreen or high modal: render toast at the top of viewport
          setBottomSheetHeight(null);
          setPlacement('top');
        } else {
          setBottomSheetHeight(null);
          setPlacement('bottom');
        }
      } else {
        setBottomSheetHeight(null);
        setPlacement('bottom');
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
        isAboveBottomSheet && placement === 'bottom'
          ? { paddingBottom: `calc(${bottomSheetHeight + 12}px + var(--safe-area-inset-bottom, 0px))` }
          : undefined
      }
      className={`fixed inset-x-0 pointer-events-none flex items-center gap-2 p-3 sm:p-4 transition-[padding] duration-200 z-[220] ${
        placement === 'top'
          ? 'top-0 flex-col pt-[calc(var(--safe-area-inset-top,0px)+1rem)]'
          : `bottom-0 flex-col-reverse ${
              !isAboveBottomSheet ? 'pb-[calc(var(--safe-area-inset-bottom,0px)+6rem)]' : ''
            }`
      }`}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          placement={placement}
        />
      ))}
    </div>,
    document.body
  );
}
