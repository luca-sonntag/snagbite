import React from 'react';
import { Check } from 'lucide-react';
import type { MealPlanCardProps } from './types';
import { RecipeListItem } from '../RecipeListItem';
import { MealPlanCardMenu } from './MealPlanCardActions';

export const MealPlanCard = React.memo<MealPlanCardProps>(({
  entry,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
  onSelectRecipe,
  onOpenCookMode,
}) => {
  const recipe = entry.recipe;

  return (
    <RecipeListItem
      recipe={recipe}
      onClick={() => onSelectRecipe(entry.recipeId)}
      isCooked={entry.isCooked}
      extraMeta={
        entry.servings > 0 ? (
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
            {entry.servings} Port.
          </span>
        ) : null
      }
      thumbnailOverlay={
        entry.isCooked ? (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </span>
          </div>
        ) : null
      }
      rightAction={
        <MealPlanCardMenu
          entry={entry}
          onToggleCooked={onToggleCooked}
          onDeleteEntry={onDeleteEntry}
          onMoveToTomorrow={onMoveToTomorrow}
          onOpenCookMode={onOpenCookMode}
        />
      }
    />
  );
});

export default MealPlanCard;

