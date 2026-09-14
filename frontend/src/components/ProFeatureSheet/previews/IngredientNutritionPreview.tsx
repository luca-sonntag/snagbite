import { IngredientItemRow } from '../../RecipeDetails/IngredientItemRow';
import type { Ingredient } from '../../../types';

const SAMPLE_ITEMS: { ingredient: Ingredient; category: string }[] = [
  {
    ingredient: {
      name: 'Lachsfilet (frisch)',
      amount: 200,
      unit: 'g',
      calories: 416,
      protein: 40,
      carbs: 0,
      fat: 26,
    },
    category: 'SEAFOOD',
  },
  {
    ingredient: {
      name: 'Avocado',
      amount: 1,
      unit: 'Stück',
      calories: 240,
      protein: 3,
      carbs: 12,
      fat: 22,
    },
    category: 'VEGETABLES',
  },
];

export default function IngredientNutritionPreview() {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-1.5 sm:p-2 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] select-none">
      <ul className="divide-y divide-gray-100/70 dark:divide-gray-800/60">
        {SAMPLE_ITEMS.map((item, idx) => (
          <IngredientItemRow
            key={idx}
            ingredient={item.ingredient}
            categoryName={item.category}
            originalIdx={0}
            itemIdx={idx}
            isPremium={true}
            formatAmount={(amt, unit) => `${amt ?? ''}${unit ? ` ${unit}` : ''}`}
          />
        ))}
      </ul>
    </div>
  );
}
