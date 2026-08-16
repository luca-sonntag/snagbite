import { Button } from '@heroui/react';
import { Play, Sparkles, Check, ChefHat, Utensils, ListChecks } from 'lucide-react';
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

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Section Header (OUTSIDE card) */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
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
        {/* 1. Cooking Progress Bar & Start Button */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0">
              <ListChecks className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-5">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">{t('recipe.cookingProgress')}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {t('recipe.progressSteps', { completed: completedStepsCount, total: totalStepsCount, percent: Math.round(progressPercent) })}
                    </span>
                  </div>
                  <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <Button
                  className="relative bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4.5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all flex-shrink-0 self-start sm:self-center mt-1 sm:mt-0"
                  onPress={onStartCooking}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t('recipe.startCooking')}</span>
                  {!isPremium && <PremiumCrownBadge />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Required Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div className="px-5 py-4.5 sm:px-6 sm:py-5.5 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0">
                <Utensils className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-2 block">
                  {t('recipe.requiredEquipment')}
                </span>
                <ul className="flex flex-wrap gap-2">
                  {recipe.equipment.map((item, idx) => (
                    <li
                      key={idx}
                      className="py-1 px-3.5 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 select-none"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 3. Steps List with Dividers */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
            {recipe.instructions.map((step) => {
              const isChecked = !!checkedSteps[step.step];
              const isActive = step.step === activeStepNum;

              return (
                <div
                  key={step.step}
                  onClick={() => toggleStep(step.step)}
                  className={`flex items-start gap-4 sm:gap-4.5 px-5 py-5.5 sm:px-6 sm:py-6 cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                      : isChecked
                        ? 'bg-black/[0.01] dark:bg-white/[0.01] opacity-65'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-black/20 dark:border-white/20'
                    }`}>
                    {isChecked ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{step.step}</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    {isActive && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        {t('recipe.currentStep')}
                      </span>
                    )}
                    <span className={`text-sm leading-relaxed block select-none transition-all ${isChecked ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'
                      }`}>
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
