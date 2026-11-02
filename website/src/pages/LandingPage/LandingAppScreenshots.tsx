import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { PLAYSTORE_SCREENSHOTS } from './playstoreScreenshotsData';
import { usePlaystoreGallery } from './usePlaystoreGallery';
import PlaystoreFullscreenModal from './PlaystoreFullscreenModal';

export default function LandingAppScreenshots() {
  const {
    scrollRef,
    activeIndex,
    fullscreenIndex,
    isDragging,
    fullscreenSwipeOffset,
    isFullscreenDragging,
    handleScroll,
    scrollToSlide,
    handlePrevSlide,
    handleNextSlide,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    openFullscreen,
    closeFullscreen,
    setFullscreenIndex,
    handleFullscreenTouchStart,
    handleFullscreenTouchMove,
    handleFullscreenTouchEnd,
  } = usePlaystoreGallery(PLAYSTORE_SCREENSHOTS.length);

  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 select-none" aria-label="App Einblicke">
      {/* Section Header with Desktop Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col gap-1 max-w-xl">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Echte App-Einblicke
          </span>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white m-0">
            So fühlt sich Snagbite auf deinem Smartphone an
          </h2>
        </div>

        {/* Desktop Arrow Buttons */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={activeIndex === 0}
            aria-label="Vorheriger Screenshot"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-[#fdfbf7] dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 ring-1 ring-black/[0.08] dark:ring-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 border-none shadow-2xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            disabled={activeIndex === PLAYSTORE_SCREENSHOTS.length - 1}
            aria-label="Nächster Screenshot"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-[#fdfbf7] dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-35 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 ring-1 ring-black/[0.08] dark:ring-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 border-none shadow-2xs"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Snap-scroll container with peek effect, subtle gap and mouse drag support */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={`flex gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-pl-4 sm:scroll-pl-0 scroll-smooth pb-2 pt-1 ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
      >
        {PLAYSTORE_SCREENSHOTS.map((item, idx) => (
          <article
            key={item.id}
            onClick={() => openFullscreen(idx)}
            className="w-[72%] xs:w-[65%] sm:w-[42%] lg:w-[28.5%] shrink-0 snap-start group relative rounded-3xl overflow-hidden bg-gray-950 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] dark:ring-white/10 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="relative aspect-[9/16] w-full overflow-hidden bg-gray-950">
              <img
                src={item.src}
                alt={item.alt}
                loading={idx <= 1 ? 'eager' : 'lazy'}
                className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500 pointer-events-none select-none"
              />

              {/* Subtle hover overlay with expand icon */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Vergrößern</span>
                </span>
              </div>

              {/* Number Badge (top right) */}
              <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white font-bold text-[10.5px] px-2.5 py-1 rounded-full pointer-events-none">
                {idx + 1} / {PLAYSTORE_SCREENSHOTS.length}
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Pill Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1" role="tablist" aria-label="Screenshots Pagination">
        {PLAYSTORE_SCREENSHOTS.map((item, idx) => {
          const isActive = activeIndex === idx;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => scrollToSlide(idx)}
              className={`transition-all duration-300 rounded-full border-none cursor-pointer p-0 h-1.5 ${
                isActive
                  ? 'w-6 bg-emerald-600 dark:bg-emerald-500 shadow-xs'
                  : 'w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
              }`}
              aria-label={`Slide ${idx + 1}: ${item.title}`}
            />
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <PlaystoreFullscreenModal
        screenshots={PLAYSTORE_SCREENSHOTS}
        activeIndex={fullscreenIndex}
        onClose={closeFullscreen}
        onPrev={() => setFullscreenIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
        onNext={() =>
          setFullscreenIndex((prev) =>
            prev !== null && prev < PLAYSTORE_SCREENSHOTS.length - 1 ? prev + 1 : prev
          )
        }
        swipeOffset={fullscreenSwipeOffset}
        isDragging={isFullscreenDragging}
        onTouchStart={handleFullscreenTouchStart}
        onTouchMove={handleFullscreenTouchMove}
        onTouchEnd={handleFullscreenTouchEnd}
      />
    </section>
  );
}
