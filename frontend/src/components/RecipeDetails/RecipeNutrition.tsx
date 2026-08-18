import { useState } from 'react';
import AiNotice from '../AiNotice';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import PremiumModal from '../PremiumModal';
import { Lock, Flame } from 'lucide-react';

interface RecipeNutritionProps {
  nutritionalValues: any;
  sourceNutritionalValues?: any;
  isAiEstimated: boolean;
  isVerified?: boolean;
  showTotalNutrition?: boolean;
  onToggleTotalNutrition?: (isTotal: boolean) => void;
  getNutritionDisplayValue: (val: any, unit?: string, isTotal?: boolean, includeUnit?: boolean) => string;
  /**
   * `summary` is the headline figure carried by the metrics row at the top of
   * the page: calories plus the macro distribution bar. `detail` is the full
   * per-macro breakdown that sits in its own section further down. Splitting
   * them keeps the numbers in one component while letting the page show the
   * short version early and the long version where it belongs.
   */
  variant?: 'summary' | 'detail';
}

export default function RecipeNutrition({
  nutritionalValues,
  sourceNutritionalValues,
  isAiEstimated,
  isVerified,
  getNutritionDisplayValue,
  variant = 'detail'
}: RecipeNutritionProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const parseNum = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const match = String(val).trim().match(/^([\d.,]+)/);
    if (!match) return 0;
    const n = parseFloat(match[1].replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const isSummary = variant === 'summary';

  const proteinNum = parseNum(nutritionalValues?.protein);
  const carbsNum = parseNum(nutritionalValues?.carbs);
  const fatNum = parseNum(nutritionalValues?.fat);

  const proteinKcal = proteinNum * 4;
  const carbsKcal = carbsNum * 4;
  const fatKcal = fatNum * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const carbsPct = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

  const iconBadge =
    'w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0';
  const iconClass = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const statLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';

  // Only worth showing when it actually disagrees with the computed figure — an
  // identical number twice is noise, a diverging one is information (the source
  // knows the finished dish, the sum only knows the shopping list).
  const sourceCalories = parseNum(sourceNutritionalValues?.calories);
  const computedCalories = parseNum(nutritionalValues?.calories);
  const showSourceCalories =
    sourceCalories > 0 &&
    computedCalories > 0 &&
    Math.abs(sourceCalories - computedCalories) / computedCalories >= 0.1;

  const caloriesDisplay = getNutritionDisplayValue(nutritionalValues?.calories, 'kcal', false, false);
  const proteinDisplay = getNutritionDisplayValue(nutritionalValues?.protein, 'g', false, false);
  const carbsDisplay = getNutritionDisplayValue(nutritionalValues?.carbs, 'g', false, false);
  const fatDisplay = getNutritionDisplayValue(nutritionalValues?.fat, 'g', false, false);

  return (
    <>
      <div
        className="relative py-3.5 px-4.5 sm:px-5"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            {/* Green Circle Badge matching Clock / Utensils / Users */}
            <div className={iconBadge}>
              <Flame className={iconClass} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Top Header Row: NÄHRWERTE (PRO PORTION) label */}
              <div className="flex items-center gap-1.5 min-w-0 mb-1">
                <span className={statLabel}>
                  {t('recipe.nutritionTitle')} ({t('recipe.nutritionPerServing')})
                </span>
                {isAiEstimated && isPremium && (
                  <AiNotice
                    type="badge"
                    tooltipText={isVerified ? t('recipe.verifiedDatabaseTooltip') : undefined}
                  />
                )}
              </div>

              {isSummary ? (
                /* Headline figure only (Calories always visible, crisp & unblurred) */
                <div className="flex items-baseline gap-1.5">
                  <span className="text-gray-900 dark:text-white text-2xl font-bold tabular-nums leading-none">
                    {caloriesDisplay}
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('recipe.nutritionCalories')}
                  </span>
                </div>
              ) : (
                /* 4-column grid: Calories crisp, 3 Macros blurred/grayed if not premium */
                <div className="grid grid-cols-4 gap-1.5 text-left items-start">
                  {/* Calories - unblurred */}
                  <div>
                    <div className="text-gray-900 dark:text-white text-base font-bold tabular-nums leading-tight">
                      {caloriesDisplay}
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {t('recipe.nutritionCalories')}
                    </div>
                  </div>

                  {/* Protein */}
                  <div
                    onClick={() => !isPremium && setIsPremiumModalOpen(true)}
                    className={!isPremium ? 'filter blur-[2.5px] select-none opacity-60 cursor-pointer' : ''}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-[3px] shrink-0 ${isPremium ? 'bg-blue-500' : 'bg-blue-500/70'}`} />
                      <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                        {isPremium ? `${proteinDisplay}g` : '00g'}
                      </span>
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {t('recipe.ingredientNutritionProtein')}
                    </div>
                  </div>

                  {/* Carbs */}
                  <div
                    onClick={() => !isPremium && setIsPremiumModalOpen(true)}
                    className={!isPremium ? 'filter blur-[2.5px] select-none opacity-60 cursor-pointer' : ''}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-[3px] shrink-0 ${isPremium ? 'bg-amber-500' : 'bg-amber-500/70'}`} />
                      <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                        {isPremium ? `${carbsDisplay}g` : '00g'}
                      </span>
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {t('recipe.nutritionCarbs')}
                    </div>
                  </div>

                  {/* Fat */}
                  <div
                    onClick={() => !isPremium && setIsPremiumModalOpen(true)}
                    className={!isPremium ? 'filter blur-[2.5px] select-none opacity-60 cursor-pointer' : ''}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-[3px] shrink-0 ${isPremium ? 'bg-rose-500' : 'bg-rose-500/70'}`} />
                      <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                        {isPremium ? `${fatDisplay}g` : '00g'}
                      </span>
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {t('recipe.ingredientNutritionFat')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* What the recipe source itself claimed, when it disagrees with the sum */}
          {!isSummary && showSourceCalories && (
            <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 pl-12">
              {t('recipe.nutritionSourceClaim', { value: String(Math.round(sourceCalories)) })}
            </div>
          )}

          {/* Macro distribution in summary variant: colored in Premium, unified blur across bar & legend in Free */}
          {isSummary && (
            <div
              onClick={() => !isPremium && setIsPremiumModalOpen(true)}
              className={`relative flex flex-col gap-1.5 mt-0.5 ${!isPremium ? 'cursor-pointer group' : ''}`}
            >
              {isPremium ? (
                totalMacroKcal > 0 && (
                  <>
                    {/* Progress bar */}
                    <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner">
                      {proteinPct > 0 && (
                        <div
                          style={{ width: `${proteinPct}%` }}
                          className="h-full bg-blue-500 transition-all duration-500"
                          title={`${t('recipe.ingredientNutritionProtein')}: ${proteinPct}%`}
                        />
                      )}
                      {carbsPct > 0 && (
                        <div
                          style={{ width: `${carbsPct}%` }}
                          className="h-full bg-amber-500 transition-all duration-500"
                          title={`${t('recipe.nutritionCarbs')}: ${carbsPct}%`}
                        />
                      )}
                      {fatPct > 0 && (
                        <div
                          style={{ width: `${fatPct}%` }}
                          className="h-full bg-rose-500 transition-all duration-500"
                          title={`${t('recipe.ingredientNutritionFat')}: ${fatPct}%`}
                        />
                      )}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3.5 flex-wrap">
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-gray-500 dark:text-gray-400">
                        <span className="w-2 h-2 rounded-[3px] bg-blue-500 shrink-0" />
                        {t('recipe.ingredientNutritionProtein')}
                        <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{proteinDisplay}g</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-gray-500 dark:text-gray-400">
                        <span className="w-2 h-2 rounded-[3px] bg-amber-500 shrink-0" />
                        {t('recipe.nutritionCarbs')}
                        <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{carbsDisplay}g</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-gray-500 dark:text-gray-400">
                        <span className="w-2 h-2 rounded-[3px] bg-rose-500 shrink-0" />
                        {t('recipe.ingredientNutritionFat')}
                        <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{fatDisplay}g</span>
                      </span>
                    </div>
                  </>
                )
              ) : (
                /* Free mode: unified blurred wrapper over progress bar + legend with overlay button */
                <div className="relative">
                  <div className="flex flex-col gap-1.5 filter blur-[4px] select-none opacity-45 pointer-events-none transition-all">
                    {/* Progress bar preview: 1/3 colors blurred */}
                    <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner">
                      <div className="w-1/3 h-full bg-blue-500" />
                      <div className="w-1/3 h-full bg-amber-500" />
                      <div className="w-1/3 h-full bg-rose-500" />
                    </div>

                    {/* Legend preview */}
                    <div className="flex items-center gap-3.5 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-gray-600 dark:text-gray-300">
                        <span className="w-2 h-2 rounded-[3px] bg-blue-500 shrink-0" />
                        {t('recipe.ingredientNutritionProtein')}
                        <span className="tabular-nums font-semibold">12g</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-gray-600 dark:text-gray-300">
                        <span className="w-2 h-2 rounded-[3px] bg-amber-500 shrink-0" />
                        {t('recipe.nutritionCarbs')}
                        <span className="tabular-nums font-semibold">45g</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-gray-600 dark:text-gray-300">
                        <span className="w-2 h-2 rounded-[3px] bg-rose-500 shrink-0" />
                        {t('recipe.ingredientNutritionFat')}
                        <span className="tabular-nums font-semibold">20g</span>
                      </span>
                    </div>
                  </div>

                  {/* Centered / Right-aligned Unlock CTA badge */}
                  <div className="absolute inset-0 flex items-center justify-end">
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-500/20 group-hover:bg-emerald-500/25 px-3 py-1 rounded-full shadow-sm border border-emerald-500/20 backdrop-blur-sm transition-all">
                      <Lock className="w-3 h-3" />
                      {t('premium.hint.unlockMacros')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          )}
        </div>
      </div>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />
    </>
  );
}
