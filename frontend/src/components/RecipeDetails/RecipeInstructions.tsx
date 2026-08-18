import { Button } from '@heroui/react';
import { Play, Check, ChefHat, Utensils, ListChecks } from 'lucide-react';
import type { Recipe } from '../../types';
import RecipeInstructionText from '../RecipeInstructionText';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import PremiumCrownBadge from '../PremiumCrownBadge';

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
  formatAmount
}: RecipeInstructionsProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();

  const steps = recipe.instructions ?? [];
  const hasStarted = completedStepsCount > 0;

  // One shared left column across progress, equipment and steps, so the three
  // blocks read down a single edge instead of each starting somewhere else.
  const railColumn = 'w-9 flex-shrink-0 flex flex-col items-center';
  const medallion =
    'w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0';
  const medallionIcon = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const blockLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Section Header (OUTSIDE card) */}
      <div className="flex items-center gap-3">
        <div className={medallion}>
          <ChefHat className={medallionIcon} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('recipe.stepByStep')}</h3>
        {totalStepsCount > 0 && (
          <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
            {totalStepsCount}
          </span>
        )}
      </div>

      {/* Main Cohesive Card Group (Progress + Equipment + Steps) */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* 1. Cooking Progress & Start Button */}
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className={medallion}>
              <ListChecks className={medallionIcon} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-3.5">
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
                className="relative bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4.5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all flex-shrink-0 self-start"
                onPress={onStartCooking}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{t('recipe.startCooking')}</span>
                {!isPremium && <PremiumCrownBadge />}
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Required Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div className="px-5 py-4.5 sm:px-6 border-t border-black/5 dark:border-white/5">
            <div className="flex items-start gap-4">
              <div className={medallion}>
                <Utensils className={medallionIcon} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <span className={`${blockLabel} mb-2 block`}>
                  {t('recipe.requiredEquipment')}
                </span>
                <ul className="flex flex-wrap gap-1.5">
                  {recipe.equipment.map((item, idx) => (
                    <li
                      key={idx}
                      className="py-1 px-3 bg-black/[0.04] dark:bg-white/[0.06] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 select-none"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 3. Steps as a timeline — the rail turns emerald behind each finished
            step, so progress is legible from the left edge alone. */}
        {steps.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5">
            {steps.map((step, idx) => {
              const isChecked = !!checkedSteps[step.step];
              const isActive = step.step === activeStepNum;
              const isFirst = idx === 0;
              const isLast = idx === steps.length - 1;
              const prevChecked = !isFirst && !!checkedSteps[steps[idx - 1].step];

              const railBase = 'w-px shrink-0 transition-colors duration-300';
              const railTone = (done: boolean) =>
                done ? 'bg-emerald-500/45' : 'bg-black/[0.08] dark:bg-white/10';

              return (
                <div
                  key={step.step}
                  onClick={() => toggleStep(step.step)}
                  aria-pressed={isChecked}
                  className={`flex items-stretch gap-4 px-5 sm:px-6 cursor-pointer transition-colors duration-200 ${
                    isActive
                      ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]'
                      : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Marker column: spacer, marker, connector — no vertical
                      padding, so the rail meets the next step without a break. */}
                  <div className={railColumn}>
                    <div className={`${railBase} h-4 ${isFirst ? 'invisible' : railTone(prevChecked)}`} />

                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isActive
                            ? 'border-2 border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-black/15 dark:border-white/15 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {isChecked
                        ? <Check className="w-3.5 h-3.5" />
                        : <span className="text-[11px] font-bold tabular-nums">{step.step}</span>
                      }
                    </div>

                    <div className={`${railBase} flex-1 ${isLast ? 'invisible' : railTone(isChecked)}`} />
                  </div>

                  <div className="flex-1 flex flex-col gap-1 min-w-0 py-4">
                    {/* Ring, tint and label are already three signals; the
                        pulsing sparkle made the section restless. */}
                    {isActive && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        {t('recipe.currentStep')}
                      </span>
                    )}
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips Card */}
      {recipe.tips && recipe.tips.length > 0 && (
        <div className="glass-panel p-4.5 sm:p-5 rounded-2xl border border-emerald-500/10">
          <h3 className="text-xs font-bold text-emerald-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <ChefHat className="w-4 h-4" />
            <span>{t('recipe.tipsTitle')}</span>
          </h3>
          <ul className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
            {recipe.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-normal">
                <span className="bg-emerald-500/10 text-emerald-500 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border border-emerald-500/20">{idx + 1}</span>
                <span>
                  <RecipeInstructionText text={tip} recipe={recipe} formatAmount={formatAmount} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
