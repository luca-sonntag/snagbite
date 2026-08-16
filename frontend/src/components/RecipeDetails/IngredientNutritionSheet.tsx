import { Drawer, Button } from '@heroui/react';
import { Flame, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAdOverlay } from '../../context/OverlayStackContext';
import type { Ingredient } from '../../types';

interface IngredientNutritionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  scaleFactor?: number;
}

export default function IngredientNutritionSheet({
  isOpen,
  onClose,
  ingredient,
  scaleFactor = 1,
}: IngredientNutritionSheetProps) {
  const { t } = useI18n();
  useAdOverlay(isOpen);

  if (!ingredient) return null;

  // Scaled amounts & macro values
  const scaledAmount = Math.round(ingredient.amount * scaleFactor * 10) / 10;
  const scaledCalories = Math.round((ingredient.calories ?? 0) * scaleFactor);
  const scaledProtein = Math.round((ingredient.protein ?? 0) * scaleFactor * 10) / 10;
  const scaledCarbs = Math.round((ingredient.carbs ?? 0) * scaleFactor * 10) / 10;
  const scaledFat = Math.round((ingredient.fat ?? 0) * scaleFactor * 10) / 10;

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
            <Drawer.Dialog className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-white pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle className="bg-gray-300 dark:bg-gray-700" />

              <div className="p-5 sm:p-6 flex flex-col gap-4 text-gray-900 dark:text-white max-w-lg mx-auto w-full">
                {/* Header */}
                <div className="w-full flex items-start justify-between gap-3 pt-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                      {ingredient.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                      {scaledAmount > 0 && `${scaledAmount} ${ingredient.unit || ''}`.trim()}
                      {ingredient.modifier && ` (${ingredient.modifier})`}
                      {scaleFactor !== 1 && ` · ×${scaleFactor}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0 active:scale-95 transition-all"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Verification Status Pill */}
                {ingredient.isVerified ? (
                  <div className="bg-emerald-500/[0.08] dark:bg-emerald-400/[0.12] text-emerald-800 dark:text-emerald-300 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-medium border border-emerald-500/15">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold block text-emerald-900 dark:text-emerald-200">
                        {t('recipe.ingredientNutritionVerifiedBadge')}
                      </span>
                      {ingredient.matchedName && (
                        <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate block">
                          BLS: {ingredient.matchedName}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-medium">
                    <Sparkles className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-[11.5px] leading-tight">
                      {t('recipe.ingredientNutritionEstimatedBadge')}
                    </span>
                  </div>
                )}

                {/* Calories Hero Banner */}
                <div className="bg-emerald-500/10 dark:bg-emerald-500/15 rounded-3xl p-4 sm:p-5 flex items-center justify-between border border-emerald-500/15">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                      <Flame className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                        {t('recipe.calories')}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                          {scaledCalories}
                        </span>
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">kcal</span>
                      </div>
                    </div>
                  </div>

                  {per100gKcal !== null && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 block">
                        {t('recipe.per100g')}
                      </span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        ≈ {per100gKcal} kcal
                      </span>
                    </div>
                  )}
                </div>

                {/* 3-Color Macro Progress Bar */}
                {totalMacroKcal > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                      <span>{t('recipe.ingredientNutritionDistribution')}</span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {proteinPct}% E · {carbsPct}% K · {fatPct}% F
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex shadow-inner">
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

                {/* 3 Macro Cards (Clean Flat Style) */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Protein */}
                  <div className="bg-blue-500/10 dark:bg-blue-500/15 rounded-2xl p-3 flex flex-col justify-between border border-blue-500/15 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
                        {t('recipe.ingredientNutritionProtein')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight block">
                        {scaledProtein} <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">g</span>
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        {Math.round(proteinKcal)} kcal
                      </span>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl p-3 flex flex-col justify-between border border-amber-500/15 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
                        {t('recipe.ingredientNutritionCarbs')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight block">
                        {scaledCarbs} <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">g</span>
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        {Math.round(carbsKcal)} kcal
                      </span>
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="bg-rose-500/10 dark:bg-rose-500/15 rounded-2xl p-3 flex flex-col justify-between border border-rose-500/15 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate">
                        {t('recipe.ingredientNutritionFat')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight block">
                        {scaledFat} <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">g</span>
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        {Math.round(fatKcal)} kcal
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close CTA Button */}
                <Button
                  onPress={onClose}
                  className="w-full py-3.5 mt-1 rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-none active:scale-[0.98] transition-all h-12 text-sm"
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
