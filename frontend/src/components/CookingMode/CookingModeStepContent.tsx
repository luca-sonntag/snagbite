import React from 'react';
import type { Recipe, InstructionStep } from '../../types';
import type { StepIngredientItem } from './types';
import type { StepSlideDirection } from '../../hooks/useCookingMode';
import { getStepSlideClass } from '../../utils/animations';
import { Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import RecipeInstructionText from '../RecipeInstructionText';
import CookingModeIngredients from './CookingModeIngredients';
import CachedImage from '../CachedImage';

interface CookingModeStepContentProps {
  recipe: Recipe;
  currentStep?: InstructionStep;
  stepIngredients: StepIngredientItem[];
  formatAmount: (amount: number, unit?: string) => string;
  cookingStepIndex: number;
  totalSteps: number;
  slideDirection?: StepSlideDirection;
}

export const CookingModeStepContent: React.FC<CookingModeStepContentProps> = ({
  recipe,
  currentStep,
  stepIngredients,
  formatAmount,
  cookingStepIndex,
  totalSteps,
  slideDirection = 'forward',
}) => {
  const { t } = useI18n();

  if (!currentStep) return null;

  const hasCover = Boolean(recipe.imageUrl || recipe.emoji);
  const progressPercent = totalSteps > 0 ? ((cookingStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain scrollbar-none flex flex-col items-center py-1 sm:py-2 px-0.5 sm:px-2">
      {/* Stable Outer Container - No Jumping / Snapping */}
      <div className="w-full max-w-3xl flex flex-col shrink-0">
        {/* 100% Stable Cover Photo - Locked in position, never jumps */}
        {hasCover && (
          <div className="w-full h-40 sm:h-52 rounded-[28px] overflow-hidden relative shadow-xs shrink-0 bg-gray-100 dark:bg-gray-800/80 mb-3">
            <CachedImage
              src={recipe.imageUrl}
              emoji={recipe.emoji}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Stable Step & Progress Bar */}
        <div className="px-2 pt-1 pb-1 flex items-center gap-3 w-full">
          {/* Step Badge */}
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-sm shadow-xs select-none shrink-0 transition-all duration-200">
            {currentStep.step}
          </div>

          {/* Smooth Progress Bar */}
          {totalSteps > 0 && (
            <div className="flex-1 bg-black/[0.06] dark:bg-white/[0.08] h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Step Counter */}
          {totalSteps > 0 && (
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums shrink-0 select-none">
              {currentStep.step} / {totalSteps}
            </span>
          )}
        </div>

        {/* Step Dynamic Content with Directional Slide Transition */}
        <div
          key={cookingStepIndex}
          className={getStepSlideClass(slideDirection)}
        >
          {/* Step Description - Warm, readable editorial typography with generous line-spacing and breathing room */}
          <div className="px-2.5 py-3.5 sm:px-4 sm:py-4.5 flex flex-col text-left">
            <div className="text-[22px] sm:text-[26px] md:text-[28px] font-semibold text-gray-800 dark:text-gray-100 tracking-normal leading-[1.8] sm:leading-[1.85] md:leading-[1.9]">
              <RecipeInstructionText
                variant="focused"
                text={currentStep.description}
                recipe={recipe}
                formatAmount={formatAmount}
                stepNum={currentStep.step}
              />
            </div>
          </div>

          {/* Integrated Contextual Step Ingredients */}
          <CookingModeIngredients
            ingredients={stepIngredients}
            formatAmount={formatAmount}
          />

          {/* Parallel Preparation Chef Hint (Wartezeit-Tipp) - Harmonious Clean Flat styling under ingredients */}
          {currentStep.parallelPrepHint && (
            <div className="mx-2 mt-4 mb-2 sm:mx-4 p-3.5 sm:p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] text-gray-800 dark:text-gray-200 flex items-start gap-3 text-left transition-all">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 select-none">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {t('recipe.parallelPrepHint')}
                </span>
                <div className="text-sm sm:text-base font-medium leading-relaxed">
                  <RecipeInstructionText
                    text={currentStep.parallelPrepHint}
                    recipe={recipe}
                    formatAmount={formatAmount}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookingModeStepContent;
