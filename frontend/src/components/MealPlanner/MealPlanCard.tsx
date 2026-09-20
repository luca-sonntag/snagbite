import React from 'react';
import type { MealPlanCardProps } from './types';
import { RecipeListItem } from '../RecipeListItem';
import { MealPlanCardMenu } from './MealPlanCardActions';

export const MealPlanCard = React.memo<MealPlanCardProps>(({
  entry,
  onToggleCooked,
  onCookTodayAndPull,
  onDeleteEntry,
  onMoveToTomorrow,
  onMoveToToday,
  onSelectRecipe,
  onOpenCookMode,
  onAddToShoppingList,
}) => {
  const recipe = entry.recipe;

  return (
    <RecipeListItem
      recipe={recipe}
      onClick={() => onSelectRecipe(entry.recipeId)}
      isCooked={entry.isCooked}
      flushImage={true}
      extraMeta={
        entry.servings > 0 ? (
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
            {entry.servings} Port.
          </span>
        ) : null
      }
      rightAction={
        <MealPlanCardMenu
          entry={entry}
          onToggleCooked={onToggleCooked}
          onCookTodayAndPull={onCookTodayAndPull}
          onDeleteEntry={onDeleteEntry}
          onMoveToTomorrow={onMoveToTomorrow}
          onMoveToToday={onMoveToToday}
          onOpenCookMode={onOpenCookMode}
          onAddToShoppingList={onAddToShoppingList}
        />
      }
    />
  );
});

export default MealPlanCard;

