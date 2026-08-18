import { Clock, Utensils, Users, ChevronRight } from 'lucide-react';
import RecipeNutrition from './RecipeNutrition';
import { useI18n } from '../../context/I18nContext';

interface RecipeInfoSectionProps {
  prepTime: any;
  cookTime: any;
  formatTimeValue: (time: any) => string;
  servings: number;
  onOpenAdjustServings?: () => void;
  /** Nutrition block is omitted entirely when the recipe carries no values. */
  nutritionalValues: any | null;
  /** What the recipe source claimed, shown only when it diverges from the computed figure. */
  sourceNutritionalValues?: any | null;
  isAiEstimated: boolean;
  isVerified?: boolean;
  showTotalNutrition: boolean;
  onToggleTotalNutrition: (isTotal: boolean) => void;
  getNutritionDisplayValue: (val: any, unit?: string, isTotal?: boolean, includeUnit?: boolean) => string;
}

/**
 * The metrics row at the top of the recipe page: prep time, cook time and
 * servings as three equal figures, followed by the calorie headline and the
 * macro bar.
 *
 * Deliberately short. The full per-macro breakdown lives in its own section
 * below the instructions, and the servings *stepper* sits in the ingredients
 * header where its effect is visible — this row only reports the number.
 */
export default function RecipeInfoSection({
  prepTime,
  cookTime,
  formatTimeValue,
  servings,
  onOpenAdjustServings,
  nutritionalValues,
  sourceNutritionalValues,
  isAiEstimated,
  isVerified,
  showTotalNutrition,
  onToggleTotalNutrition,
  getNutritionDisplayValue,
}: RecipeInfoSectionProps) {
  const { t } = useI18n();

  const iconClass = 'w-[17px] h-[17px] text-emerald-600 dark:text-emerald-400';
  const statLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';
  const statValue = 'text-sm font-bold text-gray-900 dark:text-white';

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3">
        {/* Prep time */}
        <div className="flex flex-col items-center gap-1 py-3.5 px-2 text-center">
          <Clock className={iconClass} />
          <span className={statLabel}>{t('recipe.prep')}</span>
          <span className={statValue}>{formatTimeValue(prepTime)}</span>
        </div>

        {/* Cook time */}
        <div className="flex flex-col items-center gap-1 py-3.5 px-2 text-center border-l border-black/5 dark:border-white/5">
          <Utensils className={iconClass} />
          <span className={statLabel}>{t('recipe.cook')}</span>
          <span className={statValue}>{formatTimeValue(cookTime)}</span>
        </div>

        {/* Servings — reported here, adjusted in the ingredients section */}
        <button
          type="button"
          onClick={onOpenAdjustServings}
          disabled={!onOpenAdjustServings}
          className={`flex flex-col items-center gap-1 py-3.5 px-2 text-center border-l border-black/5 dark:border-white/5 bg-transparent border-y-0 border-r-0 outline-none transition-colors ${
            onOpenAdjustServings
              ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              : ''
          }`}
        >
          <Users className={iconClass} />
          <span className={statLabel}>{t('recipe.serves')}</span>
          <span className={`${statValue} flex items-center gap-0.5`}>
            <span className="tabular-nums">{servings}</span>
            {onOpenAdjustServings && (
              <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 opacity-60" />
            )}
          </span>
        </button>
      </div>

      {/* Calorie headline + macro distribution */}
      {nutritionalValues && (
        <div className="border-t border-black/5 dark:border-white/5">
          <RecipeNutrition
            variant="summary"
            nutritionalValues={nutritionalValues}
            sourceNutritionalValues={sourceNutritionalValues}
            isAiEstimated={isAiEstimated}
            isVerified={isVerified}
            showTotalNutrition={showTotalNutrition}
            onToggleTotalNutrition={onToggleTotalNutrition}
            getNutritionDisplayValue={getNutritionDisplayValue}
          />
        </div>
      )}
    </div>
  );
}
