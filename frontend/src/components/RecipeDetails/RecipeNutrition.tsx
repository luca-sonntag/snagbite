import { useState } from 'react';
import AiNotice from '../AiNotice';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import PremiumModal from '../PremiumModal';
import { Flame } from 'lucide-react';
import MacroDistribution from './MacroDistribution';
import HealthScoreBadge from './HealthScoreBadge';
import HealthScoreSheet from './HealthScoreSheet';
import type { NutritionalValues, HealthScoreBreakdown } from '../../types';

type NutritionValue = string | number | null | undefined;

interface RecipeNutritionProps {
  nutritionalValues: NutritionalValues;
  sourceNutritionalValues?: NutritionalValues | null;
  healthScore?: number | null;
  healthScoreBreakdown?: HealthScoreBreakdown | null;
  isAiEstimated: boolean;
  isVerified?: boolean;
  showTotalNutrition?: boolean;
  onToggleTotalNutrition?: (isTotal: boolean) => void;
  getNutritionDisplayValue: (val: NutritionValue, unit?: string, isTotal?: boolean, includeUnit?: boolean) => string;
  /**
   * `summary` is the headline figure carried by the metrics row at the top of
   * the page: calories plus the macro distribution bar. `detail` is the full
   * per-macro breakdown that sits in its own section further down.
   */
  variant?: 'summary' | 'detail';
  onOpenCopilot?: (initialPrompt?: string) => void;
}

export default function RecipeNutrition({
  nutritionalValues,
  sourceNutritionalValues,
  healthScore,
  healthScoreBreakdown,
  isAiEstimated,
  isVerified,
  getNutritionDisplayValue,
  variant = 'detail',
  onOpenCopilot,
}: RecipeNutritionProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isHealthScoreSheetOpen, setIsHealthScoreSheetOpen] = useState(false);

  const parseNum = (val: NutritionValue): number => {
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
    'text-xs font-medium text-gray-500 dark:text-gray-400';

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
                        {`${proteinDisplay}g`}
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
                        {`${carbsDisplay}g`}
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
                        {`${fatDisplay}g`}
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
            <MacroDistribution
              proteinDisplay={proteinDisplay}
              proteinPct={proteinPct}
              carbsDisplay={carbsDisplay}
              carbsPct={carbsPct}
              fatDisplay={fatDisplay}
              fatPct={fatPct}
              totalMacroKcal={totalMacroKcal}
              isPremium={isPremium}
              onUnlockPremium={() => setIsPremiumModalOpen(true)}
            />
          )}

          {/* Health Score Panel (Full-width across the nutrition box) */}
          {healthScore !== undefined && healthScore !== null && (
            <div className="-mx-4.5 sm:-mx-5 -mb-3.5 mt-3 border-t border-gray-100/70 dark:border-gray-800/60 overflow-hidden rounded-b-3xl">
              <HealthScoreBadge
                score={healthScore}
                breakdown={healthScoreBreakdown}
                onClick={() => setIsHealthScoreSheetOpen(true)}
                fullWidth
              />
            </div>
          )}
        </div>
      </div>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />

      {healthScore !== undefined && healthScore !== null && (
        <HealthScoreSheet
          isOpen={isHealthScoreSheetOpen}
          onClose={() => setIsHealthScoreSheetOpen(false)}
          score={healthScore}
          breakdown={healthScoreBreakdown}
          onOpenCopilot={onOpenCopilot}
        />
      )}
    </>
  );
}
