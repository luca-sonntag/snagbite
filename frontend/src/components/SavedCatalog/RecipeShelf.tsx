import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Job } from '../../types';
import RecipePosterCard from './RecipePosterCard';
import { useI18n } from '../../context/I18nContext';

interface RecipeShelfProps {
  title: string;
  icon?: React.ReactNode;
  jobs: Job[];
  /** Total number of matches — drives whether "show all" is worth offering. */
  totalCount: number;
  formatTotalTime: (recipe: any) => string | null;
  onOpenAll: () => void;
  onOpenRecipe: (e: React.MouseEvent, job: Job) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: Job) => any;
}

/**
 * One horizontally scrolling row on the cookbook home. Renders nothing when
 * the row would be empty, so the home page only shows shelves that actually
 * have content for this user.
 */
export default function RecipeShelf({
  title,
  icon,
  jobs,
  totalCount,
  formatTotalTime,
  onOpenAll,
  onOpenRecipe,
  isSelectMode = false,
  selectedIds = new Set(),
  bindLongPress,
}: RecipeShelfProps) {
  const { t } = useI18n();

  if (jobs.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onOpenAll}
        className="flex items-center justify-between gap-2 w-full text-left cursor-pointer group active:scale-[0.99] transition-transform"
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {icon && <span className="shrink-0 mr-2">{icon}</span>}
          {title}
        </h3>
        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
          {t('catalog.showAll', { count: totalCount })}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 pb-1 scroll-smooth">
        {jobs.map(job => (
          <RecipePosterCard
            key={job.id}
            job={job}
            variant="shelf"
            totalTime={formatTotalTime(job.recipe)}
            isSelected={selectedIds.has(job.id)}
            isSelectMode={isSelectMode}
            bindLongPress={bindLongPress ? bindLongPress(job.id, job) : undefined}
            onClick={(e) => onOpenRecipe(e, job)}
          />
        ))}
      </div>
    </section>
  );
}
