import { useState, useMemo, type MouseEvent } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import RecipePosterCard from './RecipePosterCard';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import { groupRecipesByTimeline } from './recipeTimelineUtils';

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

const INITIAL_LIMIT = 16;

/**
 * Dedicated vertical timeline section at the bottom of the magazine feed.
 * Organizes recipes into chronological natural time clusters (Today, Yesterday,
 * This week, Last week, Month/Year) in a responsive 2-column poster grid.
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
  const { t, language } = useI18n();
  const [showAll, setShowAll] = useState(false);

  const displayedItems = useMemo(() => {
    if (showAll || items.length <= INITIAL_LIMIT) {
      return items;
    }
    return items.slice(0, INITIAL_LIMIT);
  }, [items, showAll]);

  const timelineGroups = useMemo(() => {
    return groupRecipesByTimeline(
      displayedItems,
      {
        today: t('catalog.magazine.timelineToday'),
        yesterday: t('catalog.magazine.timelineYesterday'),
        thisWeek: t('catalog.magazine.timelineThisWeek'),
        lastWeek: t('catalog.magazine.timelineLastWeek'),
      },
      language === 'de' ? 'de-DE' : 'en-US'
    );
  }, [displayedItems, language, t]);

  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-4 pt-2">
      {/* Section Header */}
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

      {/* Vertical Timeline Groups */}
      <div className="space-y-9 pt-1">
        {timelineGroups.map((group, index) => (
          <div key={group.id} className="space-y-3.5">
            {/* Centered Timeline Header with Left & Right Divider Lines */}
            <div className={`flex items-center gap-3 w-full px-1 ${index > 0 ? 'pt-3' : 'pt-1'}`}>
              <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
              <div className="flex items-center gap-2 shrink-0">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-heading tracking-tight">
                  {group.label}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10.5px] font-semibold text-gray-500 dark:text-gray-400">
                  {group.items.length === 1
                    ? t('catalog.recipeCountSingle')
                    : t('catalog.recipeCount', { count: group.items.length })}
                </span>
              </div>
              <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
            </div>

            {/* 2-Column Recipe Grid */}
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((job) => (
                <div key={job.recipeId} className="w-full">
                  <RecipePosterCard
                    job={job}
                    variant="grid"
                    totalTime={job.recipe ? formatTotalTime(job.recipe) : null}
                    isSelected={selectedIds?.has(job.recipeId)}
                    isSelectMode={isSelectMode}
                    bindLongPress={bindLongPress ? bindLongPress(job.recipeId, job) : undefined}
                    onClick={(e) => onOpenRecipe(e, job)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Expand timeline in-place if user has more than initial limit */}
      {items.length > INITIAL_LIMIT && !showAll && (
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setShowAll(true);
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 border-none transition-all active:scale-[0.98] cursor-pointer"
        >
          {t('catalog.magazine.timelineShowMore', { count: items.length - INITIAL_LIMIT })}
        </button>
      )}

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
