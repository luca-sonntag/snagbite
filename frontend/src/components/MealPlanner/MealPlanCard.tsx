import React from 'react';
import { Clock } from 'lucide-react';
import type { MealPlanCardProps } from './types';
import CachedImage from '../CachedImage';
import { MealPlanCardActions } from './MealPlanCardActions';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { HealthScoreLetterBadge } from '../RecipeDetails/HealthScoreBadge';
import { hapticLight } from '../../utils/haptics';

export const MealPlanCard = React.memo<MealPlanCardProps>(({
  entry,
  onUpdateServings,
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
      className={`group relative flex items-stretch gap-3 rounded-2xl md:rounded-3xl border-none transition-all duration-200 cursor-pointer select-none touch-manipulation active:scale-[0.99] bg-white dark:bg-gray-900/95 shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06] overflow-hidden ${
        entry.isCooked
          ? 'opacity-80'
          : 'hover:shadow-md dark:hover:bg-gray-850'
      }`}
    >
      {/* Recipe Thumbnail: Flush with full card height */}
      <div className="relative w-24 sm:w-28 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 self-stretch">
        <CachedImage
          src={recipe?.imageUrl}
          emoji={recipe?.emoji}
          alt={recipe?.title || 'Recipe'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
        />
      </div>

      {/* Recipe Content */}
      <div className="flex-1 min-w-0 py-3 pr-3.5 flex flex-col justify-between @container">
        <h4
          className={`text-sm sm:text-base font-extrabold line-clamp-1 leading-snug transition-colors ${
            entry.isCooked
              ? 'text-gray-600 dark:text-gray-300'
              : 'text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
          }`}
        >
          {recipe?.title || 'Rezept'}
        </h4>

        {/* Badges: Total Time Pill on left, Calories & Health Score on right */}
        {(totalTime > 0 || caloriesFormatted || healthScoreNum !== null) && (
          <div className="flex items-center justify-between gap-1.5 my-1 text-xs select-none">
            {totalTime > 0 ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[10px] shrink-0">
                <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{totalTime} Min.</span>
              </span>
            ) : <span />}

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {caloriesFormatted && (
                <span className="whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium text-[11px]">
                  {caloriesFormatted}
                </span>
              )}

              <HealthScoreLetterBadge score={healthScoreNum} size="sm" />
            </div>
          </div>
        )}

        {/* Bottom Actions Cluster */}
        <MealPlanCardActions
          entry={entry}
          onUpdateServings={onUpdateServings}
          onToggleCooked={onToggleCooked}
          onDeleteEntry={onDeleteEntry}
          onMoveToTomorrow={onMoveToTomorrow}
          onOpenCookMode={onOpenCookMode}
        />
      </div>
    </div>
  );
});

export default MealPlanCard;
