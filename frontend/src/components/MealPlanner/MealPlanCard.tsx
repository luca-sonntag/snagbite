import React from 'react';
import { Clock, Check } from 'lucide-react';
import type { MealPlanCardProps } from './types';
import CachedImage from '../CachedImage';
import { MealPlanCardMenu } from './MealPlanCardActions';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { HealthScoreLetterBadge } from '../RecipeDetails/HealthScoreBadge';
import { hapticLight } from '../../utils/haptics';

export const MealPlanCard = React.memo<MealPlanCardProps>(({
  entry,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
  onSelectRecipe,
  onOpenCookMode,
}) => {
  const recipe = entry.recipe;
  const calories = getRecipeCalories(recipe);
  const caloriesFormatted = formatCalories(calories);
  const totalTime = getTotalTime(recipe);
  const healthScoreNum = typeof recipe?.healthScore === 'number' ? recipe.healthScore : null;

  return (
    <div
      onClick={() => {
        hapticLight();
        onSelectRecipe(entry.recipeId);
      }}
      className={`group relative flex items-center gap-3 rounded-2xl p-2.5 sm:p-3 border-none transition-all duration-200 cursor-pointer select-none touch-manipulation active:scale-[0.99] bg-white dark:bg-gray-900 shadow-2xs ring-1 ring-black/[0.04] dark:ring-white/[0.06] overflow-hidden ${
        entry.isCooked
          ? 'opacity-75'
          : 'hover:shadow-sm dark:hover:bg-gray-850'
      }`}
    >
      {/* Recipe Thumbnail (compact 64-72px with soft rounded corners) */}
      <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border-none pointer-events-none">
        <CachedImage
          src={recipe?.imageUrl}
          emoji={recipe?.emoji}
          alt={recipe?.title || 'Recipe'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
        />
        {entry.isCooked && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </span>
          </div>
        )}
      </div>

      {/* Recipe Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Line 1: Title & 3-Dots Menu */}
        <div className="flex items-center justify-between gap-1.5">
          <h4
            className={`text-sm sm:text-base font-extrabold line-clamp-1 leading-snug transition-colors ${
              entry.isCooked
                ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-400/50'
                : 'text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
            }`}
          >
            {recipe?.title || 'Rezept'}
          </h4>

          {/* 3-Dots Options Menu */}
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <MealPlanCardMenu
              entry={entry}
              onToggleCooked={onToggleCooked}
              onDeleteEntry={onDeleteEntry}
              onMoveToTomorrow={onMoveToTomorrow}
              onOpenCookMode={onOpenCookMode}
            />
          </div>
        </div>

        {/* Line 2: Compact Meta Row */}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400 select-none">
          {totalTime > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] shrink-0">
              <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>{totalTime} Min.</span>
            </span>
          )}

          {entry.servings > 0 && (
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
              {entry.servings} Port.
            </span>
          )}

          {caloriesFormatted && (
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
              {caloriesFormatted}
            </span>
          )}

          {healthScoreNum !== null && (
            <HealthScoreLetterBadge score={healthScoreNum} size="sm" />
          )}

          {entry.isCooked && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>Gekocht</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default MealPlanCard;
