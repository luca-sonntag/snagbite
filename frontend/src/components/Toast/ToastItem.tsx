import React, { useRef, useState } from 'react';
import { Check, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import type { ToastItemData, ToastType } from './types';

interface ToastItemProps {
  toast: ToastItemData;
  onDismiss: (id: string) => void;
}

export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const touchStartY = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) setDragOffsetY(diff);
  };

  const handleTouchEnd = () => {
    if (dragOffsetY > 25) {
      onDismiss(toast.id);
    } else {
      setDragOffsetY(0);
    }
    touchStartY.current = null;
  };

  const getIcon = (type: ToastType) => {
    if (toast.icon) return toast.icon;
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-white stroke-[2.5px]" />;
      case 'info':
        return <Info className="w-5 h-5 text-white stroke-[2.25px]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-white stroke-[2.25px]" />;
      case 'danger':
        return <AlertCircle className="w-5 h-5 text-white stroke-[2.25px]" />;
    }
  };

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 text-white shadow-[0_8px_30px_rgba(5,150,105,0.4)]';
      case 'info':
        return 'bg-blue-600 text-white shadow-[0_8px_30px_rgba(37,99,235,0.4)]';
      case 'warning':
        return 'bg-amber-500 text-white shadow-[0_8px_30px_rgba(245,158,11,0.4)]';
      case 'danger':
        return 'bg-rose-600 text-white shadow-[0_8px_30px_rgba(225,29,72,0.4)]';
    }
  };

  const animationClass = toast.isExiting
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
      className={`pointer-events-auto w-4/5 max-w-md ${getTypeStyles(
        toast.type
      )} rounded-2xl md:rounded-3xl border-none p-3.5 flex items-center gap-3 transition-transform duration-100 cursor-pointer select-none active:scale-[0.98] ${animationClass}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon Medallion */}
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/20 text-white backdrop-blur-xs">
        {getIcon(toast.type)}
      </div>

      {/* Text Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
          {toast.title}
        </h4>
        {toast.description && (
          <div className="text-[11px] sm:text-xs text-white/90 font-medium leading-snug mt-0.5 break-words">
            {toast.description}
          </div>
        )}
      </div>

      {toast.action && (
        <span className="text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-xl shrink-0 backdrop-blur-xs">
          {toast.action.label}
        </span>
      )}
    </div>
  );
}
