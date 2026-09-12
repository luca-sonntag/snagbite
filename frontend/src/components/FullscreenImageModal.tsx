import { createPortal } from 'react-dom';
import { Button } from '@heroui/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageGallery } from '../hooks/useImageGallery';
import { useModalOverlay } from '../context/OverlayStackContext';
import CachedImage from './CachedImage';

interface FullscreenImageModalProps {
  images: string[];
  initialIndex: number | null;
  onClose: () => void;
  emoji?: string;
}

/**
 * Reusable full-screen image gallery modal with swipe gestures, pinch-to-zoom,
 * page indicators, and native back button / keyboard navigation.
 */
export default function FullscreenImageModal({
  images,
  initialIndex,
  onClose,
  emoji,
}: FullscreenImageModalProps) {
  const {
    fullscreenIndex,
    setFullscreenIndex,
    scale,
    offset,
    swipeTranslation,
    isDraggingImage,
    fullscreenContainerRef,
    handleNextImage,
    handlePrevImage,
    handleDoubleTap,
    handleFullscreenPointerDown,
    handleFullscreenPointerMove,
    handleFullscreenPointerUp,
    handleKeyDown,
    handleFullscreenContainerClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useImageGallery(images, initialIndex, onClose);

  useModalOverlay(fullscreenIndex !== null && images.length > 0, onClose);

  if (fullscreenIndex === null || images.length === 0) {
    return null;
  }

  return createPortal(
    <div
      ref={fullscreenContainerRef}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-0 m-0 select-none overflow-hidden touch-none outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={handleFullscreenContainerClick}
    >
      {/* Top Controls Overlay */}
      <div className="absolute top-[calc(1rem_+_var(--safe-area-inset-top))] right-4 z-[101] flex items-center gap-2">
        <Button
          isIconOnly
          variant="ghost"
          onPress={() => {
            setFullscreenIndex(null);
            onClose();
          }}
          className="text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full border-none"
          aria-label="Close fullscreen"
        >
          <X size={22} />
        </Button>
      </div>

      {/* Carousel Slider */}
      <div
        className="w-full h-full flex items-center justify-center relative"
        onPointerDown={handleFullscreenPointerDown}
        onPointerMove={handleFullscreenPointerMove}
        onPointerUp={handleFullscreenPointerUp}
        onPointerCancel={handleFullscreenPointerUp}
        onDoubleClick={handleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <div
          className={`flex w-full h-full ${!isDraggingImage ? 'transition-transform duration-300 ease-out' : ''}`}
          style={{
            transform: `translateX(calc(-${fullscreenIndex * 100}% + ${swipeTranslation}px))`
          }}
        >
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className="w-full h-full shrink-0 flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CachedImage
                src={imgUrl}
                emoji={emoji}
                alt={`Fullscreen view ${idx + 1}`}
                draggable={false}
                className="max-w-[80%] max-h-[80dvh] object-contain select-none pointer-events-auto"
                style={{
                  transform: idx === fullscreenIndex ? `translate(${offset.x}px, ${offset.y}px) scale(${scale})` : 'scale(1)',
                  cursor: idx === fullscreenIndex && scale > 1 ? (isDraggingImage ? 'grabbing' : 'grab') : 'pointer',
                  transition: idx === fullscreenIndex && !isDraggingImage ? 'transform 200ms ease-out' : 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows (Desktop) */}
      {images.length > 1 && scale === 1 && (
        <>
          {fullscreenIndex > 0 && (
            <Button
              isIconOnly
              variant="ghost"
              onPress={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-[101] text-white/50 hover:text-white bg-black/30 hover:bg-black/60 rounded-full border-none hidden md:flex"
              aria-label="Previous image"
            >
              <ChevronLeft size={28} />
            </Button>
          )}
          {fullscreenIndex < images.length - 1 && (
            <Button
              isIconOnly
              variant="ghost"
              onPress={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-[101] text-white/50 hover:text-white bg-black/30 hover:bg-black/60 rounded-full border-none hidden md:flex"
              aria-label="Next image"
            >
              <ChevronRight size={28} />
            </Button>
          )}
        </>
      )}

      {/* Page Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-[calc(1rem_+_var(--safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none z-[101] backdrop-blur-sm">
          {fullscreenIndex + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body
  );
}
