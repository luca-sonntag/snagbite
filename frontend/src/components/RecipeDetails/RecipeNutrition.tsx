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
        className={`relative p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all duration-300 ${!isPremium ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''
          }`}
      >
        {/* Top Header Row: NÄHRWERTE (PRO PORTION) label + AI badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
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
          {totalMacroKcal > 0 && isPremium && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
              {proteinPct}% E · {carbsPct}% K · {fatPct}% F
            </span>
          )}
        </div>

        <div
          className={`flex flex-col gap-2.5 transition-all duration-300 ${!isPremium ? 'filter blur-sm select-none pointer-events-none opacity-30' : ''
            }`}
        >
          {/* Calories Hero Banner matching IngredientNutritionSheet */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:to-transparent rounded-2xl p-3 sm:p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {t('recipe.calories')}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
                {caloriesDisplay}
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">kcal</span>
            </div>
          </div>

          {/* 3-Color Macro Progress Bar */}
          {totalMacroKcal > 0 && (
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

          {/* 3 Macro Cards (Gradient Style matching IngredientNutritionSheet) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Protein */}
            <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/15 dark:to-transparent rounded-xl p-2.5 flex flex-col justify-between text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
                  {t('recipe.ingredientNutritionProtein')}
                </span>
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight block tabular-nums">
                  {proteinDisplay}{' '}
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">g</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold block mt-0.5">
                  {proteinPct}%
                </span>
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent rounded-xl p-2.5 flex flex-col justify-between text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
                  {t('recipe.ingredientNutritionCarbs')}
                </span>
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight block tabular-nums">
                  {carbsDisplay}{' '}
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">g</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold block mt-0.5">
                  {carbsPct}%
                </span>
              </div>
            </div>

            {/* Fat */}
            <div className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-500/15 dark:to-transparent rounded-xl p-2.5 flex flex-col justify-between text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate">
                  {t('recipe.ingredientNutritionFat')}
                </span>
              </div>
              <div>
                <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight block tabular-nums">
                  {fatDisplay}{' '}
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">g</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold block mt-0.5">
                  {fatPct}%
                </span>
              </div>
            </div>
          </div>
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
