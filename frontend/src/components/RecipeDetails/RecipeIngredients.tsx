import { useState } from 'react';
import { Button } from '@heroui/react';
import { Check, Salad, Users, ShoppingCart } from 'lucide-react';
import type { Ingredient, Recipe } from '../../types';
import type { SortedIngredientGroup } from './types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import { hapticLight } from '../../utils/haptics';
import IngredientNutritionSheet from './IngredientNutritionSheet';
import RecipeServingsStepper from './RecipeServingsStepper';
import IngredientItemRow from './IngredientItemRow';
import AlternativeIngredientsList from './AlternativeIngredientsList';
import PremiumModal from '../PremiumModal';

interface RecipeIngredientsProps {
  recipe: Recipe;
  sortedIngredients: SortedIngredientGroup[];
  isPremium: boolean;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onAddIngredients?: () => void;
  isAdded: boolean;
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
}

export default function RecipeIngredients({
  recipe,
  sortedIngredients,
  isPremium,
  scaleFactor,
  formatAmount,
  onAddIngredients,
  isAdded,
  servings,
  onDecreaseServings,
  onIncreaseServings,
}: RecipeIngredientsProps) {
  const { t, translateCategory } = useI18n();
  const [selectedNutrition, setSelectedNutrition] = useState<{ ingredient: Ingredient; category: string } | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const ingredientCount = sortedIngredients.reduce(
    (sum, { group }) => sum + group.items.length,
    0
  );

  const medallion =
    'w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0';
  const medallionIcon = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const blockLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';

  return (
    <div className="flex flex-col gap-4 pb-4">


      {/* Main Cohesive Card Group (Portions + Ingredients List + Shopping Button) */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* 1. Servings / Portion scaling header inside card */}
        <div className="px-4.5 py-3.5 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={medallion}>
              <Users className={medallionIcon} />
            </div>
            <div className="flex flex-col">
              <span className={blockLabel}>{t('recipe.serves')}</span>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                {t('recipe.servingsCount', { count: servings })}
              </span>
            </div>
          </div>
          <RecipeServingsStepper
            servings={servings}
            onDecreaseServings={onDecreaseServings}
            onIncreaseServings={onIncreaseServings}
          />
        </div>

        {/* 2. Grouped Ingredients List */}
        <div className="px-4.5 py-4.5 sm:px-6 flex flex-col gap-5">
          {sortedIngredients.map(({ group, originalIdx }) => {
            const theme = getCategoryTheme(group.name);
            return (
              <div key={group.name} className="flex flex-col gap-2.5">
                {group.name && (
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-1 h-3.5 rounded-full ${theme.barClass} shrink-0`} />
                    <span>{translateCategory(group.name)}</span>
                  </h4>
                )}
                <ul className="flex flex-col gap-1">
                  {group.items.map((ing, idx) => (
                    <IngredientItemRow
                      key={`${ing.name}-${originalIdx}-${idx}`}
                      ingredient={ing}
                      categoryName={group.name}
                      originalIdx={originalIdx}
                      itemIdx={idx}
                      isPremium={isPremium}
                      scaleFactor={scaleFactor}
                      formatAmount={formatAmount}
                      onSelectNutrition={(item, cat) => setSelectedNutrition({ ingredient: item, category: cat })}
                      onOpenPremium={() => setIsPremiumModalOpen(true)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* 3. Add to Shopping List Button (Inside Card Footer) */}
        {onAddIngredients && (
          <div className="px-4.5 py-3.5 sm:px-6 bg-black/[0.01] dark:bg-white/[0.01]">
            <Button
              className={`w-full h-12 min-h-[48px] rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98] border-none shadow-none cursor-pointer ${
                isAdded
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}
              onPress={() => {
                hapticLight();
                onAddIngredients();
              }}
            >
              {isAdded ? (
                <>
                  <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recipe.addedToShopping')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recipe.addToShopping')}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Alternative ingredients section */}
      {recipe.alternativeIngredients && recipe.alternativeIngredients.length > 0 && (
        <AlternativeIngredientsList alternativeIngredients={recipe.alternativeIngredients} />
      )}

      {/* Ingredient Nutrition Detail Sheet (Premium only) */}
      <IngredientNutritionSheet
        isOpen={Boolean(selectedNutrition)}
        onClose={() => setSelectedNutrition(null)}
        ingredient={selectedNutrition?.ingredient ?? null}
        category={selectedNutrition?.category}
        scaleFactor={scaleFactor}
        servings={servings}
      />

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />
    </div>
  );
}
