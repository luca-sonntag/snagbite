import { useState, useMemo } from 'react';
import { Button } from '@heroui/react';
import { Check, ShoppingCart, ChevronRight } from 'lucide-react';
import ProBadge from '../ProBadge';
import type { Ingredient, Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import IngredientNutritionSheet from './IngredientNutritionSheet';
import RecipeIngredientsHeader from './RecipeIngredientsHeader';
import IngredientGroupSection from './IngredientGroupSection';
import AlternativeIngredientsList from './AlternativeIngredientsList';
import PremiumModal from '../PremiumModal';
import ProFeatureSheet from '../ProFeatureSheet';
import { hasRecipeComponents, groupIngredientsByComponent } from '../../utils/recipeComponents';

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

  const hasComponents = useMemo(() => hasRecipeComponents(recipe), [recipe]);
  const componentGroups = useMemo(() => groupIngredientsByComponent(recipe.ingredients), [recipe.ingredients]);

  const [groupingMode, setGroupingMode] = useState<'components' | 'category'>(() => {
    try {
      return (localStorage.getItem('recipe_ingredients_grouping') as 'components' | 'category') || 'components';
    } catch {
      return 'components';
    }
  });

  const handleGroupingModeChange = (mode: 'components' | 'category') => {
    hapticLight();
    setGroupingMode(mode);
    try {
      localStorage.setItem('recipe_ingredients_grouping', mode);
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
    <div className="flex flex-col gap-4 pb-2">
      {/* 1. Open-Canvas Ingredients Section (Servings + Ingredients + Pro Hint + Shopping CTA) */}
      <div className="flex flex-col border-none divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        {/* 1.1 Servings Header & View / Grouping Toggles */}
        <RecipeIngredientsHeader
          isExtracting={isExtracting}
          servings={servings}
          onDecreaseServings={onDecreaseServings}
          onIncreaseServings={onIncreaseServings}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          hasComponents={hasComponents}
          groupingMode={groupingMode}
          onGroupingModeChange={handleGroupingModeChange}
        />

        {/* 1.2 Ingredients Display */}
        {sortedIngredients.length === 0 && isExtracting ? (
          viewMode === 'grid' ? (
            <ul className="grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-1.5 pt-2 pb-3.5 list-none m-0">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <li
                  key={`ing-skel-grid-${i}`}
                  className="p-3 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl animate-pulse flex flex-col gap-2"
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
            <div className="py-3 flex flex-col gap-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={`ing-skel-${i}`}
                  className="flex items-center gap-3 p-3 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl animate-pulse"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-md shrink-0" />
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded-md" />
                </div>
              ))}
            </div>
          )
        ) : hasComponents && groupingMode === 'components' ? (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {componentGroups.map((group, gIdx) => {
              const title = group.sectionName
                ? group.sectionName.toLowerCase().startsWith('für ') || group.sectionName.toLowerCase().startsWith('for ')
                  ? group.sectionName
                  : t('recipe.componentFor', { name: group.sectionName })
                : t('recipe.componentOther');
              const offset = componentGroups
                .slice(0, gIdx)
                .reduce((acc, curr) => acc + curr.items.length, 0);

              return (
                <IngredientGroupSection
                  key={group.sectionName || `group-${gIdx}`}
                  title={title}
                  count={group.items.length}
                  ingredients={group.items}
                  viewMode={viewMode}
                  isPremium={isPremium}
                  scaleFactor={scaleFactor}
                  formatAmount={formatAmount}
                  onSelectNutrition={(item, cat) => setSelectedNutrition({ ingredient: item, category: cat })}
                  onOpenProFeature={() => setIsProFeatureSheetOpen(true)}
                  itemOffset={offset}
                />
              );
            })}
          </div>
        ) : (
          <IngredientGroupSection
            ingredients={sortedIngredients}
            viewMode={viewMode}
            isPremium={isPremium}
            scaleFactor={scaleFactor}
            formatAmount={formatAmount}
            onSelectNutrition={(item, cat) => setSelectedNutrition({ ingredient: item, category: cat })}
            onOpenProFeature={() => setIsProFeatureSheetOpen(true)}
          />
        )}

        {/* 1.3 PRO hint for ingredient nutrition */}
        {!isPremium && hasAnyNutrition && (
          <div
            onClick={() => {
              hapticLight();
              setIsProFeatureSheetOpen(true);
            }}
            className="px-3.5 py-3 mt-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-between gap-3 cursor-pointer group hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors animate-fade-in border-none"
          >
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
              {t('recipe.ingredientNutritionProHint') || 'Detaillierte Nährwerte & Makros pro Zutat'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <ProBadge variant="chip" />
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* 1.4 Full-Width Soft Shopping List Button */}
        {onAddIngredients ? (
          <div className="pt-3 border-none">
            <Button
              className={`w-full min-h-[54px] h-auto px-4 py-3.5 rounded-2xl font-semibold transition-colors flex items-center justify-between text-sm border-none shadow-none cursor-pointer group bg-black/[0.04] hover:bg-black/[0.07] active:bg-black/[0.1] dark:bg-white/[0.06] dark:hover:bg-white/[0.09] dark:active:bg-white/[0.12] animate-fade-in ${
                isAdded
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-800 dark:text-gray-100'
              }`}
              onPress={() => {
                hapticLight();
                onAddIngredients();
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
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
          </div>
        ) : isExtracting ? (
          <div className="w-full min-h-[54px] px-4 py-3.5 mt-2 rounded-2xl flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.04] animate-pulse border-none">
            <div className="flex items-center gap-3">
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
