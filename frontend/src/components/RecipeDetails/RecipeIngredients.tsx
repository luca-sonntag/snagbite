import { useState } from 'react';
import { Button } from '@heroui/react';
import { Check, Flame, Salad, ChevronRight, Users, ShoppingCart, ArrowRight, ArrowLeftRight } from 'lucide-react';
import type { Ingredient, Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import { getParentIngredient } from '../../utils/ingredientTaxonomy';
import IngredientNutritionSheet from './IngredientNutritionSheet';
import RecipeServingsStepper from './RecipeServingsStepper';
import PremiumModal from '../PremiumModal';

interface RecipeIngredientsProps {
  recipe: Recipe;
  sortedIngredients: Array<{ group: { name: string; items: Ingredient[] }; originalIdx: number }>;
  showIngredientNutrition: boolean;
  onToggleIngredientNutrition: () => void;
  hasIngredientNutrition: boolean;
  isPremium: boolean;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onAddIngredients?: () => void;
  isAdded: boolean;
  /** Scaling lives here rather than in the metrics row, so the amounts it
   *  rewrites are on screen while the user adjusts it. */
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
}

export default function RecipeIngredients({
  recipe,
  sortedIngredients,
  showIngredientNutrition,
  onToggleIngredientNutrition,
  hasIngredientNutrition,
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
  const [selectedNutritionIngredient, setSelectedNutritionIngredient] = useState<Ingredient | null>(null);
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
      {/* Section Header (OUTSIDE card) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={medallion}>
            <Salad className={medallionIcon} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('recipe.tabIngredients')}</h3>
          {ingredientCount > 0 && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
              {ingredientCount}
            </span>
          )}
        </div>
        {hasIngredientNutrition && (
          <button
            type="button"
            onClick={onToggleIngredientNutrition}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none border-none active:scale-95 cursor-pointer ${
              showIngredientNutrition
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title={
              !isPremium
                ? t('recipe.aiIngredientsEstimateTooltip')
                : t('recipe.verifiedDatabaseTooltip')
            }
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{t('recipe.showNutritionPerIngredient')}</span>
          </button>
        )}
      </div>

      {/* Main Cohesive Card Group (Portions + Ingredients List + Shopping Button) */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* 1. Servings / Portion scaling header inside card */}
        <div className="px-5 py-4 sm:px-6 flex items-center justify-between gap-4">
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
        <div className="px-5 py-5 sm:px-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-6">
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
                {group.items.map((ing, idx) => {
                  const scaledAmount = formatAmount(ing.amount, ing.unit);
                  const amountStr = scaledAmount ? `${scaledAmount} ` : '';
                  const unitStr = ing.unit ? `${ing.unit} ` : '';
                  const name = ing.name;
                  const uniqueId = `${name}-${originalIdx}-${idx}`;
                  const parent = getParentIngredient(ing);
                  const showParentBadge = parent && parent.name.toLowerCase().trim() !== name.toLowerCase().trim();

                  return (
                    <li
                      key={uniqueId}
                      onClick={() => {
                        if (showIngredientNutrition && ing.calories) {
                          if (!isPremium) {
                            setIsPremiumModalOpen(true);
                          } else {
                            setSelectedNutritionIngredient(ing);
                          }
                        }
                      }}
                      className={`flex items-center justify-between gap-2 py-1.5 transition-all ${
                        showIngredientNutrition && ing.calories
                          ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-xl px-1 -mx-1 active:scale-[0.99]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-20 text-right pr-2.5 border-r border-black/5 dark:border-white/10 font-semibold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap flex-shrink-0">
                          {amountStr || '\u00A0'}{unitStr || '\u00A0'}
                        </span>
                        <div className="flex-1 pl-1.5 min-w-0 flex flex-col justify-center py-0.5">
                          {ing.replacedOriginal && (
                            <span className="text-[11px] leading-tight text-red-500/70 dark:text-red-400/70 line-through font-normal truncate block mb-0.5">
                              {ing.replacedOriginal}
                            </span>
                          )}
                          <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm text-gray-800 dark:text-gray-200">
                            <span className="font-medium">{name}</span>
                            {showParentBadge && (
                              <span className="text-xs text-gray-400 dark:text-gray-400 font-normal">
                                {t('recipe.parentDerivedLabel', { parent: parent.name })}
                              </span>
                            )}
                            {ing.modifier && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                ({ing.modifier})
                              </span>
                            )}
                          </div>
                          {ing.notes && <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{ing.notes}</span>}
                        </div>
                      </div>

                      {showIngredientNutrition && (ing.calories !== undefined && ing.calories !== null) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isPremium) {
                              setIsPremiumModalOpen(true);
                            } else {
                              setSelectedNutritionIngredient(ing);
                            }
                          }}
                          className={`px-2 py-1 rounded-full inline-flex items-center gap-1 text-xs font-semibold shrink-0 border-none transition-all active:scale-95 cursor-pointer ${
                            isPremium
                              ? ing.isVerified
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                              : 'bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-400 dark:text-gray-500'
                          }`}
                          title={isPremium && ing.matchedName ? t('recipe.verifiedIngredientTooltip', { name: ing.matchedName }) : undefined}
                        >
                          {isPremium ? (
                            <>
                              <span className="tabular-nums">{Math.round(ing.calories * scaleFactor)} kcal</span>
                              <ChevronRight className="w-3 h-3 opacity-40 -ml-0.5" />
                            </>
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        </div>

        {/* 3. Add to Shopping List Button (Inside Card Footer) */}
        {onAddIngredients && (
          <div className="px-5 py-3.5 sm:px-6 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
            <Button
              className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 h-11 text-xs sm:text-sm active:scale-[0.98] border-none shadow-none ${
                isAdded
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}
              onPress={onAddIngredients}
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recipe.addedToShopping')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recipe.addToShopping')}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {recipe.alternativeIngredients && recipe.alternativeIngredients.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          {/* Section Header (OUTSIDE card) */}
          <div className="flex items-center gap-3">
            <div className={medallion}>
              <ArrowLeftRight className={medallionIcon} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('recipe.alternativeIngredients')}
            </h3>
            <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
              {recipe.alternativeIngredients.length}
            </span>
          </div>

          {/* Clean Flat Card Container */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5">
            {recipe.alternativeIngredients.map((alt, idx) => (
              <div
                key={idx}
                className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-3.5 transition-all"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 line-through decoration-gray-400/60 bg-gray-200/60 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg">
                    {alt.original}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                    {alt.substitute}
                  </span>
                </div>
                {alt.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    {alt.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Nutrition Detail Sheet (Premium only) */}
      <IngredientNutritionSheet
        isOpen={Boolean(selectedNutritionIngredient)}
        onClose={() => setSelectedNutritionIngredient(null)}
        ingredient={selectedNutritionIngredient}
        scaleFactor={scaleFactor}
      />

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />
    </div>
  );
}
