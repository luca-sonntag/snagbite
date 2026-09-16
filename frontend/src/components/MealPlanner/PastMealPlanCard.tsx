import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import type { MealPlanEntry } from '../../types';
import CachedImage from '../CachedImage';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from '../RecipeDetails/HealthScoreBadge';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

export interface PastMealPlanCardProps {
  entry: MealPlanEntry;
  onSelectRecipe: (recipeId: string) => void;
}

export const PastMealPlanCard = React.memo<PastMealPlanCardProps>(({
  entry,
  onSelectRecipe,
}) => {
  const { t } = useI18n();
  const recipe = entry.recipe;
  const calories = getRecipeCalories(recipe);
  const caloriesFormatted = formatCalories(calories);
  const totalTime = getTotalTime(recipe);
  const healthScoreNum = typeof recipe?.healthScore === 'number' ? recipe.healthScore : null;
  const healthColor = healthScoreNum !== null ? getHealthScoreColor(healthScoreNum) : null;
  const healthLetter = healthScoreNum !== null ? getHealthScoreLetter(healthScoreNum) : null;

  return (
    <div
      onClick={() => {
        hapticLight();
        onSelectRecipe(entry.recipeId);
      }}
      className="group relative flex items-stretch gap-3 rounded-2xl border-none transition-all duration-200 cursor-pointer select-none touch-manipulation active:scale-[0.99] bg-white/70 dark:bg-gray-900/70 shadow-2xs ring-1 ring-black/[0.03] dark:ring-white/[0.04] overflow-hidden opacity-75 hover:opacity-100 hover:shadow-xs"
    >
      {/* Recipe Thumbnail: Flush with full card height */}
      <div className="relative w-20 sm:w-24 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 self-stretch">
        <CachedImage
          src={recipe?.imageUrl}
          emoji={recipe?.emoji}
          alt={recipe?.title || 'Recipe'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none grayscale-[25%]"
        />
      </div>

      {/* Recipe Content (Read-Only) */}
      <div className="flex-1 min-w-0 py-2.5 pr-3 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-1 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {recipe?.title || 'Rezept'}
          </h4>

          {/* Badges: Total Time & Calories & Health Score */}
          {(totalTime > 0 || caloriesFormatted || (healthScoreNum !== null && healthColor && healthLetter)) && (
            <div className="flex items-center justify-between gap-1.5 mt-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 select-none">
              {totalTime > 0 ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 font-semibold text-[9.5px] shrink-0">
                  <Clock className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span>{totalTime} Min.</span>
                </span>
              ) : <span />}

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {caloriesFormatted && (
                  <span className="whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium text-[11px]">
                    {caloriesFormatted}
                  </span>
                )}

                {healthColor && healthLetter && healthScoreNum !== null && (
                  <span
                    className={`w-4 h-4 rounded-full ${healthColor.pillBg} text-white font-black text-[9.5px] flex items-center justify-center leading-none shadow-2xs shrink-0 select-none opacity-80`}
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

        {/* Status & Servings row */}
        <div className="flex items-center justify-between mt-1 pt-0.5 select-none">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            {entry.servings} {t('mealPlanner.servings')}
          </span>

          {entry.isCooked ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3 stroke-[2.25]" />
              <span>{t('mealPlanner.cooked')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
              {t('mealPlanner.notCooked') || 'Nicht gekocht'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default PastMealPlanCard;
