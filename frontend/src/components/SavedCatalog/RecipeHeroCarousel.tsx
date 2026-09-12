import { useState, useRef, type MouseEvent } from 'react';
import type { SavedRecipe, Recipe } from '../../types';
import RecipeHeroCard from './RecipeHeroCard';
import { hapticLight } from '../../utils/haptics';

export interface HeroSlideItem {
  id: string;
  job?: SavedRecipe;
  recipe: Recipe;
  totalTime: string | null;
  badgeText: string;
  badgeVariant: 'emerald' | 'indigo' | 'amber';
  isCommunity: boolean;
  isSaved?: boolean;
}

interface RecipeHeroCarouselProps {
  slides: HeroSlideItem[];
  onOpenSlide: (e: MouseEvent, slide: HeroSlideItem) => void;
  onSaveCommunity?: (e: MouseEvent, recipe: Recipe) => void;
}

/**
 * Modern 3-Slide Hero Carousel with snap-scrolling and subtle pagination dots.
 * Showcases the daily spotlight, vital star, and community inspiration.
 */
export default function RecipeHeroCarousel({
  slides,
  onOpenSlide,
  onSaveCommunity,
}: RecipeHeroCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!slides || slides.length === 0) return null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width > 0) {
      const nextIndex = Math.round(el.scrollLeft / width);
      if (nextIndex !== activeIndex && nextIndex >= 0 && nextIndex < slides.length) {
        setActiveIndex(nextIndex);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    hapticLight();
    const width = el.clientWidth;
    el.scrollTo({
      left: index * width,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  return (
    <section className="relative flex flex-col gap-2 select-none" aria-label="Hero Highlights">
      {/* Snap-scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
      >
        {slides.map((slide, idx) => (
          <div key={slide.id || idx} className="w-full shrink-0 snap-center">
            <RecipeHeroCard
              job={slide.job}
              recipe={slide.recipe}
              totalTime={slide.totalTime}
              badgeText={slide.badgeText}
              badgeVariant={slide.badgeVariant}
              isCommunity={slide.isCommunity}
              isSaved={slide.isSaved}
              onSaveCommunity={onSaveCommunity}
              onOpenRecipe={(e) => onOpenSlide(e, slide)}
            />
          </div>
        ))}
      </div>

      {/* Modern Subtle Pagination Dots (only when multiple slides exist) */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5" role="tablist">
          {slides.map((slide, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={slide.id || idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => scrollToSlide(idx)}
                className={`transition-all duration-300 rounded-full border-none cursor-pointer p-0 h-1.5 ${
                  isActive
                    ? 'w-5 bg-emerald-500 shadow-xs'
                    : 'w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
                aria-label={`Slide ${idx + 1}: ${slide.badgeText}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
