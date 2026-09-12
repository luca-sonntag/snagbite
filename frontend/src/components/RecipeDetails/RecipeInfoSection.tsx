import { Clock, Utensils, Users } from 'lucide-react';
import RecipeNutrition from './RecipeNutrition';
import { useI18n } from '../../context/I18nContext';
import type { NutritionalValues, HealthScoreBreakdown } from '../../types';

interface RecipeInfoSectionProps {
  prepTime?: string | number | null;
  cookTime?: string | number | null;
  formatTimeValue: (time: string | number | null | undefined) => string;
  servings: number;

  /** Nutrition block is omitted entirely when the recipe carries no values. */
  nutritionalValues: NutritionalValues | null;
  /** What the recipe source claimed, shown only when it diverges from the computed figure. */
  sourceNutritionalValues?: NutritionalValues | null;
  healthScore?: number | null;
  healthScoreBreakdown?: HealthScoreBreakdown | null;
  isAiEstimated: boolean;
  isVerified?: boolean;
  showTotalNutrition: boolean;
  onToggleTotalNutrition: (isTotal: boolean) => void;
  getNutritionDisplayValue: (val: string | number | null | undefined, unit?: string, isTotal?: boolean, includeUnit?: boolean) => string;
  onOpenCopilot?: (initialPrompt?: string) => void;
}

/**
 * The metrics row at the top of the recipe page: prep time, cook time and
 * servings as three equal figures, followed by the calorie headline and the
 * macro bar.
 */
export default function RecipeInfoSection({
  prepTime,
  cookTime,
  formatTimeValue,
  servings,
  nutritionalValues,
  sourceNutritionalValues,
  healthScore,
  healthScoreBreakdown,
  isAiEstimated,
  isVerified,
  showTotalNutrition,
  onToggleTotalNutrition,
  getNutritionDisplayValue,
  onOpenCopilot,
}: RecipeInfoSectionProps) {
  const { t } = useI18n();

  const iconClass = 'w-4 h-4 text-emerald-600 dark:text-emerald-400';
  const statLabel = 'text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight';
  const statValue = 'text-base font-bold text-gray-900 dark:text-white tabular-nums leading-tight';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-gray-100/70 dark:divide-gray-800/60">
        {/* Prep time */}
        <div className="flex flex-col items-center gap-1.5 py-4 px-2 text-center">
          <Clock className={iconClass} />
          <span className={statLabel}>{t('recipe.prep')}</span>
          <span className={statValue}>{formatTimeValue(prepTime)}</span>
        </div>

        {/* Cook time */}
        <div className="flex flex-col items-center gap-1.5 py-4 px-2 text-center">
          <Utensils className={iconClass} />
          <span className={statLabel}>{t('recipe.cook')}</span>
          <span className={statValue}>{formatTimeValue(cookTime)}</span>
        </div>

        {/* Servings */}
        <div className="flex flex-col items-center gap-1.5 py-4 px-2 text-center">
          <Users className={iconClass} />
          <span className={statLabel}>{t('recipe.serves')}</span>
          <span className={`${statValue} flex items-center gap-0.5`}>
            <span>{servings}</span>
          </span>
        </div>
      </div>

      {/* Calorie headline + macro distribution */}
      {nutritionalValues && (
        <div className="border-t border-gray-100/70 dark:border-gray-800/60">
          <RecipeNutrition
            variant="summary"
            nutritionalValues={nutritionalValues}
            sourceNutritionalValues={sourceNutritionalValues}
            healthScore={healthScore}
            healthScoreBreakdown={healthScoreBreakdown}
            isAiEstimated={isAiEstimated}
            isVerified={isVerified}
            showTotalNutrition={showTotalNutrition}
            onToggleTotalNutrition={onToggleTotalNutrition}
            getNutritionDisplayValue={getNutritionDisplayValue}
            onOpenCopilot={onOpenCopilot}
          />
        </div>
      )}
    </div>
  );
}
