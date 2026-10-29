import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlaystoreScreenshot } from './playstoreScreenshotsData';

interface PlaystoreFullscreenModalProps {
  screenshots: PlaystoreScreenshot[];
  activeIndex: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  swipeOffset: number;
  isDragging: boolean;
  onTouchStart: (x: number, y: number) => void;
  onTouchMove: (x: number) => void;
  onTouchEnd: () => void;
}

export default function PlaystoreFullscreenModal({
  screenshots,
  activeIndex,
  onClose,
  onPrev,
  onNext,
  swipeOffset,
  isDragging,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: PlaystoreFullscreenModalProps) {
  if (activeIndex === null || screenshots.length === 0) return null;

  const currentItem = screenshots[activeIndex];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot Vollbildansicht"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none touch-none animate-fade-in"
    >
      {/* Top Bar: Title & Close Button */}
      <div
        className="w-full max-w-4xl flex items-center justify-between text-white pt-2 sm:pt-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0 pr-4">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
            {currentItem.title}
          </span>
          <p className="text-sm text-gray-300 truncate m-0">{currentItem.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border-none shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage with Swipe Translation */}
      <div
        className="relative w-full flex-1 flex items-center justify-center overflow-hidden my-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => onTouchStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onTouchMove(e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        {/* Left Arrow (Desktop) */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Vorheriges Bild"
            className="hidden sm:flex absolute left-4 z-20 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/50 hover:bg-black/75 active:scale-95 text-white items-center justify-center transition-all cursor-pointer border-none shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Scaled & Centered Screenshot (9:16 Aspect Ratio) */}
        <div
          className={`h-full max-h-[78vh] sm:max-h-[82vh] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl transition-transform ${
            isDragging ? 'duration-0' : 'duration-300 ease-out'
          }`}
          style={{ transform: `translateX(${swipeOffset}px)` }}
        >
          <img
            src={currentItem.src}
            alt={currentItem.alt}
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>

        {/* Right Arrow (Desktop) */}
        {activeIndex < screenshots.length - 1 && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Nächstes Bild"
            className="hidden sm:flex absolute right-4 z-20 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/50 hover:bg-black/75 active:scale-95 text-white items-center justify-center transition-all cursor-pointer border-none shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Counter Pill */}
      <div className="pb-2 sm:pb-4 z-10" onClick={(e) => e.stopPropagation()}>
        <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold tracking-wide">
          {activeIndex + 1} / {screenshots.length}
        </span>
      </div>
    </div>,
    document.body
  );
}
