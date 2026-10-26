import { useEffect, useRef } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { Recipe } from '../../types';
import RecipeInstructionText from '../RecipeInstructionText';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import InstructionSectionDivider from './InstructionSectionDivider';
import { sanitizeSectionName } from '../../utils/recipeComponents';

export interface InstructionStepsListProps {
  recipe: Recipe;
  checkedSteps: Record<number, boolean>;
  toggleStep: (step: number) => void;
  activeStepNum: number | null;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  size?: 'default' | 'large';
  autoScrollActive?: boolean;
  onStepToggleAfter?: (stepNum: number) => void;
}

export default function InstructionStepsList({
  recipe,
  checkedSteps,
  toggleStep,
  activeStepNum,
  formatAmount,
  size = 'default',
  autoScrollActive = false,
  onStepToggleAfter,
}: InstructionStepsListProps) {
  const { t } = useI18n();
  const steps = recipe.instructions ?? [];
  const isLarge = size === 'large';

  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Auto-scroll to active step if enabled
  useEffect(() => {
    if (!autoScrollActive || activeStepNum === null) return;
    const el = stepRefs.current.get(activeStepNum);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoScrollActive, activeStepNum]);

  const railColumn = isLarge
    ? 'w-6 sm:w-6.5 flex-shrink-0 flex flex-col items-center'
    : 'w-9 flex-shrink-0 flex flex-col items-center';
  const railBase = 'w-px shrink-0 transition-colors duration-300';
  const railTone = (done: boolean) => (done ? 'bg-emerald-500/45' : 'bg-black/[0.08] dark:bg-white/10');

  return (
    <div className="flex flex-col">
      {/* Steps timeline */}
      {steps.map((step, idx) => {
        const isChecked = !!checkedSteps[step.step];
        const isActive = step.step === activeStepNum;
        const isFirst = idx === 0;
        const isLast = idx === steps.length - 1;
        const currentSection = sanitizeSectionName(step.section);
        const prevSection = idx > 0 ? sanitizeSectionName(steps[idx - 1].section) : undefined;
        const showSectionDivider = Boolean(currentSection && currentSection !== prevSection);
        const prevChecked = !isFirst && !showSectionDivider && !!checkedSteps[steps[idx - 1].step];

        return (
          <div
            key={step.step}
            ref={(node) => {
              if (node) {
                stepRefs.current.set(step.step, node);
              } else {
                stepRefs.current.delete(step.step);
              }
            }}
            className="flex flex-col scroll-mt-24"
          >
            {showSectionDivider && currentSection && (
              <InstructionSectionDivider sectionName={currentSection} />
            )}
            <div
              onClick={() => {
                hapticLight();
                toggleStep(step.step);
                onStepToggleAfter?.(step.step);
              }}
              aria-pressed={isChecked}
              className={`flex items-stretch ${
                isLarge ? 'gap-2.5 sm:gap-3 px-1' : 'gap-3.5 px-1.5'
              } rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                isActive
                  ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]'
                  : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
              }`}
            >
              {/* Marker column */}
              <div className={railColumn}>
                <div
                  className={`${railBase} ${isLarge ? 'h-4' : 'h-4'} ${
                    isFirst || showSectionDivider ? 'invisible' : railTone(prevChecked)
                  }`}
                />

                <div
                  className={`${
                    isLarge ? 'w-6 h-6 text-xs' : 'w-7.5 h-7.5 text-xs'
                  } rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isChecked
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isActive
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs ring-3 ring-emerald-500/20 dark:ring-emerald-400/20'
                        : 'bg-black/[0.05] dark:bg-white/[0.07] text-gray-500 dark:text-gray-400 font-semibold'
                  }`}
                >
                  {isChecked ? (
                    <Check className={isLarge ? 'w-3.5 h-3.5 stroke-[2.5]' : 'w-4 h-4 stroke-[2.5]'} />
                  ) : (
                    <span className="font-bold tabular-nums">{step.step}</span>
                  )}
                </div>

                <div className={`${railBase} flex-1 ${isLast ? 'invisible' : railTone(isChecked)}`} />
              </div>

              {/* Step content */}
              <div className={`flex-1 flex flex-col gap-1 min-w-0 ${isLarge ? 'py-4 sm:py-5' : 'py-4'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  {isActive && (
                    <span
                      className={`${
                        isLarge ? 'text-xs sm:text-sm' : 'text-xs'
                      } font-bold text-emerald-600 dark:text-emerald-400`}
                    >
                      {t('recipe.currentStep')}
                    </span>
                  )}
                  {currentSection && !isActive && (
                    <span
                      className={`${
                        isLarge ? 'text-xs sm:text-sm' : 'text-[11px]'
                      } font-semibold text-gray-400 dark:text-gray-500`}
                    >
                      {currentSection}
                    </span>
                  )}
                </div>

                <span
                  className={`block select-none transition-colors ${
                    isLarge ? 'text-lg sm:text-xl leading-[1.75]' : 'text-sm leading-relaxed'
                  } ${
                    isChecked
                      ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <RecipeInstructionText
                    text={step.description}
                    recipe={recipe}
                    formatAmount={formatAmount}
                    stepNum={step.step}
                  />
                </span>

                {step.parallelPrepHint && !isChecked && (
                  <div
                    className={`mt-3 pl-3 py-1.5 border-l-2 border-emerald-500/50 text-gray-700 dark:text-gray-300 flex items-start gap-2.5 ${
                      isLarge ? 'text-sm sm:text-base' : 'text-xs'
                    } font-medium leading-relaxed bg-black/[0.015] dark:bg-white/[0.02] rounded-r-xl`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <RecipeInstructionText
                        text={step.parallelPrepHint}
                        recipe={recipe}
                        formatAmount={formatAmount}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Recipe Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <h3 className={`${isLarge ? 'text-lg' : 'text-base'} font-bold text-gray-900 dark:text-white`}>
              {t('recipe.tipsTitle')}
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
              {recipe.tips.length}
            </span>
          </div>

          <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {recipe.tips.map((tip, idx) => (
              <div key={idx} className="py-3 px-0.5 flex items-start gap-3 transition-all">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-bold tabular-nums mt-0.5">
                  {idx + 1}
                </span>
                <div
                  className={`${
                    isLarge ? 'text-base sm:text-lg leading-relaxed' : 'text-xs sm:text-sm'
                  } text-gray-700 dark:text-gray-300 leading-relaxed min-w-0 flex-1`}
                >
                  <RecipeInstructionText text={tip} recipe={recipe} formatAmount={formatAmount} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
