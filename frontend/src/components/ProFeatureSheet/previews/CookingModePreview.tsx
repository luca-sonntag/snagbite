import { useMemo } from 'react';
import type { Recipe } from '../../../types';
import type { StepIngredientItem } from '../../CookingMode/types';
import CookingTimerCard from '../../CookingMode/CookingTimerCard';
import CookingModeIngredients from '../../CookingMode/CookingModeIngredients';
import RecipeInstructionText from '../../RecipeInstructionText';
import CachedImage from '../../CachedImage';
import { useI18n } from '../../../context/I18nContext';
import { formatQuantity } from '../../../utils/formatQuantity';

export default function CookingModePreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');

  const stepIngredients: StepIngredientItem[] = useMemo(
    () => [
      {
        name: isEn ? 'Coconut milk' : 'Kokosmilch',
        baseName: 'coconut_milk',
        canonicalId: 'coconut_milk',
        amount: 400,
        unit: 'ml',
        category: 'Milchprodukte & Alternativen',
      },
      {
        name: isEn ? 'Red curry paste' : 'Rote Currypaste',
        baseName: 'curry_paste',
        canonicalId: 'curry_paste',
        amount: 2,
        unit: isEn ? 'tbsp' : 'EL',
        category: 'Gewürze & Kräuter',
      },
    ],
    [isEn]
  );

  const mockRecipe: Recipe = useMemo(
    () => ({
      id: 'preview-cooking-recipe',
      title: isEn ? 'Creamy Coconut Curry' : 'Cremiges Kokos-Curry',
      description: '',
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      emoji: '🥘',
      equipment: [],
      ingredients: [
        {
          name: 'Sauce',
          items: stepIngredients,
        },
      ],
      instructions: [
        { step: 1, description: 'Step 1' },
        { step: 2, description: 'Step 2' },
        { step: 3, description: 'Step 3' },
      ],
    }),
    [isEn, stepIngredients]
  );

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-3.5 sm:p-4 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3 select-none">
      {/* 1. Active Timer at Top */}
      <CookingTimerCard
        label={isEn ? 'Simmer gently' : 'Sanft köcheln'}
        countdownStr="08:45"
        progress={0.7}
        isFinished={false}
      />

      {/* 2. Recipe Cover Image */}
      <div className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden relative shadow-xs shrink-0 bg-gray-100 dark:bg-gray-800/80">
        <CachedImage
          src={mockRecipe.imageUrl}
          emoji={mockRecipe.emoji}
          alt={mockRecipe.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 3. Step Progress Row */}
      <div className="flex items-center gap-3 w-full px-0.5">
        <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-xs shadow-xs shrink-0">
          3
        </div>
        <div className="flex-1 bg-black/[0.06] dark:bg-white/[0.08] h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full w-3/5 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
          3 / 5
        </span>
      </div>

      {/* 4. Step Instruction Text with Highlighted Ingredients & Timers */}
      <div className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 leading-relaxed px-0.5">
        <RecipeInstructionText
          variant="focused"
          text={
            isEn
              ? 'Stir in [Red curry paste](ing:curry_paste), add [Coconut milk](ing:coconut_milk), and simmer gently on medium heat for [12 minutes](timer:720).'
              : '[Rote Currypaste](ing:curry_paste) einrühren, [Kokosmilch](ing:coconut_milk) hinzugeben und bei mittlerer Hitze für [12 Minuten](timer:720) sanft köcheln lassen.'
          }
          recipe={mockRecipe}
          formatAmount={formatQuantity}
          stepNum={3}
        />
      </div>

      {/* 5. Contextual Step Ingredients List */}
      <CookingModeIngredients
        ingredients={stepIngredients}
        formatAmount={formatQuantity}
        className="px-0.5 pt-1 pb-0.5"
      />
    </div>
  );
}
