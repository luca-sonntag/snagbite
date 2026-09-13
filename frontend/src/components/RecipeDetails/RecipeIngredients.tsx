import { useState } from 'react';
import { Button } from '@heroui/react';
import { Check, Users, ShoppingCart, ChevronRight } from 'lucide-react';
import ProBadge from '../ProBadge';
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
  const hasAnyNutrition = sortedIngredients.some(({ group }) =>
    group.items.some((ing) => ing.calories !== undefined && ing.calories !== null)
  );


  const medallion =
    'w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0';
  const medallionIcon = 'w-4 h-4 text-emerald-600 dark:text-emerald-400';
  const blockLabel =
    'text-xs font-medium text-gray-500 dark:text-gray-400';

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 1. Single Cohesive Card for All Ingredients */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none overflow-hidden divide-y divide-gray-100/70 dark:divide-gray-800/60">
        {/* 1.1 Servings Header */}
        <div className="px-4.5 py-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={medallion}>
              <Users className={medallionIcon} />
            </div>
            <div className="flex flex-col">
              <span className={blockLabel}>{t('recipe.serves')}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
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

        {/* 1.2 Grouped Category Sections */}
        <div className="px-4.5 py-3 sm:px-6 flex flex-col divide-y divide-gray-100/70 dark:divide-gray-800/60">
          {sortedIngredients.map(({ group, originalIdx }) => {
            const theme = getCategoryTheme(group.name);
            return (
              <div key={group.name || originalIdx} className="py-3.5 first:pt-1 last:pb-1 flex flex-col gap-1.5">
                {/* Category Header Bar */}
                {group.name && (
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${theme.barClass} shrink-0`} />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {translateCategory(group.name)}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                      {group.items.length === 1
                        ? t('recipe.ingredientCount')
                        : t('recipe.ingredientsCount', { count: group.items.length })}
                    </span>
                  </div>
                )}

                {/* Ingredients List with soft hairline dividers */}
                <ul className="flex flex-col divide-y divide-gray-100/60 dark:divide-gray-800/50 list-none p-0 m-0">
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

        {/* 1.3 Single PRO hint for ingredient nutrition */}
        {!isPremium && hasAnyNutrition && (
          <div
            onClick={() => {
              hapticLight();
              setIsPremiumModalOpen(true);
            }}
            className="px-4.5 py-3 sm:px-6 bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-between gap-3 cursor-pointer group hover:bg-gray-100/60 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
              {t('recipe.ingredientNutritionProHint') || 'Detaillierte Nährwerte & Makros pro Zutat'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <ProBadge variant="chip" />
              <div className="w-7 h-7 rounded-full shadow-xs flex items-center justify-center bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* 1.4 Integrated Shopping List Button Footer */}
        {onAddIngredients && (
          <div className="px-4.5 py-3.5 sm:px-6 bg-white dark:bg-gray-900">
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
