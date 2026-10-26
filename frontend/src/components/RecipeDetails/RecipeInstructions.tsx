import { Button } from '@heroui/react';
import { Play, Check, Sparkles } from 'lucide-react';
import type { Recipe } from '../../types';
import RecipeInstructionText from '../RecipeInstructionText';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import ProBadge from '../ProBadge';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import InstructionSectionDivider from './InstructionSectionDivider';
import { sanitizeSectionName } from '../../utils/recipeComponents';

interface RecipeInstructionsProps {
  recipe: Recipe;
  checkedSteps: Record<number, boolean>;
  toggleStep: (step: number) => void;
  activeStepNum: number | null;
  completedStepsCount: number;
  totalStepsCount: number;
  progressPercent: number;
  onStartCooking: () => void;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  isExtracting?: boolean;
}

export default function RecipeInstructions({
  recipe,
  checkedSteps,
  toggleStep,
  activeStepNum,
  completedStepsCount,
  totalStepsCount,
  progressPercent,
  onStartCooking,
  formatAmount,
  isExtracting = false,
}: RecipeInstructionsProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();

  const steps = recipe.instructions ?? [];
  const hasStarted = completedStepsCount > 0;

  // Rail column styling for steps timeline
  const railColumn = 'w-9 flex-shrink-0 flex flex-col items-center';
  const blockLabel =
    'text-xs font-medium text-gray-500 dark:text-gray-400';

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Main Open-Canvas Group (Progress + Equipment + Steps) */}
      <div className="flex flex-col border-none divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        {/* 1. Cooking Progress & Start Button */}
        {(isExtracting || totalStepsCount > 0) && (
          <div className="px-0.5 py-3 flex flex-col gap-4">
            {!isExtracting && totalStepsCount > 0 ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className={blockLabel}>{t('recipe.cookingProgress')}</span>
                    <span className={`text-xs font-bold tabular-nums ${
                      hasStarted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {t('recipe.progressSteps', {
                        completed: completedStepsCount,
                        total: totalStepsCount,
                        percent: Math.round(progressPercent)
                      })}
                    </span>
                  </div>
                  <div className="w-full bg-black/[0.07] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <Button
                  id="tour-recipe-cook-btn"
                  className="relative w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 min-h-[48px] px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-none"
                  onPress={() => {
                    hapticMedium();
                    onStartCooking();
                  }}
                >
                  <Play className="w-4.5 h-4.5 fill-white ml-0.5" />
                  <span>{t('recipe.startCooking')}</span>
                  {!isPremium && <ProBadge variant="corner" />}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <div className="h-3 w-28 bg-gray-200/90 dark:bg-gray-800/90 rounded-md" />
                    <div className="h-3 w-16 bg-gray-200/90 dark:bg-gray-800/90 rounded-md" />
                  </div>
                  <div className="w-full bg-gray-200/90 dark:bg-gray-800/90 h-1.5 rounded-full" />
                </div>
                <div className="w-full h-12 rounded-2xl bg-gray-200/80 dark:bg-gray-800/80 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <div className="h-4 w-28 rounded-md bg-gray-300 dark:bg-gray-700" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Required Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div className="px-0.5 py-4 flex flex-col gap-2 animate-fade-in">
            <span className={blockLabel}>
              {t('recipe.requiredEquipment')}
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {recipe.equipment.map((item, idx) => (
                <li
                  key={idx}
                  className="recipe-step-pill text-sm select-none"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Steps as a timeline */}
        {steps.length === 0 && isExtracting ? (
          <div className="py-4 px-0.5 flex flex-col gap-3">
            {[1, 2, 3].map((step) => (
              <div
                key={`step-skel-${step}`}
                className="p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl flex gap-3 animate-pulse"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : steps.length > 0 ? (
          <div className="animate-fade-in">
            {steps.map((step, idx) => {
              const isChecked = !!checkedSteps[step.step];
              const isActive = step.step === activeStepNum;
              const isFirst = idx === 0;
              const isLast = idx === steps.length - 1;
              const currentSection = sanitizeSectionName(step.section);
              const prevSection = idx > 0 ? sanitizeSectionName(steps[idx - 1].section) : undefined;
              const showSectionDivider = Boolean(currentSection && currentSection !== prevSection);
              const prevChecked = !isFirst && !showSectionDivider && !!checkedSteps[steps[idx - 1].step];

              const railBase = 'w-px shrink-0 transition-colors duration-300';
              const railTone = (done: boolean) =>
                done ? 'bg-emerald-500/45' : 'bg-black/[0.08] dark:bg-white/10';

              return (
                <div key={step.step} className="flex flex-col">
                  {showSectionDivider && currentSection && (
                    <InstructionSectionDivider sectionName={currentSection} />
                  )}
                  <div
                    onClick={() => {
                      hapticLight();
                      toggleStep(step.step);
                    }}
                    aria-pressed={isChecked}
                    className={`flex items-stretch gap-3.5 px-1 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                      isActive
                        ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Marker column: spacer, marker, connector */}
                    <div className={railColumn}>
                      <div className={`${railBase} h-4 ${isFirst || showSectionDivider ? 'invisible' : railTone(prevChecked)}`} />

                      <div
                        className={`w-7.5 h-7.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isChecked
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : isActive
                              ? 'bg-emerald-500 text-white font-extrabold shadow-sm ring-4 ring-emerald-500/20 dark:ring-emerald-400/20'
                              : 'bg-black/[0.05] dark:bg-white/[0.07] text-gray-500 dark:text-gray-400 font-semibold'
                        }`}
                      >
                        {isChecked
                          ? <Check className="w-4 h-4 stroke-[2.5]" />
                          : <span className="text-xs font-bold tabular-nums">{step.step}</span>
                        }
                      </div>

                      <div className={`${railBase} flex-1 ${isLast ? 'invisible' : railTone(isChecked)}`} />
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-w-0 py-4">
                      {/* Step header / component & currentStep indicator */}
                      <div className="flex items-center gap-2 mb-0.5">
                        {isActive && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {t('recipe.currentStep')}
                          </span>
                        )}
                        {currentSection && !isActive && (
                          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                            {currentSection}
                          </span>
                        )}
                      </div>
                    {/* Finished steps are struck through but keep their contrast —
                        dimming the row as well made them genuinely hard to reread. */}
                    <span
                      className={`text-sm leading-relaxed block select-none transition-colors ${
                        isChecked
                          ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <RecipeInstructionText text={step.description} recipe={recipe} formatAmount={formatAmount} stepNum={step.step} />
                    </span>

                    {step.parallelPrepHint && !isChecked && (
                      <div className="mt-2.5 pl-3 py-1 border-l-2 border-emerald-500/50 text-gray-700 dark:text-gray-300 flex items-start gap-2 text-xs font-medium leading-relaxed">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <RecipeInstructionText text={step.parallelPrepHint} recipe={recipe} formatAmount={formatAmount} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        ) : null}
      </div>

      {/* Tips Section */}
      {recipe.tips && recipe.tips.length > 0 && (
        <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] animate-fade-in">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('recipe.tipsTitle')}
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
              {recipe.tips.length}
            </span>
          </div>

          {/* Open Canvas Tip Items */}
          <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {recipe.tips.map((tip, idx) => (
              <div
                key={idx}
                className="py-3 px-0.5 flex items-start gap-3 transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-xs font-bold tabular-nums mt-0.5">
                  {idx + 1}
                </span>
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed min-w-0 flex-1">
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
