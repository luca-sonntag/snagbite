import { useMemo, useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Bell,
  Timer,
  MessageCircle
} from 'lucide-react';
import type { Recipe, Ingredient } from '../types';
import { useCookingMode } from '../hooks/useCookingMode';
import { extractInlineIngredientTags, textMentionsTerm, stripInlineIngredientTags } from '../utils/ingredientMatch';
import RecipeInstructionText from './RecipeInstructionText';
import { useI18n } from '../context/I18nContext';
import { useTimerManager } from '../hooks/useTimerManager';
import { useAuth } from '../context/AuthContext';
import TimerConfirmSheet from './TimerConfirmSheet';
import RecipeCopilot from './RecipeDetails/RecipeCopilot';
import PremiumModal from './PremiumModal';
import CookedModal from './CookedModal';

// ─── Time parsing helper ──────────────────────────────────────────────────────
function parseTimeToSeconds(timeStr: string): number {
  const s = timeStr.toLowerCase().trim();
  const numMatch = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!numMatch) return 0;
  const value = parseFloat(numMatch[1].replace(',', '.'));
  const isHour = /stunden?|hours?|heures?|horas?|ore|uur|saat|std\.?|hrs?\.?|h\.?|godz\.?|godzin|godziny\b/.test(s);
  const isMinute = /minuten?|minutes?|minutos?|minuti|minuts?|minuty|minute?|minuta|minuty|dakika|min\.?|mins?\.?|dk\.?\b/.test(s);
  const isSecond = /sekunden?|seconds?|segundos?|secondes?|secondi|sekunda|sekundy|sekund|sekunde|saniye|sek\.?|secs?\.?|sec\.?|seg\.?|sn\.?\b/.test(s);
  if (isHour) return Math.round(value * 3600);
  if (isMinute) return Math.round(value * 60);
  if (isSecond) return Math.round(value);
  return Math.round(value * 60);
}

function extractFirstDuration(text: string): number {
  if (!text) return 0;
  const rangeSeparator = `(?:–|—|-|bis|to|a|al|et|and|or|ve)`;
  const timePattern = `\\b\\d+(?:[.,]\\d+)?(?:\\s*${rangeSeparator}\\s*\\d+(?:[.,]\\d+)?)?\\s*(?:Sekunden|segundos|secondes|Minuten|minutes|minutos|Stunden|godzina|godziny|seconds|secondi|sekunda|seconde|secondo|segundo|sekundy|minuti|dakika|minuts|minuta|minuto|minute|minuty|heures|godzin|stunde|saniye|sekund|second|minut|hours|horas|godz\\.|heure|min\\.|mins|hour|hora|std\\.|godz|uren|saat|sek\\.|secs|sec\\.|sec\\.|seg\\.|min|dk\\.|std|hrs|hr\\.|ore|ora|uur|sek|sec|seg|sn\\.|dk|hr|u\\.|h\\.|sn|u|h)(?![a-zA-Z0-9])`;
  const regex = new RegExp(timePattern, 'gi');
  const match = text.match(regex);
  if (match && match[0]) {
    return parseTimeToSeconds(match[0]);
  }
  return 0;
}

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
  checkedSteps: Record<number, boolean>;
  toggleStep: (stepNum: number) => void;
  formatAmount: (amount: number, unit?: string) => string;
  initialStepOverride?: number;
  onRemixSuccess?: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent?: (newRecipe: Recipe) => void;
}

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
  const { timers, removeTimer, dismissFinished, setPendingNavigation } = useTimerManager();
  const { isPremium } = useAuth();

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isCookedModalOpen, setIsCookedModalOpen] = useState(false);
  const [timerSheet, setTimerSheet] = useState<{ isOpen: boolean; seconds: number; label: string }>({
    isOpen: false,
    seconds: 0,
    label: '',
  });

  // Find the first uncompleted step as initial step index
  const initialStepIndex = useMemo(() => {
    if (initialStepOverride !== undefined) {
      return initialStepOverride;
    }
    if (recipe.instructions) {
      const firstUncompleted = recipe.instructions.findIndex(s => !checkedSteps[s.step]);
      return firstUncompleted !== -1 ? firstUncompleted : 0;
    }
    return 0;
  }, [recipe.instructions, checkedSteps, initialStepOverride]);

  const {
    cookingStepIndex,
    setCookingStepIndex,
    handleNextCookingStep,
    handlePrevCookingStep,
    handleTouchStart,
    handleTouchEnd
  } = useCookingMode({
    instructionsCount: recipe.instructions?.length || 0,
    initialStepIndex,
    onClose
  });

  // Listen to navigation events (e.g. clicking on a timer card) to jump to the step if Cooking Mode is open
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId: string; stepNum: number }>;
      if (
        customEvent.detail &&
        customEvent.detail.stepNum !== undefined &&
        (customEvent.detail.recipeId === recipe.id || customEvent.detail.recipeId === recipe.title)
      ) {
        // Jump to 0-based instruction index
        setCookingStepIndex(customEvent.detail.stepNum - 1);
      }
    };
    window.addEventListener('app:navigate-to-timer-step', handleNavigate);
    return () => window.removeEventListener('app:navigate-to-timer-step', handleNavigate);
  }, [recipe.id, recipe.title, setCookingStepIndex]);

  // Flat list of ingredients
  const allIngredients = useMemo(() => {
    return recipe.ingredients ? recipe.ingredients.flatMap(g => g.items) : [];
  }, [recipe.ingredients]);

  // Find ingredients mentioned in a specific step description.
  // First tries LLM inline tags `[word](ing:baseName)`. Falls back to word boundary match for legacy recipes.
  const getIngredientsForStep = (description: string) => {
    if (!description) return [];
    const mentioned: Ingredient[] = [];
    const seen = new Set<string>();

    const inlineTags = extractInlineIngredientTags(description);

    if (inlineTags.length > 0) {
      inlineTags.forEach(tag => {
        const targetBase = tag.baseName.toLowerCase();
        // Match ingredient by baseName or name
        const match = allIngredients.find(ing =>
          ing.baseName?.toLowerCase() === targetBase || ing.name.toLowerCase() === targetBase
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

    // Legacy fallback for recipes created before inline tagging
    allIngredients.forEach(ing => {
      const nameHit = textMentionsTerm(ing.name, description);
      const baseHit = !nameHit
        && (ing.baseName?.trim().length ?? 0) >= 4
        && textMentionsTerm(ing.baseName, description);

      if (nameHit || baseHit) {
        const key = (ing.name || '').trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          mentioned.push(ing);
        }
      }
    });
    return mentioned;
  };

  const currentStep = recipe.instructions?.[cookingStepIndex];

  return (
    <div
      className="fixed inset-0 z-[90] bg-white dark:bg-gray-950 flex flex-col justify-between p-4 md:p-8 pt-[calc(1rem_+_var(--safe-area-inset-top))] pb-[calc(1rem_+_var(--safe-area-inset-bottom))] select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">{t('recipe.cookingMode')}</span>
        </div>
        {/* Progress indicator */}
        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full select-none">
          {t('recipe.cookingModeProgress', { current: cookingStepIndex + 1, total: recipe.instructions?.length || 0 })}
        </div>
        <Button
          isIconOnly
          variant="ghost"
          onPress={onClose}
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-none transition-colors"
          aria-label={t('dialog.closeAria')}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress bar at the top */}
      {recipe.instructions && (
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden my-2">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((cookingStepIndex + 1) / recipe.instructions.length) * 100}%` }}
          />
        </div>
      )}

      {/* Active Timers Sektion in Cooking Mode */}
      {timers.length > 0 && (
        <div className="flex flex-col gap-2 mt-3 w-full max-w-lg mx-auto">
          <div className="flex flex-col gap-1.5">
            {timers.map(timer => {
              const remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
              const isFinished = timer.isFinished;

              const m = Math.floor(remaining / 60);
              const s = remaining % 60;
              const countdownStr = isFinished
                ? t('timer.finished')
                : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

              const { recipeId, stepNum } = timer;
              const isAssociated = !!(recipeId && stepNum);

              const progress = isFinished ? 0 : remaining / timer.durationSeconds;

              return (
                <div
                  key={timer.id}
                  onClick={isAssociated ? () => {
                    setPendingNavigation({ recipeId: recipeId!, stepNum: stepNum! });
                    window.dispatchEvent(new CustomEvent('app:navigate-to-timer-step', {
                      detail: { recipeId, stepNum }
                    }));
                  } : undefined}
                  className={`w-full relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl overflow-hidden transition-all duration-300 ${isAssociated ? 'cursor-pointer active:scale-[0.98]' : ''
                    } ${isFinished
                      ? 'bg-rose-600 dark:bg-rose-700 animate-pulse text-white'
                      : 'bg-blue-600 dark:bg-blue-700 text-white'
                    }`}
                >
                  {/* Background progress track */}
                  {!isFinished && (
                    <div
                      className="absolute inset-0 bg-white/10 origin-left transition-all duration-500"
                      style={{ transform: `scaleX(${progress})` }}
                    />
                  )}

                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    {isFinished ? (
                      <Bell className="w-3.5 h-3.5 text-white animate-bounce" />
                    ) : (
                      <Timer className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </div>

                  {/* Label + countdown */}
                  <div className="relative flex-1 min-w-0 text-left">
                    <p className="text-[9px] text-white/70 font-semibold leading-none">
                      {stripInlineIngredientTags(timer.label)}
                    </p>
                    <p className="text-xs font-black tabular-nums mt-0.5 leading-none">
                      {countdownStr}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFinished) {
                        dismissFinished(timer.id);
                      } else {
                        removeTimer(timer.id);
                      }
                    }}
                    className="relative flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors cursor-pointer border-none"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Central Instruction Step Card */}
      <div
        key={cookingStepIndex}
        className="flex-1 min-h-0 flex flex-col justify-center items-center my-2 sm:my-6 max-w-4xl mx-auto w-full px-4 text-center animate-fade-in"
      >
        {/* Step Number Badge */}
        {currentStep && (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl mb-6 flex-shrink-0">
            {currentStep.step}
          </div>
        )}

        {/* Step Description */}
        {currentStep && (
          <h1 className="text-2xl sm:text-3xl md:text-3.5xl font-bold text-gray-900 dark:text-white tracking-tight leading-relaxed md:leading-[1.6] mb-6 max-h-[40dvh] overflow-y-auto px-2 flex-shrink-0">
            <RecipeInstructionText variant="focused" text={currentStep.description} recipe={recipe} formatAmount={formatAmount} stepNum={currentStep.step} />
          </h1>
        )}

        {/* Contextual Ingredients needed for this step */}
        {currentStep && getIngredientsForStep(currentStep.description).length > 0 && (
          <div className="w-full max-w-lg bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 sm:p-5 text-left flex flex-col min-h-0">
            <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex-shrink-0 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>{t('recipe.ingredientsForStep')}</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs overflow-y-auto pr-1 min-h-0">
              {getIngredientsForStep(currentStep.description).map((ing, i) => {
                const scaledAmount = formatAmount(ing.amount, ing.unit);
                const amountStr = scaledAmount ? `${scaledAmount} ` : '';
                const unitStr = ing.unit ? `${ing.unit} ` : '';
                return (
                  <li key={i} className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">{amountStr}{unitStr}</span>
                    <span className="font-medium truncate">
                      {ing.name}
                      {ing.modifier && (
                        <span className="text-xs text-gray-400 dark:text-gray-400 ml-1 font-normal">
                          ({ing.modifier})
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-col gap-4 max-w-md mx-auto w-full pt-2">
        <div className="flex gap-3 justify-between items-center w-full">
          <Button
            onPress={handlePrevCookingStep}
            isDisabled={cookingStepIndex === 0}
            className="flex-1 py-3.5 h-13 rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-none transition-all active:scale-95 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('recipe.back')}
          </Button>

          {/* Mark Completed & Next Button */}
          {recipe.instructions && cookingStepIndex === recipe.instructions.length - 1 ? (
            <Button
              className="flex-[2] py-3.5 h-13 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-all border-none"
              onPress={() => {
                const currentStepNum = recipe.instructions[cookingStepIndex].step;
                if (!checkedSteps[currentStepNum]) {
                  toggleStep(currentStepNum);
                }
                if (recipe.id) {
                  setIsCookedModalOpen(true);
                } else {
                  onClose();
                }
              }}
            >
              {t('recipe.finish')}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="flex-[2] py-3.5 h-13 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-all border-none"
              onPress={() => {
                if (recipe.instructions) {
                  const currentStepNum = recipe.instructions[cookingStepIndex].step;
                  if (!checkedSteps[currentStepNum]) {
                    toggleStep(currentStepNum);
                  }
                }
                handleNextCookingStep();
              }}
            >
              {t('recipe.doneNext')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute right-4 bottom-24 md:right-8 md:bottom-28 z-[100] flex flex-row gap-3">
        {/* Timer Button */}
        <Button
          isIconOnly
          size="lg"
          className="rounded-full bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white w-12 h-12 flex items-center justify-center transition-all active:scale-95 border-none shadow-sm"
          onPress={() => {
            if (!isPremium) {
              setIsPremiumModalOpen(true);
            } else {
              const stepDuration = currentStep ? extractFirstDuration(currentStep.description) : 0;
              const durationToUse = stepDuration > 0 ? stepDuration : 300;
              setTimerSheet({
                isOpen: true,
                seconds: durationToUse,
                label: currentStep ? `${t('recipe.step')} ${currentStep.step}` : 'Timer'
              });
            }
          }}
          aria-label={t('timer.start')}
        >
          <Timer className="w-5 h-5" />
        </Button>

        {/* Copilot Chat Button */}
        <Button
          isIconOnly
          size="lg"
          className="rounded-full bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white w-12 h-12 flex items-center justify-center transition-all active:scale-95 border-none shadow-sm"
          onPress={() => {
            if (!isPremium) {
              setIsPremiumModalOpen(true);
            } else {
              setIsCopilotOpen(true);
            }
          }}
          aria-label={t('recipe.copilot')}
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      </div>

      {/* Sheets & Dialogs */}
      {timerSheet.isOpen && (
        <TimerConfirmSheet
          isOpen={timerSheet.isOpen}
          durationSeconds={timerSheet.seconds}
          label={timerSheet.label}
          onClose={() => setTimerSheet(prev => ({ ...prev, isOpen: false }))}
          recipeId={recipe.id}
          stepNum={currentStep?.step}
        />
      )}

      {recipe.id && isCopilotOpen && (
        <RecipeCopilot
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          recipe={recipe}
          onRemixSuccess={onRemixSuccess || (() => { })}
          onReplaceCurrent={onReplaceCurrent || (() => { })}
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
