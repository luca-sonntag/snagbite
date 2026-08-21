import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import RecipePosterCard from './RecipePosterCard';
import { useI18n } from '../../context/I18nContext';

interface TwoRowRecipeShelfProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  jobs: SavedRecipe[];
  /** Total number of matches — drives whether "show all" is worth offering. */
  totalCount: number;
  formatTotalTime: (recipe: any) => string | null;
  onOpenAll: () => void;
  onOpenRecipe: (e: React.MouseEvent, job: SavedRecipe) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
}

/**
 * A 2-row horizontally scrolling carousel for the cookbook home.
 * Pairs recipes in 2 rows per column (grid-flow-col grid-rows-2)
 * so users can swipe horizontally through many recipes with high density,
 * keeping the page's vertical scrolling completely uninhibited.
 */
export default function TwoRowRecipeShelf({
  title,
  subtitle,
  icon,
  jobs,
  totalCount,
  formatTotalTime,
  onOpenAll,
  onOpenRecipe,
  isSelectMode = false,
  selectedIds = new Set(),
  bindLongPress,
}: TwoRowRecipeShelfProps) {
  const { t } = useI18n();

  if (jobs.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onOpenAll}
        className="flex items-center justify-between gap-2 w-full text-left cursor-pointer group active:scale-[0.99] transition-transform"
      >
        <div className="flex flex-col min-w-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
            {icon && <span className="shrink-0 mr-2">{icon}</span>}
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
          {t('catalog.showAll', { count: totalCount })}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>

      <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
        {jobs.map(job => (
          <RecipePosterCard
            key={job.recipeId}
            job={job}
            variant="shelf"
            totalTime={formatTotalTime(job.recipe)}
            isSelected={selectedIds.has(job.recipeId)}
            isSelectMode={isSelectMode}
            bindLongPress={bindLongPress ? bindLongPress(job.recipeId, job) : undefined}
            onClick={(e) => onOpenRecipe(e, job)}
          />
        ))}
      </div>
    </section>
  );
}
