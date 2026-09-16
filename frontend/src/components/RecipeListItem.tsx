import React from 'react';
import { Clock, Check, Star, Layers, ArrowRight } from 'lucide-react';
import type { SavedRecipe, Recipe } from '../types';
import CachedImage from './CachedImage';
import { useI18n } from '../context/I18nContext';
import { hapticLight } from '../utils/haptics';
import { getTotalTime } from '../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../utils/formatNutrition';
import { HealthScoreLetterBadge } from './RecipeDetails/HealthScoreBadge';

export interface RecipeListItemProps {
  job?: SavedRecipe;
  recipe?: Recipe;
  isSelected?: boolean;
  isSelectMode?: boolean;
  /** Pre-formatted total time, e.g. "35 Min." — null hides the badge. If omitted, computed automatically from recipe. */
  totalTime?: string | null;
  recipeTags?: string[];
  bindLongPress?: any;
  onClick: (e: React.MouseEvent) => void;
  showRemix?: boolean;
  showArrow?: boolean;
}

function getFirstRecipeTag(recipe?: Recipe | null): string | null {
  if (!recipe) return null;
  const rawTags = recipe.tags || [];
  const validTag = rawTags.find((tag) => {
    const trimmed = tag.trim().toLowerCase();
    return !(trimmed.includes('min') || trimmed.startsWith('<') || trimmed.startsWith('unter'));
  });
  if (validTag) return validTag;
  if (recipe.category) return recipe.category;
  return null;
}

/**
 * Universal horizontal recipe card list item used across the entire app
 * (SavedCatalog list view, RecipePickerModal, HeroThemeSheet, etc.).
 *
 * Features:
 * - 64-72px thumbnail with high-contrast presentation
 * - Line 1: Bold title with hover emerald transition
 * - Line 2: Creator handle (@handle) or Tag
 * - Line 3: Emerald duration, favorite star, calories, and centralized circular Health Score badge
 * - Switchable right chevron arrow (`showArrow`), with right-aligned (rechtsbündig) calories/health score when disabled
 */
export const RecipeListItem = React.memo<RecipeListItemProps>(({
  job,
  recipe,
  isSelected = false,
  isSelectMode = false,
  totalTime,
  recipeTags,
  bindLongPress,
  onClick,
  showRemix = false,
  showArrow = false,
}) => {
  const { t } = useI18n();
  const r = recipe ?? job?.recipe;
  if (!r) return null;

  const isFavorite = Boolean(job?.isFavorite);
  const remixCount = showRemix
    ? (job?.remixCount ?? job?.recipe?.remixCount ?? r.remixCount ?? 0)
    : 0;
  const calculatedTime = getTotalTime(r);
  const totalTimeStr =
    totalTime !== undefined
      ? totalTime
      : calculatedTime > 0
      ? `${calculatedTime} Min.`
      : null;

  const firstTag = recipeTags?.[0] ?? getFirstRecipeTag(r);
  const handleText = r.sourceHandle ? `@${r.sourceHandle.replace(/^@/, '')}` : null;
  const subtitle = handleText ?? firstTag;

  const calories = getRecipeCalories(r);
  const caloriesFormatted = formatCalories(calories);
  const healthScoreNum = typeof r.healthScore === 'number' ? r.healthScore : null;

  return (
    <div
      className={`group w-full rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all duration-150 select-none border-none touch-manipulation ${
        isSelected
          ? 'bg-emerald-500/10 ring-2 ring-emerald-500 shadow-sm'
          : 'bg-white dark:bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:ring-white/[0.06] hover:shadow-md hover:ring-emerald-500/20'
      }`}
      onClick={(e) => {
        hapticLight();
        onClick(e);
      }}
      {...(bindLongPress ?? {})}
    >
      {/* Thumbnail (64-72px) with Checkbox in select mode */}
      <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border-none ring-1 ring-black/[0.04] dark:ring-white/[0.06] pointer-events-none">
        {isSelectMode && (
          <div
            className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-xl flex items-center justify-center transition-all border-none ${
              isSelected ? 'bg-emerald-500 text-white shadow-xs' : 'bg-black/40 text-white'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
          </div>
        )}

        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5 pointer-events-none">
        {/* Line 1: Title */}
        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {r.title}
        </h4>

        {/* Line 2: Creator Handle or Tag */}
        {subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate mt-0.5">
            {subtitle}
          </p>
        )}

        {/* Line 3: Meta line */}
        {(totalTimeStr || isFavorite || caloriesFormatted || healthScoreNum !== null || (showRemix && remixCount > 0)) && (
          showArrow ? (
            /* Arrow Mode: Meta grouped on left with arrow on far right */
            <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 select-none">
              {totalTimeStr && (
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{totalTimeStr}</span>
                </span>
              )}
              {isFavorite && !isSelectMode && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
              {caloriesFormatted && (
                <span className="shrink-0">{caloriesFormatted}</span>
              )}
              {healthScoreNum !== null && (
                <HealthScoreLetterBadge score={healthScoreNum} size="sm" />
              )}
              {showRemix && remixCount > 0 && (
                <span className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>{remixCount === 1 ? t('remix.singleCount') : t('remix.multipleCount', { count: remixCount })}</span>
                </span>
              )}
            </div>
          ) : (
            /* Standard Mode: Left cluster + right-aligned (rechtsbündig) Calories & Health Score */
            <div className="flex items-center justify-between gap-1.5 mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 select-none">
              {/* Left Cluster: Time, Favorite Star, Remix Badge */}
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {totalTimeStr && (
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{totalTimeStr}</span>
                  </span>
                )}
                {isFavorite && !isSelectMode && (
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                )}
                {showRemix && remixCount > 0 && (
                  <span className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Layers className="w-3 h-3 shrink-0" />
                    <span>{remixCount === 1 ? t('remix.singleCount') : t('remix.multipleCount', { count: remixCount })}</span>
                  </span>
                )}
              </div>

              {/* Right Cluster (rechtsbündig): Calories & Health Score */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {caloriesFormatted && (
                  <span className="whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium">
                    {caloriesFormatted}
                  </span>
                )}
                <HealthScoreLetterBadge score={healthScoreNum} size="sm" />
              </div>
            </div>
          )
        )}
      </div>

      {/* Far Right: Optional Arrow */}
      {showArrow && (
        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mr-1" />
      )}
    </div>
  );
});

export default RecipeListItem;
