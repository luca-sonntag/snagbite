import React from 'react';
import { Clock, Check, Star } from 'lucide-react';
import type { SavedRecipe, Recipe } from '../types';
import CachedImage from './CachedImage';
import { hapticLight } from '../utils/haptics';
import { getTotalTime } from '../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from './RecipeDetails/HealthScoreBadge';

export interface RecipeListItemProps {
  job: SavedRecipe;
  isSelected?: boolean;
  isSelectMode?: boolean;
  /** Pre-formatted total time, e.g. "35 Min." — null hides the badge. If omitted, computed automatically from recipe. */
  totalTime?: string | null;
  recipeTags?: string[];
  bindLongPress?: any;
  onClick: (e: React.MouseEvent) => void;
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
 * Unified horizontal recipe card list item for both SavedCatalog list view and RecipePickerModal.
 * Features:
 * - 80px thumbnail with high-contrast presentation
 * - Title line with optional favorite indicator
 * - Bottom meta line: Gray duration pill + 1 Tag on the left, Calories + circular Health Score badge on the right
 * - Clean tactile touch target with no auxiliary plus button
 */
export const RecipeListItem = React.memo<RecipeListItemProps>(({
  job,
  isSelected = false,
  isSelectMode = false,
  totalTime,
  recipeTags,
  bindLongPress,
  onClick,
}) => {
  const r = job.recipe;
  if (!r) return null;

  const calculatedTime = getTotalTime(r);
  const totalTimeStr =
    totalTime !== undefined
      ? totalTime
      : calculatedTime > 0
      ? `${calculatedTime} Min.`
      : null;

  const firstTag = recipeTags?.[0] ?? getFirstRecipeTag(r);
  const calories = getRecipeCalories(r);
  const caloriesFormatted = formatCalories(calories);
  const healthScoreNum = typeof r.healthScore === 'number' ? r.healthScore : null;
  const healthColor = healthScoreNum !== null ? getHealthScoreColor(healthScoreNum) : null;
  const healthLetter = healthScoreNum !== null ? getHealthScoreLetter(healthScoreNum) : null;

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
      {/* Thumbnail (Mobile UX rule: 72-80px min) + select checkbox */}
      <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border-none ring-1 ring-black/[0.04] dark:ring-white/[0.06] pointer-events-none">
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
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pointer-events-none">
        {/* Title row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {r.title}
          </h4>
          {job.isFavorite && !isSelectMode && (
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 dark:bg-amber-500/25 flex items-center justify-center shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            </div>
          )}
        </div>

        {/* Bottom meta row: Duration pill + Tag on left, Calories + Health Score on right */}
        {(totalTimeStr || firstTag || caloriesFormatted || (healthScoreNum !== null && healthColor && healthLetter)) && (
          <div className="flex items-center justify-between gap-1.5 mt-1.5 text-xs select-none">
            {/* Left Cluster: Gray Duration Pill & 1 Tag */}
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {totalTimeStr && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] shrink-0">
                  <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>{totalTimeStr}</span>
                </span>
              )}
              {firstTag && (
                <>
                  {totalTimeStr && <span className="text-gray-300 dark:text-gray-600 text-[9px] leading-none select-none">•</span>}
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[7rem] sm:max-w-[10rem]">
                    {firstTag}
                  </span>
                </>
              )}
            </div>

            {/* Right Cluster: Calories & Health Score Badge */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {caloriesFormatted && (
                <span className="whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium text-[11px]">
                  {caloriesFormatted}
                </span>
              )}

              {healthColor && healthLetter && healthScoreNum !== null && (
                <span
                  className={`w-4 h-4 rounded-full ${healthColor.pillBg} text-white font-black text-[9.5px] flex items-center justify-center leading-none shadow-2xs shrink-0 select-none`}
                  title={`Health Score: ${healthLetter} (${healthScoreNum}/100)`}
                  aria-label={`Health Score: ${healthLetter}`}
                >
                  {healthLetter}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default RecipeListItem;
