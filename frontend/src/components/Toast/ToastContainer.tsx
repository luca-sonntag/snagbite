import { createPortal } from 'react-dom';
import type { ToastItemData } from './types';
import ToastItem from './ToastItem';

interface ToastContainerProps {
  toasts: ToastItemData[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 pointer-events-none flex flex-col-reverse items-center gap-2 p-3 sm:p-4 pb-[calc(var(--safe-area-inset-bottom,0px)+6rem)] z-[220]"
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
