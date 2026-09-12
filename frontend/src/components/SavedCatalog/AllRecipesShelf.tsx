import { useRef, useEffect, type MouseEvent } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import RecipePosterCard from './RecipePosterCard';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface AllRecipesShelfProps {
  items: SavedRecipe[];
  totalCount: number;
  formatTotalTime: (recipe: any) => string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onViewAll: () => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
}

/**
 * Dedicated shelf at the bottom of the magazine feed.
 * Features a horizontally scrollable showcase of recent recipes using the beloved
 * RecipePosterCard, anchored by a prominent button to open the full Level 2 catalog.
 */
export default function AllRecipesShelf({
  items,
  totalCount,
  formatTotalTime,
  onOpenRecipe,
  onViewAll,
  isSelectMode = false,
  selectedIds,
  bindLongPress,
}: AllRecipesShelfProps) {
  const { t } = useI18n();
  const shelfRef = useRef<HTMLDivElement>(null);

  // Always reset horizontal scroll to the very beginning (leftmost card)
  useEffect(() => {
    if (shelfRef.current) {
      shelfRef.current.scrollLeft = 0;
    }
    const rafId = requestAnimationFrame(() => {
      if (shelfRef.current) {
        shelfRef.current.scrollLeft = 0;
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [items?.[0]?.recipeId]);

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight font-heading">
            {t('catalog.magazine.allShelfTitle')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('catalog.magazine.allShelfSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onViewAll();
          }}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer select-none"
        >
          {t('catalog.showAll', { count: totalCount })}
        </button>
      </div>

      {/* Horizontal Recipe Shelf */}
      <div
        ref={shelfRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {items.slice(0, 10).map((job) => (
          <div key={job.recipeId} className="snap-start shrink-0">
            <RecipePosterCard
              job={job}
              variant="shelf"
              totalTime={job.recipe ? formatTotalTime(job.recipe) : null}
              isSelected={selectedIds?.has(job.recipeId)}
              isSelectMode={isSelectMode}
              bindLongPress={bindLongPress ? bindLongPress(job.recipeId, job) : undefined}
              onClick={(e) => onOpenRecipe(e, job)}
            />
          </div>
        ))}
      </div>

      {/* Prominent Browse & Filter Full Catalog Button (Clean Flat Magazine Style) */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          onViewAll();
        }}
        className="group w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-black/5 dark:ring-white/10 hover:ring-emerald-500/30 dark:hover:ring-emerald-500/30 hover:shadow-md text-gray-900 dark:text-white font-bold text-sm flex items-center justify-between gap-3 transition-all duration-150 active:scale-[0.98] border-none cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <span className="truncate text-left font-bold text-sm tracking-tight text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {t('catalog.magazine.allShelfButton', { count: totalCount })}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </section>
  );
}
