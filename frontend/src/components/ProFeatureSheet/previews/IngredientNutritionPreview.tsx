import { useState, useMemo } from 'react';
import { IngredientItemRow } from '../../RecipeDetails/IngredientItemRow';
import { IngredientNutritionDetails } from '../../RecipeDetails/IngredientNutritionDetails';
import type { Ingredient } from '../../../types';
import { useI18n } from '../../../context/I18nContext';
import { formatQuantity } from '../../../utils/formatQuantity';
import { hapticLight } from '../../../utils/haptics';

export default function IngredientNutritionPreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const sampleItems: { ingredient: Ingredient; category: string }[] = useMemo(
    () => [
      {
        ingredient: {
          name: isEn ? 'Salmon fillet (fresh)' : 'Lachsfilet (frisch)',
          baseName: 'salmon',
          canonicalId: 'salmon',
          amount: 200,
          unit: 'g',
          calories: 416,
          protein: 40,
          carbs: 0,
          fat: 26,
          isVerified: true,
          matchedName: isEn ? 'Atlantic salmon, raw' : 'Lachs / Salm, frisch',
        },
        category: 'SEAFOOD',
      },
      {
        ingredient: {
          name: 'Avocado',
          baseName: 'avocado',
          canonicalId: 'avocado',
          amount: 1,
          unit: isEn ? 'pc' : 'Stück',
          calories: 240,
          protein: 3,
          carbs: 12,
          fat: 22,
          isVerified: true,
          matchedName: isEn ? 'Avocado, fresh' : 'Avocado, frisch',
        },
        category: 'VEGETABLES',
      },
    ],
    [isEn]
  );

  const selectedItem = sampleItems[selectedIdx] ?? sampleItems[0];

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* 1. Interactive Recipe Ingredients List */}
      <div className="w-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        <ul className="divide-y divide-gray-100/70 dark:divide-gray-800/60 list-none p-0 m-0">
          {sampleItems.map((item, idx) => (
            <IngredientItemRow
              key={idx}
              ingredient={item.ingredient}
              categoryName={item.category}
              originalIdx={0}
              itemIdx={idx}
              isPremium={true}
              formatAmount={formatQuantity}
              onSelectNutrition={() => {
                hapticLight();
                setSelectedIdx(idx);
              }}
            />
          ))}
        </ul>
      </div>

      {/* 2. Authentic Bottom Sheet Content Preview */}
      <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 sm:p-5 border-none shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-1">
        {/* Sheet Handle indicator */}
        <div className="w-9 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 shrink-0" />

        <IngredientNutritionDetails
          ingredient={selectedItem.ingredient}
          category={selectedItem.category}
          scaleFactor={1}
          servings={1}
          showHeader={true}
          hideCloseButton={true}
          className="flex flex-col gap-3.5 text-gray-900 dark:text-white w-full"
        />
      </div>
    </div>
  );
}
