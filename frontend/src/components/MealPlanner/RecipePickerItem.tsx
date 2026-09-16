import React from 'react';
import { Clock, Plus } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { getTotalTime } from '../../hooks/useSavedCatalog';

export interface RecipePickerItemProps {
  saved: SavedRecipe;
  onSelect: (saved: SavedRecipe) => void;
}

export const RecipePickerItem: React.FC<RecipePickerItemProps> = React.memo(({ saved, onSelect }) => {
  const calories =
    saved.recipe?.nutritionalValues?.calories ??
    saved.recipe?.sourceNutritionalValues?.calories;
  const totalTime = getTotalTime(saved.recipe);

  return (
    <button
      type="button"
      onClick={() => onSelect(saved)}
      className="w-full flex items-center gap-3.5 p-2.5 sm:p-3 rounded-2xl bg-gray-50/90 dark:bg-gray-800/60 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-left active:scale-[0.98] transition-all duration-150 group border-none cursor-pointer touch-manipulation ring-1 ring-black/[0.04] dark:ring-white/[0.05] shadow-2xs"
    >
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 ring-1 ring-black/[0.06] dark:ring-white/[0.08] pointer-events-none shadow-2xs">
        <CachedImage
          src={saved.recipe?.imageUrl}
          alt={saved.recipe?.title || 'Recipe'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex-1 min-w-0 pointer-events-none">
        <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {saved.recipe?.title}
        </h4>
        {(totalTime > 0 || !!calories) && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-semibold">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{totalTime} min</span>
              </span>
            )}
            {totalTime > 0 && !!calories && (
              <span className="text-gray-300 dark:text-gray-600 text-[9px] leading-none select-none">•</span>
            )}
            {!!calories && (
              <span>{Math.round(calories)} kcal</span>
            )}
          </div>
        )}
      </div>

      <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white group-active:bg-emerald-600 group-active:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs pointer-events-none">
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </div>
    </button>
  );
});

export default RecipePickerItem;
