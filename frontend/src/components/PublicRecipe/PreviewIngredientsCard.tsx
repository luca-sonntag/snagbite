import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { Recipe } from '../../types';
import type { SortedIngredientGroup } from '../RecipeDetails/types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme, categoryOrder, legacyCategoryMap } from '../../i18n';
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
  const { t, translateCategory } = useI18n();

  const sortedIngredients: SortedIngredientGroup[] = useMemo(() => {
    if (!recipe.ingredients) return [];
    const mapped = recipe.ingredients.map((group, originalIdx) => ({ group, originalIdx }));
    return mapped.sort((a, b) => {
      const getCategoryIndex = (name: string) => {
        const cleanName = name.trim().toUpperCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = categoryOrder.indexOf(cleanName as any);
        if (idx !== -1) return idx;
        const enumKey = legacyCategoryMap[name.trim().toLowerCase()];
        if (enumKey) return categoryOrder.indexOf(enumKey);
        return 999;
      };
      return getCategoryIndex(a.group.name) - getCategoryIndex(b.group.name);
    });
  }, [recipe.ingredients]);

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none overflow-hidden divide-y divide-gray-100/70 dark:divide-gray-800/60">
      {/* 1. Servings Header (Display only, no stepper in preview) */}
      <div className="px-4.5 py-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('recipe.serves')}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {t('recipe.servingsCount', { count: servings })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Grouped Ingredients */}
      <div className="px-4.5 py-4.5 sm:px-6 flex flex-col gap-5">
        {sortedIngredients.map(({ group, originalIdx }) => {
          const theme = getCategoryTheme(group.name);
          return (
            <div key={group.name} className="flex flex-col gap-2.5">
              {group.name && (
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className={`w-1 h-3.5 rounded-full ${theme.barClass} shrink-0`} />
                  <span>{translateCategory(group.name)}</span>
                </h4>
              )}
              <ul className="flex flex-col gap-1 list-none p-0 m-0">
                {group.items.map((ing, idx) => (
                  <IngredientItemRow
                    key={`${ing.name}-${originalIdx}-${idx}`}
                    ingredient={ing}
                    categoryName={group.name}
                    originalIdx={originalIdx}
                    itemIdx={idx}
                    scaleFactor={scaleFactor}
                    formatAmount={formatAmount}
                    hideNutrition={true}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreviewIngredientsCard;
