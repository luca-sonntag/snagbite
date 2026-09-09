import { Drawer, Button } from '@heroui/react';
import { Flame, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import type { Ingredient } from '../../types';
import IngredientIcon from '../IngredientIcon';

interface IngredientNutritionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  category?: string;
  scaleFactor?: number;
  servings?: number;
}

export default function IngredientNutritionSheet({
  isOpen,
  onClose,
  ingredient,
  category,
  scaleFactor = 1,
  servings = 1,
}: IngredientNutritionSheetProps) {
  const { t } = useI18n();
  useModalOverlay(isOpen);

  if (!ingredient) return null;

  // Scaled amounts & macro values (for total selected servings)
  const scaledAmount = Math.round(ingredient.amount * scaleFactor * 10) / 10;
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

  // Estimated per 100g calories if gram weight is determinable
  let per100gKcal: number | null = null;
  const unitLower = (ingredient.unit || '').toLowerCase().trim();
  if (['g', 'gramm', 'grams', 'ml'].includes(unitLower) && scaledAmount > 0) {
    per100gKcal = Math.round((scaledCalories / scaledAmount) * 100);
  } else if (ingredient.gramsPerUnit && ingredient.gramsPerUnit > 0) {
    const totalGrams = scaledAmount * ingredient.gramsPerUnit;
    if (totalGrams > 0) {
      per100gKcal = Math.round((scaledCalories / totalGrams) * 100);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          className="!z-[100]"
        >
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 !p-0 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              <div className="p-5 sm:p-6 flex flex-col gap-4 text-gray-900 dark:text-white max-w-lg mx-auto w-full">
                {/* Header */}
                <div className="w-full flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <IngredientIcon
                      baseName={ingredient.baseName}
                      canonicalId={ingredient.canonicalId}
                      category={category || ingredient.category}
                      name={ingredient.name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                        {ingredient.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        {scaledAmount > 0 && `${scaledAmount} ${ingredient.unit || ''}`.trim()}
                        {ingredient.brand && ` · ${ingredient.brand}`}
                        {ingredient.modifier && ` (${ingredient.modifier})`}
                        {scaleFactor !== 1 && ` · ×${scaleFactor}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onClose();
                    }}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0 active:scale-95 transition-all cursor-pointer border-none"
                    aria-label="Close"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Calories Hero Banner */}
                <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:to-transparent rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                      <Flame className="w-5.5 h-5.5" />
                    </div>
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

                {/* 3-Color Macro Progress Bar */}
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

                {/* 3 Macro Cards (Gradient Style matching Calories Banner) */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Protein */}
                  <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/15 dark:to-transparent rounded-2xl p-3 flex flex-col justify-between text-left">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-[2.5px] bg-blue-500 shrink-0" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
                        {t('recipe.ingredientNutritionProtein')}
                      </span>
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight block tabular-nums">
                        {scaledProtein} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">g</span>
                      </span>
                      <div className="flex items-center justify-between text-[10.5px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                        <span>{proteinPct}%</span>
                        {isMultiServing && (
                          <span className="tabular-nums opacity-90">≈{perServingProtein}g/P.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent rounded-2xl p-3 flex flex-col justify-between text-left">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-[2.5px] bg-amber-500 shrink-0" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
                        {t('recipe.ingredientNutritionCarbs')}
                      </span>
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight block tabular-nums">
                        {scaledCarbs} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">g</span>
                      </span>
                      <div className="flex items-center justify-between text-[10.5px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                        <span>{carbsPct}%</span>
                        {isMultiServing && (
                          <span className="tabular-nums opacity-90">≈{perServingCarbs}g/P.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-500/15 dark:to-transparent rounded-2xl p-3 flex flex-col justify-between text-left">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-[2.5px] bg-rose-500 shrink-0" />
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate">
                        {t('recipe.ingredientNutritionFat')}
                      </span>
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight block tabular-nums">
                        {scaledFat} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">g</span>
                      </span>
                      <div className="flex items-center justify-between text-[10.5px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                        <span>{fatPct}%</span>
                        {isMultiServing && (
                          <span className="tabular-nums opacity-90">≈{perServingFat}g/P.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Status Pill - Clean Flat Style */}
                {ingredient.isVerified ? (
                  <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 rounded-2xl p-3.5 flex items-center gap-3 border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 tracking-tight block">
                        {t('recipe.ingredientNutritionVerifiedBadge')}
                      </span>
                      {ingredient.matchedName && (
                        <span className="text-[11.5px] text-emerald-700/80 dark:text-emerald-300/80 truncate block font-normal mt-0.5">
                          {ingredient.matchedName}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl p-3.5 flex items-center gap-3 border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                    <div className="w-9 h-9 rounded-xl bg-gray-200/60 dark:bg-gray-700/60 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-snug">
                      {t('recipe.ingredientNutritionEstimatedBadge')}
                    </span>
                  </div>
                )}

                {/* Close CTA Button */}
                <Button
                  onPress={onClose}
                  className="w-full py-3.5 mt-1 rounded-2xl font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-none active:scale-[0.98] transition-all h-12 text-sm"
                >
                  {t('recipe.ingredientNutritionClose')}
                </Button>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
