import { useState, useEffect, useRef, useMemo } from 'react';
import { apiUrl } from '../../api';

interface ShowcaseCover {
  id: string;
  title: string;
  imageUrl: string;
  emoji?: string | null;
}

const AUTO_ADVANCE_MS = 1800;
const SWIPE_THRESHOLD_PX = 32;

function getCircularOffset(index: number, activeIndex: number, length: number): number {
  if (length <= 1) return 0;
  let diff = index - activeIndex;
  const half = length / 2;
  if (diff > half) diff -= length;
  if (diff <= -half) diff += length;
  return diff;
}

export default function HeroCoverCarousel() {
  const [rawCovers, setRawCovers] = useState<ShowcaseCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/public/showcase-covers?limit=10'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.covers)) return;
        const valid = (data.covers as ShowcaseCover[]).filter((c) => Boolean(c.imageUrl));
        if (valid.length > 0) {
          setRawCovers(
            valid.map((c) => ({
              ...c,
              imageUrl: c.imageUrl.startsWith('http') ? c.imageUrl : apiUrl(c.imageUrl),
            }))
          );
        }
      })
      .catch(() => {
        // Silently degrade if offline
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Ensure at least 5 virtual slides when >= 2 covers exist so cards never wrap across the visible stage
  const slides = useMemo(() => {
    if (rawCovers.length === 0) return [];
    if (rawCovers.length === 1 || rawCovers.length >= 5) {
      return rawCovers.map((c, idx) => ({ ...c, slideKey: `${c.id}-${idx}` }));
    }
    const expanded: Array<ShowcaseCover & { slideKey: string }> = [];
    let copyIndex = 0;
    while (expanded.length < 6) {
      for (const c of rawCovers) {
        expanded.push({ ...c, slideKey: `${c.id}-${copyIndex++}` });
      }
    }
    return expanded;
  }, [rawCovers]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [slides.length, activeIndex]);

  const handleStep = (delta: number) => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev + delta + slides.length) % slides.length);
  };

  const activeSlide = slides[activeIndex];

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none py-4">
      <div
        aria-hidden="true"
        className="relative w-full h-44 sm:h-56 flex items-center justify-center overflow-visible"
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
          const deltaX = endX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
            handleStep(deltaX < 0 ? 1 : -1);
          }
        }}
      >
        {loading || slides.length === 0 ? (
          /* Skeleton stage while initial covers load */
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute w-40 sm:w-52 aspect-[4/3] rounded-3xl bg-black/[0.06] dark:bg-gray-800/50 -translate-x-[54%] scale-[0.82] opacity-55" />
            <div className="absolute w-40 sm:w-52 aspect-[4/3] rounded-3xl bg-black/[0.06] dark:bg-gray-800/50 translate-x-[54%] scale-[0.82] opacity-55" />
            <div className="relative w-48 sm:w-60 aspect-[4/3] rounded-3xl bg-black/[0.08] dark:bg-gray-800 animate-pulse shadow-[0_14px_34px_rgba(0,0,0,0.12)]" />
          </div>
        ) : (
          slides.map((item, idx) => {
            const offset = getCircularOffset(idx, activeIndex, slides.length);
            const isCenter = offset === 0;
            const isLeft = offset === -1;
            const isRight = offset === 1;
            const isFarLeft = offset === -2;
            const isFarRight = offset === 2;

            let transformClass = 'translate-x-0 scale-50 opacity-0 z-0 pointer-events-none';
            if (isCenter) {
              transformClass =
                'translate-x-0 scale-100 opacity-100 z-20 shadow-[0_16px_36px_rgba(0,0,0,0.20)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.5)]';
            } else if (isLeft) {
              transformClass =
                '-translate-x-[54%] -rotate-3 scale-[0.82] opacity-65 z-10 shadow-[0_8px_20px_rgba(0,0,0,0.12)] cursor-pointer';
            } else if (isRight) {
              transformClass =
                'translate-x-[54%] rotate-3 scale-[0.82] opacity-65 z-10 shadow-[0_8px_20px_rgba(0,0,0,0.12)] cursor-pointer';
            } else if (isFarLeft) {
              transformClass = '-translate-x-[90%] -rotate-6 scale-[0.68] opacity-0 z-0 pointer-events-none';
            } else if (isFarRight) {
              transformClass = 'translate-x-[90%] rotate-6 scale-[0.68] opacity-0 z-0 pointer-events-none';
            }

            return (
              <div
                key={item.slideKey}
                onClick={() => {
                  if (isLeft) handleStep(-1);
                  else if (isRight) handleStep(1);
                }}
                className={`absolute w-48 sm:w-60 aspect-[4/3] rounded-3xl overflow-hidden bg-gray-900 ring-1 ring-black/10 dark:ring-white/10 border-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${transformClass}`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title || ''}
                  className="w-full h-full object-cover object-center pointer-events-none select-none"
                />

                {/* Dark gradient scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 via-45% to-transparent pointer-events-none" />

                {/* Subtle dimming overlay for side cards */}
                <div
                  className={`absolute inset-0 bg-black/25 transition-opacity duration-500 pointer-events-none ${
                    isCenter ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Subtle caption showing the active dish title */}
      {activeSlide?.title && (
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center truncate max-w-[260px] sm:max-w-xs m-0 transition-opacity duration-300">
          {activeSlide.emoji ? `${activeSlide.emoji} ` : ''}
          {activeSlide.title}
        </p>
      )}
    </div>
  );
}
