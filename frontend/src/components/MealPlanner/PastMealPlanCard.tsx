import React from 'react';
import type { MealPlanEntry } from '../../types';
import { RecipeListItem } from '../RecipeListItem';

export interface PastMealPlanCardProps {
  entry: MealPlanEntry;
  onSelectRecipe: (recipeId: string) => void;
}

export const PastMealPlanCard = React.memo<PastMealPlanCardProps>(({
  entry,
  onSelectRecipe,
}) => {
  return (
    <RecipeListItem
      recipe={entry.recipe}
      onClick={() => onSelectRecipe(entry.recipeId)}
      isCooked={entry.isCooked}
      flushImage={true}
      showArrow={false}
      className="rounded-none shadow-none opacity-60 hover:opacity-85 grayscale-[20%] transition-all"
      extraMeta={
        entry.servings > 0 ? (
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
            {entry.servings} Port.
          </span>
        ) : null
      }
    />
  );
});

export default PastMealPlanCard;
