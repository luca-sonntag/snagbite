import React from 'react';
import { Clock, Plus } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from '../RecipeDetails/HealthScoreBadge';

export interface RecipePickerItemProps {
  saved: SavedRecipe;
  onSelect: (saved: SavedRecipe) => void;
}

export const RecipePickerItem: React.FC<RecipePickerItemProps> = React.memo(({ saved, onSelect }) => {
  const r = saved.recipe;
  const calories = getRecipeCalories(r);
  const caloriesFormatted = formatCalories(calories);
  const totalTime = getTotalTime(r);
  const healthScoreNum = typeof r?.healthScore === 'number' ? r.healthScore : null;
  const healthColor = healthScoreNum !== null ? getHealthScoreColor(healthScoreNum) : null;
  const healthLetter = healthScoreNum !== null ? getHealthScoreLetter(healthScoreNum) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(saved)}
      className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.05] dark:ring-white/[0.08] hover:shadow-md hover:ring-emerald-500/30 text-left active:scale-[0.98] transition-all duration-150 group border-none cursor-pointer touch-manipulation"
    >
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06] pointer-events-none">
        <CachedImage
          src={r?.imageUrl}
          emoji={r?.emoji}
          alt={r?.title || 'Recipe'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pointer-events-none">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {r?.title}
        </h4>

        {(totalTime > 0 || !!caloriesFormatted || (healthScoreNum !== null && healthColor && healthLetter)) && (
          <div className="flex items-center justify-between gap-1.5 mt-1.5 select-none">
            {/* Left: Duration Pill */}
            {totalTime > 0 ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] shrink-0">
                <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{totalTime} Min.</span>
              </span>
            ) : (
              <span />
            )}

            {/* Right: Calories + Health Score Badge */}
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

      <div className="w-8.5 h-8.5 min-w-[34px] min-h-[34px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white group-active:bg-emerald-600 group-active:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs pointer-events-none">
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </div>
    </button>
  );
});

export default RecipePickerItem;
