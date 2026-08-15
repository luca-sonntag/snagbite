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

  const iconBadge =
    'w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0';
  const iconClass = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const statLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';

  return (
    <>
      <div
        onClick={() => !isPremium && setIsPremiumModalOpen(true)}
        className={`relative pt-2.5 pb-3 px-4.5 sm:px-5 transition-all duration-300 ${!isPremium ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''
          }`}
      >
        <div className="flex items-center gap-3">
          {/* Green Circle Badge matching Clock / Utensils / Users */}
          <div className={iconBadge}>
            <Flame className={iconClass} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Top Header Row: NÄHRWERTE (PRO PORTION) label */}
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

            {/* 4-column grid — calories prominent, macros secondary */}
            <div className={`grid grid-cols-4 gap-1.5 text-left items-center transition-all duration-300 ${!isPremium ? 'filter blur-sm select-none pointer-events-none opacity-30' : ''}`}>
              {/* Calories — primary focal value */}
              <div>
                <div className="text-gray-900 dark:text-white text-base font-bold tabular-nums leading-tight">
                  {getNutritionDisplayValue(nutritionalValues.calories, 'kcal', false, false)}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {t('recipe.nutritionCalories')}
                </div>
              </div>
              {/* Protein — secondary */}
              <div>
                <div className="text-gray-600 dark:text-gray-300 text-xs font-semibold tabular-nums leading-tight">
                  {getNutritionDisplayValue(nutritionalValues.protein, 'g', false, true)}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {t('recipe.nutritionProtein')}
                </div>
              </div>
              {/* Carbs — secondary */}
              <div>
                <div className="text-gray-600 dark:text-gray-300 text-xs font-semibold tabular-nums leading-tight">
                  {getNutritionDisplayValue(nutritionalValues.carbs, 'g', false, true)}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {t('recipe.nutritionCarbs')}
                </div>
              </div>
              {/* Fat — secondary */}
              <div>
                <div className="text-gray-600 dark:text-gray-300 text-xs font-semibold tabular-nums leading-tight">
                  {getNutritionDisplayValue(nutritionalValues.fat, 'g', false, true)}
                </div>
                <div className="text-[9px] sm:text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {t('recipe.nutritionFat')}
                </div>
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
