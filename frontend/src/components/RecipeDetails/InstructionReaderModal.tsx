import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import InstructionStepsList from './InstructionStepsList';

export interface InstructionReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  checkedSteps: Record<number, boolean>;
  toggleStep: (step: number) => void;
  activeStepNum: number | null;
  completedStepsCount: number;
  totalStepsCount: number;
  progressPercent: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
}

export default function InstructionReaderModal({
  isOpen,
  onClose,
  recipe,
  checkedSteps,
  toggleStep,
  activeStepNum,
  completedStepsCount,
  totalStepsCount,
  progressPercent,
  formatAmount,
}: InstructionReaderModalProps) {
  const { t } = useI18n();
  useModalOverlay(isOpen, onClose);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasStarted = completedStepsCount > 0;
  const blockLabel = 'text-xs font-semibold text-gray-500 dark:text-gray-400';

  const handleStepToggleAfter = (stepNum: number) => {
    const instructions = recipe.instructions ?? [];
    const currentIdx = instructions.findIndex((s) => s.step === stepNum);
    const wasChecked = !!checkedSteps[stepNum];
    // If completing the final step, close reader modal so the CookedModal in RecipeDetails is visible
    if (!wasChecked && instructions.length > 0 && currentIdx === instructions.length - 1 && recipe.id) {
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('recipe.readerView')}
      className="fixed inset-0 z-[85] bg-[#fdfbf7] dark:bg-gray-950 flex flex-col pt-[calc(0.75rem_+_var(--safe-area-inset-top))] pb-[calc(1rem_+_var(--safe-area-inset-bottom))] px-3 sm:px-6 md:px-8 select-none animate-fade-in"
    >
      {/* Floating Zen Close Button (top-right) */}
      <div className="absolute top-[calc(0.75rem_+_var(--safe-area-inset-top))] right-3 sm:right-6 md:right-8 z-10">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => {
            hapticLight();
            onClose();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-gray-700 dark:text-gray-200 flex items-center justify-center border-none transition-all active:scale-95 cursor-pointer shadow-xs backdrop-blur-md"
          aria-label={t('recipe.closeReaderView')}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none max-w-3xl w-full mx-auto pt-2 pb-16 px-1">
        {/* Progress bar */}
        {totalStepsCount > 0 && (
          <div className="pt-2 pb-4 pr-12 flex flex-col gap-2">
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
            <div className="w-full bg-black/[0.07] dark:bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Required Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <div className="py-3 flex flex-col gap-2 animate-fade-in">
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

        {/* Instructions Timeline with large typography and auto-scroll */}
        <InstructionStepsList
          recipe={recipe}
          checkedSteps={checkedSteps}
          toggleStep={toggleStep}
          activeStepNum={activeStepNum}
          formatAmount={formatAmount}
          size="large"
          autoScrollActive={true}
          onStepToggleAfter={handleStepToggleAfter}
        />
      </div>
    </div>,
    document.body
  );
}
