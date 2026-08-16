import { useState } from 'react';
import AiNotice from '../AiNotice';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import PremiumModal from '../PremiumModal';
import { Lock, Flame } from 'lucide-react';

interface RecipeNutritionProps {
  nutritionalValues: any;
  isAiEstimated: boolean;
  isVerified?: boolean;
  showTotalNutrition?: boolean;
  onToggleTotalNutrition?: (isTotal: boolean) => void;
  getNutritionDisplayValue: (val: any, unit?: string, isTotal?: boolean, includeUnit?: boolean) => string;
}

export default function RecipeNutrition({
  nutritionalValues,
  isAiEstimated,
  isVerified,
  getNutritionDisplayValue
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
    'w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0';
  const iconClass = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const statLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';

  const caloriesDisplay = getNutritionDisplayValue(nutritionalValues?.calories, 'kcal', false, false);
  const proteinDisplay = getNutritionDisplayValue(nutritionalValues?.protein, 'g', false, false);
  const carbsDisplay = getNutritionDisplayValue(nutritionalValues?.carbs, 'g', false, false);
  const fatDisplay = getNutritionDisplayValue(nutritionalValues?.fat, 'g', false, false);

  return (
    <>
      <div
        onClick={() => !isPremium && setIsPremiumModalOpen(true)}
        className={`relative py-3.5 px-4.5 sm:px-5 transition-all duration-300 ${!isPremium ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''
          }`}
      >
        <div
          className={`flex flex-col gap-2.5 transition-all duration-300 ${!isPremium ? 'filter blur-sm select-none pointer-events-none opacity-30' : ''
            }`}
        >
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

              {/* 4-column grid: Calories + 3 Macros with colored dots */}
              <div className="grid grid-cols-4 gap-1.5 text-left items-start">
                {/* Calories */}
                <div>
                  <div className="text-gray-900 dark:text-white text-base font-bold tabular-nums leading-tight">
                    {caloriesDisplay}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {t('recipe.nutritionCalories')}
                  </div>
                </div>

                {/* Protein */}
                <div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                      {proteinDisplay}g
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {t('recipe.ingredientNutritionProtein')}
                  </div>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                      {carbsDisplay}g
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {t('recipe.nutritionCarbs')}
                  </div>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                      {fatDisplay}g
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {t('recipe.ingredientNutritionFat')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Color Macro Progress Bar as a subtle visual indicator */}
          {totalMacroKcal > 0 && isPremium && (
            <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner">
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
          )}
        </div>

        {/* Locked Overlay */}
        {!isPremium && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/[0.01] dark:bg-white/[0.01] rounded-xl z-10">
            <div className="flex items-center gap-1.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white text-[10px] font-extrabold px-3.5 py-1.5 rounded-full shadow-md border border-emerald-400/20 active:scale-95 transition-all">
              <Lock className="w-3 h-3" />
              <span>{t('premium.hint.unlockNutrition')}</span>
            </div>
          </div>
        )}
      </div>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />
    </>
  );
}
