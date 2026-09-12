import { useMemo, useEffect, useState, useCallback } from 'react';
import type { CookingModeProps, CookingModeTimerSheetState, StepIngredientItem } from './types';
import { useCookingMode } from '../../hooks/useCookingMode';
import { extractInlineIngredientTags, textMentionsTerm } from '../../utils/ingredientMatch';
import { extractFirstDuration } from './timeUtils';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useModalOverlay } from '../../context/OverlayStackContext';

import CookingModeHeader from './CookingModeHeader';
import CookingModeTimers from './CookingModeTimers';
import CookingModeStepContent from './CookingModeStepContent';
import CookingModeBottomNav from './CookingModeBottomNav';

import TimerConfirmSheet from '../TimerConfirmSheet';
import RecipeCopilot from '../RecipeDetails/RecipeCopilot';
import PremiumModal from '../PremiumModal';
import CookedModal from '../CookedModal';

export default function CookingMode({
  recipe,
  onClose,
  checkedSteps,
  toggleStep,
  formatAmount,
  initialStepOverride,
  onRemixSuccess,
  onReplaceCurrent,
}: CookingModeProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();
  useModalOverlay(true, onClose);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isCookedModalOpen, setIsCookedModalOpen] = useState(false);
  const [timerSheet, setTimerSheet] = useState<CookingModeTimerSheetState>({
    isOpen: false,
    seconds: 0,
    label: '',
  });

  // Calculate initial step index based on first uncompleted step or override
  const initialStepIndex = useMemo(() => {
    if (initialStepOverride !== undefined) {
      return initialStepOverride;
    }
    if (recipe.instructions) {
      const firstUncompleted = recipe.instructions.findIndex((s) => !checkedSteps[s.step]);
      return firstUncompleted !== -1 ? firstUncompleted : 0;
    }
    return 0;
  }, [recipe.instructions, checkedSteps, initialStepOverride]);

  const {
    cookingStepIndex,
    slideDirection,
    setCookingStepIndex,
    handleNextCookingStep,
    handlePrevCookingStep,
    handleTouchStart,
    handleTouchEnd,
  } = useCookingMode({
    instructionsCount: recipe.instructions?.length || 0,
    initialStepIndex,
    onClose,
  });

  // Jump to step when clicking on a timer notification event
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId: string; stepNum: number }>;
      if (
        customEvent.detail &&
        customEvent.detail.stepNum !== undefined &&
        (customEvent.detail.recipeId === recipe.id || customEvent.detail.recipeId === recipe.title)
      ) {
        setCookingStepIndex(customEvent.detail.stepNum - 1);
      }
    };
    window.addEventListener('app:navigate-to-timer-step', handleNavigate);
    return () => window.removeEventListener('app:navigate-to-timer-step', handleNavigate);
  }, [recipe.id, recipe.title, setCookingStepIndex]);

  // Flat list of ingredients
  const allIngredients: StepIngredientItem[] = useMemo(() => {
    return recipe.ingredients
      ? recipe.ingredients.flatMap((g) =>
          g.items.map((item) => ({
            ...item,
            category: item.category || g.name,
          }))
        )
      : [];
  }, [recipe.ingredients]);

  // Find ingredients mentioned in step description
  const getIngredientsForStep = useCallback(
    (description: string): StepIngredientItem[] => {
      if (!description) return [];
      const mentioned: StepIngredientItem[] = [];
      const seen = new Set<string>();

      const inlineTags = extractInlineIngredientTags(description);

      if (inlineTags.length > 0) {
        inlineTags.forEach((tag) => {
          const targetBase = tag.baseName.toLowerCase();
          const match = allIngredients.find(
            (ing) =>
              ing.baseName?.toLowerCase() === targetBase ||
              ing.name.toLowerCase() === targetBase
          );
          if (match) {
            const key = match.name.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              mentioned.push(match);
            }
          }
        });
        return mentioned;
      }

      allIngredients.forEach((ing) => {
        const nameHit = textMentionsTerm(ing.name, description);
        const baseHit =
          !nameHit &&
          (ing.baseName?.trim().length ?? 0) >= 4 &&
          textMentionsTerm(ing.baseName, description);

        if (nameHit || baseHit) {
          const key = (ing.name || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            mentioned.push(ing);
          }
        }
      });
      return mentioned;
    },
    [allIngredients]
  );

  const instructions = recipe.instructions || [];
  const totalSteps = instructions.length;
  const currentStep = instructions[cookingStepIndex];
  const stepIngredients = currentStep ? getIngredientsForStep(currentStep.description) : [];

  const handleOpenTimer = useCallback(() => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
    } else {
      const stepDuration = currentStep ? extractFirstDuration(currentStep.description) : 0;
      const durationToUse = stepDuration > 0 ? stepDuration : 300;
      setTimerSheet({
        isOpen: true,
        seconds: durationToUse,
        label: currentStep ? `${t('recipe.step')} ${currentStep.step}` : 'Timer',
      });
    }
  }, [isPremium, currentStep, t]);

  const handleOpenCopilot = useCallback(() => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
    } else {
      setIsCopilotOpen(true);
    }
  }, [isPremium]);

  const handleNextStep = useCallback(() => {
    if (currentStep && !checkedSteps[currentStep.step]) {
      toggleStep(currentStep.step);
    }
    handleNextCookingStep();
  }, [currentStep, checkedSteps, toggleStep, handleNextCookingStep]);

  const handleFinishCooking = useCallback(() => {
    if (currentStep && !checkedSteps[currentStep.step]) {
      toggleStep(currentStep.step);
    }
    if (recipe.id) {
      setIsCookedModalOpen(true);
    } else {
      onClose();
    }
  }, [currentStep, checkedSteps, toggleStep, recipe.id, onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] bg-white dark:bg-gray-950 flex flex-col justify-between p-3 sm:p-6 md:p-8 pt-[calc(0.75rem_+_var(--safe-area-inset-top))] pb-[calc(0.75rem_+_var(--safe-area-inset-bottom))] select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar with Title, Step Progress, Actions & Progress Line */}
      <CookingModeHeader
        currentStepIndex={cookingStepIndex}
        totalSteps={totalSteps}
        onClose={onClose}
        onOpenTimer={handleOpenTimer}
        onOpenCopilot={handleOpenCopilot}
        hasCoverImage={Boolean(recipe.imageUrl || recipe.emoji)}
      />

      {/* Active Timers Banner Section */}
      <CookingModeTimers />

      {/* Central Step Content Area */}
      <CookingModeStepContent
        recipe={recipe}
        currentStep={currentStep}
        stepIngredients={stepIngredients}
        formatAmount={formatAmount}
        cookingStepIndex={cookingStepIndex}
        totalSteps={totalSteps}
        slideDirection={slideDirection}
      />

      {/* Bottom Navigation Controls */}
      <CookingModeBottomNav
        isFirstStep={cookingStepIndex === 0}
        isLastStep={cookingStepIndex === totalSteps - 1}
        onPrev={handlePrevCookingStep}
        onNext={handleNextStep}
        onFinish={handleFinishCooking}
      />

      {/* Sheets & Overlays */}
      {timerSheet.isOpen && (
        <TimerConfirmSheet
          isOpen={timerSheet.isOpen}
          durationSeconds={timerSheet.seconds}
          label={timerSheet.label}
          onClose={() => setTimerSheet((prev) => ({ ...prev, isOpen: false }))}
          recipeId={recipe.id}
          stepNum={currentStep?.step}
        />
      )}

      {recipe.id && isCopilotOpen && (
        <RecipeCopilot
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          recipe={recipe}
          onRemixSuccess={onRemixSuccess || (() => {})}
          onReplaceCurrent={onReplaceCurrent || (() => {})}
        />
      )}

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />

      {recipe.id && isCookedModalOpen && (
        <CookedModal
          isOpen={isCookedModalOpen}
          onClose={() => {
            setIsCookedModalOpen(false);
            onClose();
          }}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          viaCookingMode={true}
        />
      )}
    </div>
  );
}
