import type { MouseEvent } from 'react';
import { BookOpen, ArrowRight, Layers } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import RecipePosterCard from './RecipePosterCard';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface AllRecipesShelfProps {
  items: SavedRecipe[];
  totalCount: number;
  formatTotalTime: (job: SavedRecipe) => string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onViewAll: () => void;
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
}: AllRecipesShelfProps) {
  const { t } = useI18n();

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 tracking-tight font-heading">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('catalog.magazine.allShelfTitle')}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('catalog.magazine.allShelfSubtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            hapticLight();
            onViewAll();
          }}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer select-none"
        >
          {totalCount} &gt;
        </button>
      </div>

      {/* Horizontal Recipe Shelf */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.slice(0, 10).map((job) => (
          <div key={job.recipeId} className="snap-start shrink-0">
            <RecipePosterCard
              job={job}
              variant="shelf"
              totalTime={formatTotalTime(job)}
              onClick={(e) => onOpenRecipe(e, job)}
            />
          </div>
        ))}
      </div>

      {/* Prominent Browse & Filter Full Catalog Button */}
      <button
        onClick={() => {
          hapticLight();
          onViewAll();
        }}
        className="w-full py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-900 dark:text-white font-bold text-sm flex items-center justify-between gap-2 transition-all active:scale-[0.98] border-none shadow-xs cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <span>{t('catalog.magazine.allShelfButton', { count: totalCount })}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </button>
    </section>
  );
}
