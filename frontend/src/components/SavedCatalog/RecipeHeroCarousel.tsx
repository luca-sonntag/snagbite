import { useState, useRef, type MouseEvent } from 'react';
import type { SavedRecipe, Recipe } from '../../types';
import RecipeHeroCard, { type HeroBadgeVariant } from './RecipeHeroCard';
import { hapticLight } from '../../utils/haptics';

export interface HeroSlideItem {
  id: string;
  job?: SavedRecipe;
  recipe: Recipe;
  totalTime: string | null;
  badgeText: string;
  badgeVariant?: HeroBadgeVariant;
  isCommunity: boolean;
  isSaved?: boolean;
}

const ACTIVE_DOT_COLORS: Record<HeroBadgeVariant, string> = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  rose: 'bg-rose-500',
};

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
    if (!el || !el.children.length) return;
    const scrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0 && scrollLeft >= maxScroll - 12) {
      setActiveIndex(slides.length - 1);
      return;
    }
    const firstOffset = (el.children[0] as HTMLElement).offsetLeft;
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const target = child.offsetLeft - firstOffset;
      const distance = Math.abs(target - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    if (closestIndex !== activeIndex && closestIndex >= 0 && closestIndex < slides.length) {
      setActiveIndex(closestIndex);
    }
  };

  const scrollToSlide = (index: number) => {
    const el = scrollRef.current;
    if (!el || !el.children.length) return;
    hapticLight();
    const child = el.children[index] as HTMLElement | undefined;
    const firstChild = el.children[0] as HTMLElement;
    if (child && firstChild) {
      const targetLeft = child.offsetLeft - firstChild.offsetLeft;
      el.scrollTo({
        left: targetLeft,
        behavior: 'smooth',
      });
      setActiveIndex(index);
    }
  };

  return (
    <section className="relative flex flex-col gap-2 select-none" aria-label="Hero Highlights">
      {/* Snap-scroll container with peek effect and gap */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-pl-4 sm:scroll-pl-0 scroll-smooth"
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className={`${
              slides.length > 1 ? 'w-[86%] sm:w-[89%] md:w-[92%]' : 'w-full'
            } shrink-0 snap-start`}
          >
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
                    ? `w-5 ${slide.badgeVariant ? ACTIVE_DOT_COLORS[slide.badgeVariant] : 'bg-emerald-500'} shadow-xs`
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
