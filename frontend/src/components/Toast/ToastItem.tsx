import React, { useRef, useState } from 'react';
import { Check, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import type { ToastItemData, ToastType } from './types';

interface ToastItemProps {
  toast: ToastItemData;
  onDismiss: (id: string) => void;
  placement?: 'top' | 'bottom';
}

export default function ToastItem({ toast, onDismiss, placement = 'bottom' }: ToastItemProps) {
  const touchStartY = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (placement === 'top') {
      if (diff < 0) setDragOffsetY(diff);
    } else {
      if (diff > 0) setDragOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (placement === 'top') {
      if (dragOffsetY < -25) {
        onDismiss(toast.id);
      } else {
        setDragOffsetY(0);
      }
    } else {
      if (dragOffsetY > 25) {
        onDismiss(toast.id);
      } else {
        setDragOffsetY(0);
      }
    }
    touchStartY.current = null;
  };

  const getIcon = (type: ToastType) => {
    if (toast.icon) return toast.icon;
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.5px]" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
    }
  };

  const getMedallionColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'info':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'danger':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    }
  };

  const animationClass =
    placement === 'top'
      ? toast.isExiting
        ? 'animate-toast-out-top'
        : 'animate-toast-in-top'
      : toast.isExiting
      ? 'animate-toast-out-bottom'
      : 'animate-toast-in-bottom';

  return (
    <div
      onClick={() => {
        if (toast.action) {
          toast.action.onClick();
        }
        onDismiss(toast.id);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragOffsetY !== 0 ? `translateY(${dragOffsetY}px)` : undefined,
        opacity: dragOffsetY !== 0 ? Math.max(0, 1 - Math.abs(dragOffsetY) / 80) : undefined,
      }}
      className={`pointer-events-auto w-4/5 max-w-md bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.14)] p-3 flex items-center gap-3 transition-transform duration-100 cursor-pointer select-none active:scale-[0.98] ${animationClass}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon Medallion */}
      <div
        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center flex-shrink-0 ${getMedallionColor(
          toast.type
        )}`}
      >
        {getIcon(toast.type)}
      </div>

      {/* Text Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug break-words">
          {toast.title}
        </h4>
        {toast.description && (
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5 break-words">
            {toast.description}
          </div>
        )}
      </div>
    </div>
  );
}
