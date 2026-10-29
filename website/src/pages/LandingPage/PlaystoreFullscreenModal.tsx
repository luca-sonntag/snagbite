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
        className="w-full max-w-4xl flex items-center justify-between text-white pt-2 sm:pt-4 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col min-w-0 pr-4">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold transition-all duration-300">
            {currentItem.title}
          </span>
          <p className="text-sm text-gray-300 truncate m-0 transition-all duration-300">
            {currentItem.subtitle}
          </p>
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

      {/* Main Track Slider Viewport */}
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
            className="hidden sm:flex absolute left-4 z-30 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/55 hover:bg-black/80 active:scale-95 text-white items-center justify-center transition-all cursor-pointer border-none shadow-xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Sliding Strip holding all screenshots */}
        <div
          className={`flex w-full h-full will-change-transform ${
            isDragging ? 'transition-none' : 'transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]'
          }`}
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${swipeOffset}px))`,
          }}
        >
          {screenshots.map((item, idx) => (
            <div
              key={item.id}
              className="w-full h-full shrink-0 flex items-center justify-center overflow-hidden px-2 sm:px-6"
            >
              <div className="h-full max-h-[76vh] sm:max-h-[82vh] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-gray-950 ring-1 ring-white/10">
                <img
                  src={item.src}
                  alt={item.alt}
                  loading={Math.abs(idx - activeIndex) <= 1 ? 'eager' : 'lazy'}
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow (Desktop) */}
        {activeIndex < screenshots.length - 1 && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Nächstes Bild"
            className="hidden sm:flex absolute right-4 z-30 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/55 hover:bg-black/80 active:scale-95 text-white items-center justify-center transition-all cursor-pointer border-none shadow-xl"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Counter Pill */}
      <div className="pb-2 sm:pb-4 z-20" onClick={(e) => e.stopPropagation()}>
        <span className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold tracking-wide">
          {activeIndex + 1} / {screenshots.length}
        </span>
      </div>
    </div>,
    document.body
  );
}
