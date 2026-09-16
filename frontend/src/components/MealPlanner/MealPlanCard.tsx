import React from 'react';
import { Clock } from 'lucide-react';
import type { MealPlanCardProps } from './types';
import CachedImage from '../CachedImage';
import { MealPlanCardActions } from './MealPlanCardActions';
import { getTotalTime } from '../../hooks/useSavedCatalog';
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
  const calories = recipe?.calories;
  const totalTime = getTotalTime(recipe);

  return (
    <div
      onClick={() => {
        hapticLight();
        onSelectRecipe(entry.recipeId);
      }}
      className={`group relative flex items-stretch gap-3 rounded-2xl md:rounded-3xl border-none transition-all duration-200 cursor-pointer select-none active:scale-[0.99] bg-white dark:bg-gray-900/95 shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06] overflow-hidden ${
        entry.isCooked
          ? 'opacity-80'
          : 'hover:shadow-md dark:hover:bg-gray-850'
      }`}
    >
      {/* Recipe Thumbnail: Flush with full card height */}
      <div className="relative w-24 sm:w-28 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 self-stretch">
        <CachedImage
          src={recipe?.imageUrl}
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

        {/* Badges: Total Time (Prep + Cook) & Calories */}
        {(totalTime > 0 || !!calories) && (
          <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <span>{totalTime} min</span>
              </span>
            )}
            {totalTime > 0 && !!calories && (
              <span className="text-gray-300 dark:text-gray-600 text-[10px] leading-none select-none">•</span>
            )}
            {!!calories && (
              <span>{Math.round(calories)} kcal</span>
            )}
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
