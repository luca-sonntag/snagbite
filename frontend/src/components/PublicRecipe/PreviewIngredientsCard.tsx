import React, { useMemo } from 'react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { sortIngredientsByCategory } from '../MealPlanner/mealPlannerUtils';
import IngredientItemRow from '../RecipeDetails/IngredientItemRow';

export interface PreviewIngredientsCardProps {
  recipe: Recipe;
  servings: number;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
}

export const PreviewIngredientsCard: React.FC<PreviewIngredientsCardProps> = ({
  recipe,
  servings,
  scaleFactor,
  formatAmount,
}) => {
  const { t } = useI18n();

  const sortedIngredients = useMemo(() => {
    return sortIngredientsByCategory(recipe.ingredients);
  }, [recipe.ingredients]);

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none overflow-hidden divide-y divide-gray-100/70 dark:divide-gray-800/60">
      {/* 1. Servings Header (Display only, no stepper in preview) */}
      <div className="px-4.5 py-3.5 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('recipe.serves')}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
            {t('recipe.servingsCount', { count: servings })}
          </span>
        </div>
      </div>

      {/* 2. Ingredients List */}
      <ul className="flex flex-col divide-y divide-gray-100/60 dark:divide-gray-800/50 list-none p-0 m-0">
        {sortedIngredients.map((ing, idx) => (
          <IngredientItemRow
            key={`${ing.name}-${idx}`}
            ingredient={ing}
            categoryName={ing.category}
            originalIdx={idx}
            itemIdx={idx}
            scaleFactor={scaleFactor}
            formatAmount={formatAmount}
            hideNutrition={true}
          />
        ))}
      </ul>
    </div>
  );
};

export default PreviewIngredientsCard;
