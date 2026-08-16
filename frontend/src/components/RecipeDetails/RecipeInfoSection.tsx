import { Clock, Utensils, Users, ChevronRight } from 'lucide-react';
import RecipeNutrition from './RecipeNutrition';
import RecipeServingsStepper from './RecipeServingsStepper';
import { useI18n } from '../../context/I18nContext';

interface RecipeInfoSectionProps {
  prepTime: any;
  cookTime: any;
  formatTimeValue: (time: any) => string;
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
  onOpenAdjustServings?: () => void;
  /** Nutrition block is omitted entirely when the recipe carries no values. */
  nutritionalValues: any | null;
  isAiEstimated: boolean;
  isVerified?: boolean;
  showTotalNutrition: boolean;
  onToggleTotalNutrition: (isTotal: boolean) => void;
  getNutritionDisplayValue: (val: any, unit?: string, isTotal?: boolean, includeUnit?: boolean) => string;
}

/**
 * Embedded section holding prep/cook times, the servings stepper, the full
 * nutrition table and the AI disclaimer directly on the main recipe details page.
 */
export default function RecipeInfoSection({
  prepTime,
  cookTime,
  formatTimeValue,
  servings,
  onDecreaseServings,
  onIncreaseServings,
  onOpenAdjustServings,
  nutritionalValues,
  isAiEstimated,
  isVerified,
  showTotalNutrition,
  onToggleTotalNutrition,
  getNutritionDisplayValue,
}: RecipeInfoSectionProps) {
  const { t } = useI18n();

  // Shared look for the small emerald icon medallions in front of each figure.
  const iconBadge =
    'w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0';
  const iconClass = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const statLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';
  const statValue = 'text-sm font-bold text-gray-900 dark:text-white';

  return (
    <div className="flex flex-col gap-4">
      {/* Prep / cook times + nutrition + servings grouped into one cohesive overview card. */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="grid grid-cols-2">
          {/* Prep time */}
          <div className="flex items-center gap-3 py-4 px-4.5 sm:px-5">
            <div className={iconBadge}>
              <Clock className={iconClass} />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className={statLabel}>{t('recipe.prep')}</span>
              <span className={statValue}>{formatTimeValue(prepTime)}</span>
            </div>
          </div>
          {/* Cook time */}
          <div className="flex items-center gap-3 py-4 px-4.5 sm:px-5 border-l border-black/5 dark:border-white/5">
            <div className={iconBadge}>
              <Utensils className={iconClass} />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className={statLabel}>{t('recipe.cook')}</span>
              <span className={statValue}>{formatTimeValue(cookTime)}</span>
            </div>
          </div>
        </div>

        {/* Nutrition section (between prep/cook time and servings) */}
        {nutritionalValues && (
          <div className="border-t border-black/5 dark:border-white/5">
            <RecipeNutrition
              nutritionalValues={nutritionalValues}
              isAiEstimated={isAiEstimated}
              isVerified={isVerified}
              showTotalNutrition={showTotalNutrition}
              onToggleTotalNutrition={onToggleTotalNutrition}
              getNutritionDisplayValue={getNutritionDisplayValue}
            />
          </div>
        )}

        {/* Servings row */}
        <div
          onClick={onOpenAdjustServings}
          className={`flex items-center justify-between gap-3 px-4.5 sm:px-5 py-3.5 border-t border-black/5 dark:border-white/5 transition-colors ${
            onOpenAdjustServings ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' : ''
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={iconBadge}>
              <Users className={iconClass} />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('recipe.serves')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <RecipeServingsStepper
              servings={servings}
              onDecreaseServings={onDecreaseServings}
              onIncreaseServings={onIncreaseServings}
            />
            {onOpenAdjustServings && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 opacity-60 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
