import { useState } from 'react';
import { Button } from '@heroui/react';
import { Play, BookOpen } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import ProBadge from '../ProBadge';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import InstructionStepsList from './InstructionStepsList';
import InstructionReaderModal from './InstructionReaderModal';

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
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const steps = recipe.instructions ?? [];
  const hasStarted = completedStepsCount > 0;
  const blockLabel = 'text-xs font-medium text-gray-500 dark:text-gray-400';

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Main Open-Canvas Group (Progress + Equipment + Steps) */}
      <div className="flex flex-col border-none divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        {/* 1. Cooking Progress, Start Cooking Button & Reader View Button */}
        {(isExtracting || totalStepsCount > 0) && (
          <div className="px-0.5 py-3 flex flex-col gap-4">
            {!isExtracting && totalStepsCount > 0 ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className={blockLabel}>{t('recipe.cookingProgress')}</span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        hasStarted
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {t('recipe.progressSteps', {
                        completed: completedStepsCount,
                        total: totalStepsCount,
                        percent: Math.round(progressPercent),
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

                <div className="flex items-center gap-2.5">
                  <Button
                    id="tour-recipe-cook-btn"
                    className="relative flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 min-h-[48px] px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-none"
                    onPress={() => {
                      hapticMedium();
                      onStartCooking();
                    }}
                  >
                    <Play className="w-4.5 h-4.5 fill-white ml-0.5" />
                    <span>{t('recipe.startCooking')}</span>
                    {!isPremium && <ProBadge variant="corner" />}
                  </Button>

                  <Button
                    isIconOnly
                    variant="tertiary"
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all shrink-0 cursor-pointer border-none flex items-center justify-center"
                    onPress={() => {
                      hapticLight();
                      setIsReaderOpen(true);
                    }}
                    aria-label={t('recipe.readerView')}
                  >
                    <BookOpen className="w-5 h-5" />
                  </Button>
                </div>
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
            <span className={blockLabel}>{t('recipe.requiredEquipment')}</span>
            <ul className="flex flex-wrap gap-1.5">
              {recipe.equipment.map((item, idx) => (
                <li key={idx} className="recipe-step-pill text-sm select-none">
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
            <InstructionStepsList
              recipe={recipe}
              checkedSteps={checkedSteps}
              toggleStep={toggleStep}
              activeStepNum={activeStepNum}
              formatAmount={formatAmount}
              size="default"
            />
          </div>
        ) : null}
      </div>

      {/* Fullscreen Reader View Modal */}
      <InstructionReaderModal
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        recipe={recipe}
        checkedSteps={checkedSteps}
        toggleStep={toggleStep}
        activeStepNum={activeStepNum}
        completedStepsCount={completedStepsCount}
        totalStepsCount={totalStepsCount}
        progressPercent={progressPercent}
        formatAmount={formatAmount}
      />
    </div>
  );
}
