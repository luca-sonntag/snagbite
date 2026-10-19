import type { FC } from 'react';
import { Button } from '@heroui/react';
import { ShieldCheck, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import { formatQuantity } from '../../utils/formatQuantity';
import { cleanMatchedIngredientName } from '../../utils/formatNutrition';
import type { Ingredient } from '../../types';
import IngredientIcon from '../IngredientIcon';
import IngredientMacroCard from './IngredientMacroCard';

export interface IngredientNutritionDetailsProps {
  ingredient: Ingredient;
  category?: string;
  scaleFactor?: number;
  servings?: number;
  showHeader?: boolean;
  hideCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

export const IngredientNutritionDetails: FC<IngredientNutritionDetailsProps> = ({
  ingredient,
  category,
  scaleFactor = 1,
  servings = 1,
  showHeader = true,
  hideCloseButton = false,
  onClose,
  className = 'flex flex-col gap-4 text-gray-900 dark:text-white max-w-lg mx-auto w-full',
}) => {
  const { t } = useI18n();

  const safeAmount = ingredient.amount ?? 0;
  const formattedAmount = safeAmount > 0 ? formatQuantity(safeAmount * scaleFactor, ingredient.unit) : '';
  const displayAmount = formattedAmount
    ? (ingredient.unit ? `${formattedAmount} ${ingredient.unit}` : formattedAmount)
    : '';

  const scaledCalories = Math.round((ingredient.calories ?? 0) * scaleFactor);
  const scaledProtein = Math.round((ingredient.protein ?? 0) * scaleFactor * 10) / 10;
  const scaledCarbs = Math.round((ingredient.carbs ?? 0) * scaleFactor * 10) / 10;
  const scaledFat = Math.round((ingredient.fat ?? 0) * scaleFactor * 10) / 10;

  // Per-serving breakdown (when recipe has more than 1 serving)
  const isMultiServing = servings > 1;
  const perServingCalories = isMultiServing ? Math.round(scaledCalories / servings) : scaledCalories;
  const perServingProtein = isMultiServing ? Math.round((scaledProtein / servings) * 10) / 10 : scaledProtein;
  const perServingCarbs = isMultiServing ? Math.round((scaledCarbs / servings) * 10) / 10 : scaledCarbs;
  const perServingFat = isMultiServing ? Math.round((scaledFat / servings) * 10) / 10 : scaledFat;

  // Calorie contribution calculation
  const proteinKcal = scaledProtein * 4;
  const carbsKcal = scaledCarbs * 4;
  const fatKcal = scaledFat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const carbsPct = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

  // Check if ingredient has a separate consumed amount (cooking medium / deep-frying oil)
  const hasConsumedDifference =
    ingredient.consumedAmount !== undefined &&
    ingredient.consumedAmount !== null &&
    ingredient.consumedAmount > 0 &&
    ingredient.consumedAmount < safeAmount;

  const effectiveNutrientAmount = hasConsumedDifference ? ingredient.consumedAmount! : safeAmount;
  const scaledNutrientAmount = Math.round(effectiveNutrientAmount * scaleFactor * 10) / 10;

  // Estimated per 100g calories if gram weight is determinable
  let per100gKcal: number | null = null;
  const unitLower = (ingredient.unit || '').toLowerCase().trim();
  if (['g', 'gramm', 'grams', 'ml'].includes(unitLower) && scaledNutrientAmount > 0) {
    per100gKcal = Math.round((scaledCalories / scaledNutrientAmount) * 100);
  } else if (ingredient.gramsPerUnit && ingredient.gramsPerUnit > 0) {
    const totalGrams = scaledNutrientAmount * ingredient.gramsPerUnit;
    if (totalGrams > 0) {
      per100gKcal = Math.round((scaledCalories / totalGrams) * 100);
    }
  }

  const showCloseAction = Boolean(onClose && !hideCloseButton);

  return (
    <div className={className}>
      {/* 1. Header */}
      {showHeader && (
        <div className="w-full flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <IngredientIcon
              baseName={ingredient.baseName}
              canonicalId={ingredient.canonicalId}
              category={category || ingredient.category}
              name={ingredient.name}
              synonyms={ingredient.synonyms}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                {ingredient.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                {displayAmount}
                {ingredient.brand && ` · ${ingredient.brand}`}
                {ingredient.modifier && ` (${ingredient.modifier})`}
                {scaleFactor !== 1 && ` · ×${scaleFactor}`}
              </p>
              {hasConsumedDifference && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <span>
                    {t('recipe.ingredientNutritionConsumedHint', {
                      amount: formatQuantity(ingredient.consumedAmount! * scaleFactor, ingredient.unit),
                      unit: ingredient.unit,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          {showCloseAction && (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose?.();
              }}
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0 active:scale-95 transition-all cursor-pointer border-none"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Calories Hero Banner */}
      <div className="flex items-center justify-between gap-3 py-1">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t('recipe.calories')}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2.5xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">
              {scaledCalories}
            </span>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">kcal</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 sm:gap-5 shrink-0">
          {isMultiServing && (
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                {t('recipe.nutritionPerServing')}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                ≈ {perServingCalories} kcal
              </span>
            </div>
          )}
          {per100gKcal !== null && (
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                {t('recipe.per100g')}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                ≈ {per100gKcal} kcal
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. 3-Color Macro Progress Bar */}
      {totalMacroKcal > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{t('recipe.ingredientNutritionDistribution')}</span>
            <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500 tabular-nums">
              {proteinPct}% E · {carbsPct}% K · {fatPct}% F
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex shadow-inner">
            {proteinPct > 0 && (
              <div
                style={{ width: `${proteinPct}%` }}
                className="h-full bg-blue-500 transition-all duration-500"
                title={`Protein: ${proteinPct}%`}
              />
            )}
            {carbsPct > 0 && (
              <div
                style={{ width: `${carbsPct}%` }}
                className="h-full bg-amber-500 transition-all duration-500"
                title={`Kohlenhydrate: ${carbsPct}%`}
              />
            )}
            {fatPct > 0 && (
              <div
                style={{ width: `${fatPct}%` }}
                className="h-full bg-rose-500 transition-all duration-500"
                title={`Fett: ${fatPct}%`}
              />
            )}
          </div>
        </div>
      )}

      {/* 4. 3 Macro Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <IngredientMacroCard
          label={t('recipe.ingredientNutritionProtein')}
          color="blue"
          grams={scaledProtein}
          pct={proteinPct}
          isMultiServing={isMultiServing}
          perServingGrams={perServingProtein}
        />
        <IngredientMacroCard
          label={t('recipe.ingredientNutritionCarbs')}
          color="amber"
          grams={scaledCarbs}
          pct={carbsPct}
          isMultiServing={isMultiServing}
          perServingGrams={perServingCarbs}
        />
        <IngredientMacroCard
          label={t('recipe.ingredientNutritionFat')}
          color="rose"
          grams={scaledFat}
          pct={fatPct}
          isMultiServing={isMultiServing}
          perServingGrams={perServingFat}
        />
      </div>

      {/* 5. Verification Status */}
      {ingredient.isVerified ? (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 tracking-tight block">
              {t('recipe.ingredientNutritionVerifiedBadge')}
            </span>
            {cleanMatchedIngredientName(ingredient.matchedName) && (
              <span className="text-[11.5px] text-emerald-700/80 dark:text-emerald-300/80 truncate block font-normal mt-0.5">
                {cleanMatchedIngredientName(ingredient.matchedName)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-gray-200/60 dark:bg-gray-700/60 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-snug">
            {t('recipe.ingredientNutritionEstimatedBadge')}
          </span>
        </div>
      )}

      {/* 6. Optional Close CTA Button */}
      {showCloseAction && (
        <Button
          onPress={onClose}
          className="w-full py-3.5 mt-1 rounded-2xl font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-none active:scale-[0.98] transition-all h-12 text-sm"
        >
          {t('recipe.ingredientNutritionClose')}
        </Button>
      )}
    </div>
  );
};

export default IngredientNutritionDetails;
