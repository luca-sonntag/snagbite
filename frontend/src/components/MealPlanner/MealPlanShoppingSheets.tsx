import React from 'react';
import ShoppingConfirmSheet from '../RecipeDetails/ShoppingConfirmSheet';
import { formatShoppingAmount } from './mealPlannerUtils';
import type { BulkShoppingItem } from './types';
import type { Ingredient } from '../../types';

interface MealPlanShoppingSheetsProps {
  currentBulkItem: BulkShoppingItem | null;
  onConfirm: (items: Ingredient[]) => void;
  onClose: () => void;
}

export const MealPlanShoppingSheets: React.FC<MealPlanShoppingSheetsProps> = ({
  currentBulkItem,
  onConfirm,
  onClose,
}) => {
  if (!currentBulkItem) return null;

  return (
    <ShoppingConfirmSheet
      key={currentBulkItem.recipe.id}
      isOpen={true}
      onClose={onClose}
      recipe={currentBulkItem.recipe}
      sortedIngredients={currentBulkItem.sortedIngredients}
      scaleFactor={currentBulkItem.scaleFactor}
      formatAmount={formatShoppingAmount}
      onConfirm={onConfirm}
      recipeLabel={currentBulkItem.recipeLabel}
    />
  );
};

export default MealPlanShoppingSheets;
