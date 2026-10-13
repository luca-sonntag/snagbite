import { useState } from 'react';
import { Button } from '@heroui/react';
import { Check, ShoppingCart, ChevronRight, LayoutGrid, List } from 'lucide-react';
import ProBadge from '../ProBadge';
import type { Ingredient, Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import IngredientNutritionSheet from './IngredientNutritionSheet';
import RecipeServingsStepper from './RecipeServingsStepper';
import IngredientItemRow from './IngredientItemRow';
import IngredientItemGrid from './IngredientItemGrid';
import AlternativeIngredientsList from './AlternativeIngredientsList';
import PremiumModal from '../PremiumModal';
import ProFeatureSheet from '../ProFeatureSheet';

interface RecipeIngredientsProps {
  recipe: Recipe;
  sortedIngredients: Ingredient[];
  isPremium: boolean;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onAddIngredients?: () => void;
  isAdded: boolean;
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
  isExtracting?: boolean;
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
  isExtracting = false,
}: RecipeIngredientsProps) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('recipe_ingredients_view') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    hapticLight();
    setViewMode(mode);
    try {
      localStorage.setItem('recipe_ingredients_view', mode);
    } catch {
      // ignore
    }
  };

  const [selectedNutrition, setSelectedNutrition] = useState<{ ingredient: Ingredient; category?: string } | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isProFeatureSheetOpen, setIsProFeatureSheetOpen] = useState(false);
  const hasAnyNutrition = sortedIngredients.some((ing) =>
    ing.calories !== undefined && ing.calories !== null
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 1. Unified Cohesive Recipe Card (Servings + Ingredients + Pro Hint + Shopping CTA) */}
      <div id="tour-recipe-ingredients" className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none overflow-hidden divide-y divide-gray-100/70 dark:divide-gray-800/60">
        {/* 1.1 Servings Header */}
        {isExtracting ? (
          <div className="px-4.5 py-3.5 sm:px-6 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-16 bg-gray-200/90 dark:bg-gray-800/90 rounded-md" />
              <div className="h-4.5 w-24 bg-gray-200/90 dark:bg-gray-800/90 rounded-md" />
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="h-10 w-28 bg-gray-200/90 dark:bg-gray-800/90 rounded-2xl" />
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gray-200/90 dark:bg-gray-800/90" />
            </div>
          </div>
        ) : (
          <div className="px-4.5 py-3.5 sm:px-6 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('recipe.serves')}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                {t('recipe.servingsCount', { count: servings })}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <RecipeServingsStepper
                servings={servings}
                onDecreaseServings={onDecreaseServings}
                onIncreaseServings={onIncreaseServings}
              />

              {/* Single View Mode Toggle Button (right of stepper) */}
              <Button
                isIconOnly
                variant="tertiary"
                className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-0 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center"
                onPress={() => {
                  hapticLight();
                  handleViewModeChange(viewMode === 'grid' ? 'list' : 'grid');
                }}
                aria-label={viewMode === 'grid' ? t('recipe.viewList') : t('recipe.viewGrid')}
              >
                {viewMode === 'grid' ? (
                  <List className="w-4 h-4" />
                ) : (
                  <LayoutGrid className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 1.2 Ingredients Display (Grid 2-column or List) */}
        {sortedIngredients.length === 0 && isExtracting ? (
          viewMode === 'grid' ? (
            <ul className="grid grid-cols-2 gap-x-1.5 sm:gap-x-3 gap-y-1.5 px-2 pt-2 pb-3.5 sm:px-3.5 sm:pt-2.5 sm:pb-4.5 list-none m-0">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <li
                  key={`ing-skel-grid-${i}`}
                  className="p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl animate-pulse flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                    <div className="h-3.5 w-14 bg-gray-200 dark:bg-gray-700 rounded-md" />
                  </div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 sm:p-5 flex flex-col gap-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={`ing-skel-${i}`}
                  className="flex items-center gap-3 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl animate-pulse"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-md shrink-0" />
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded-md" />
                </div>
              ))}
            </div>
          )
        ) : viewMode === 'grid' ? (
          <ul className="grid grid-cols-2 gap-x-1.5 sm:gap-x-3 gap-y-1.5 px-2 pt-2 pb-3.5 sm:px-3.5 sm:pt-2.5 sm:pb-4.5 list-none m-0 animate-fade-in">
            {sortedIngredients.map((ing, idx) => (
              <IngredientItemGrid
                key={`${ing.name}-${idx}`}
                ingredient={ing}
                categoryName={ing.category}
                originalIdx={idx}
                itemIdx={idx}
                isPremium={isPremium}
                scaleFactor={scaleFactor}
                formatAmount={formatAmount}
                onSelectNutrition={(item, cat) => setSelectedNutrition({ ingredient: item, category: cat })}
                onOpenProFeature={() => setIsProFeatureSheetOpen(true)}
              />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100/60 dark:divide-gray-800/50 list-none p-0 m-0 animate-fade-in">
            {sortedIngredients.map((ing, idx) => (
              <IngredientItemRow
                key={`${ing.name}-${idx}`}
                ingredient={ing}
                categoryName={ing.category}
                originalIdx={idx}
                itemIdx={idx}
                isPremium={isPremium}
                scaleFactor={scaleFactor}
                formatAmount={formatAmount}
                onSelectNutrition={(item, cat) => setSelectedNutrition({ ingredient: item, category: cat })}
                onOpenProFeature={() => setIsProFeatureSheetOpen(true)}
              />
            ))}
          </ul>
        )}

        {/* 1.3 PRO hint for ingredient nutrition */}
        {!isPremium && hasAnyNutrition && (
          <div
            onClick={() => {
              hapticLight();
              setIsProFeatureSheetOpen(true);
            }}
            className="px-4.5 py-3 sm:px-6 bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-between gap-3 cursor-pointer group hover:bg-gray-100/60 dark:hover:bg-gray-800/50 transition-colors animate-fade-in"
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
        {onAddIngredients ? (
          <Button
            className={`w-full min-h-[64px] h-auto pl-6.5 pr-5 py-5 sm:pl-7.5 sm:pr-6 sm:py-5.5 rounded-none font-semibold transition-colors flex items-center justify-between text-sm border-none shadow-none cursor-pointer group bg-white hover:bg-gray-50/90 active:bg-gray-100/70 dark:bg-gray-900 dark:hover:bg-gray-850 dark:active:bg-gray-800 animate-fade-in ${
              isAdded
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-800 dark:text-gray-100'
            }`}
            onPress={() => {
              hapticLight();
              onAddIngredients();
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {isAdded ? (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <ShoppingCart className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
              )}
              <span className="truncate text-sm font-semibold">
                {isAdded ? t('recipe.addedToShopping') : t('recipe.addToShopping')}
              </span>
            </div>
            <ChevronRight
              className={`w-4.5 h-4.5 shrink-0 group-hover:translate-x-0.5 transition-transform ${
                isAdded
                  ? 'text-emerald-600/70 dark:text-emerald-400/70'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
          </Button>
        ) : isExtracting ? (
          <div className="w-full min-h-[64px] pl-6.5 pr-5 py-5 sm:pl-7.5 sm:pr-6 sm:py-5.5 flex items-center justify-between bg-white dark:bg-gray-900 animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-md bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded-md" />
            </div>
            <div className="w-4 h-4 rounded-md bg-gray-200 dark:bg-gray-800" />
          </div>
        ) : null}
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

      <ProFeatureSheet
        isOpen={isProFeatureSheetOpen}
        featureId="ingredient_nutrition"
        onClose={() => setIsProFeatureSheetOpen(false)}
        onUpgrade={() => {
          setIsProFeatureSheetOpen(false);
          setIsPremiumModalOpen(true);
        }}
      />

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />
    </div>
  );
}
