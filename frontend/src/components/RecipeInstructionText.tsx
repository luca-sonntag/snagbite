import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import type { Recipe } from '../types';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import TimerConfirmSheet from './TimerConfirmSheet';
import PremiumModal from './PremiumModal';
import InstructionIngredientPopover from './InstructionIngredientPopover';

interface RecipeInstructionTextProps {
  /**
   * `list` is the step list on the detail page, where a dozen coloured words
   * across five steps read as noise — there, only tappable things (ingredients,
   * timers) carry a hue. `focused` is the cooking mode: one step filling the
   * screen, where temperature and equipment are worth spotting at a glance.
   */
  variant?: 'list' | 'focused';
  text: string;
  recipe: Recipe;
  formatAmount: (amount: number, unit?: string) => string;
  stepNum?: number;
}

/**
 * Equipment and temperature are both context rather than something to act on,
 * so they share one quiet chip — defined once so the two cannot drift apart.
 * Colour stays reserved for the tappable things: ingredients and timers.
 */
const getChipClass = (variant: 'list' | 'focused' = 'list') =>
  variant === 'focused'
    ? 'bg-black/[0.05] dark:bg-white/[0.08] rounded-xl px-2.5 py-1 text-gray-700 dark:text-gray-300 font-medium inline'
    : 'bg-black/[0.06] dark:bg-white/[0.09] rounded px-1.5 py-[1.5px] text-gray-700 dark:text-gray-300 font-medium inline';

export default function RecipeInstructionText({
  text,
  recipe,
  formatAmount,
  stepNum,
  variant = 'list',
}: RecipeInstructionTextProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();

  // Timer confirm sheet state
  const [timerSheet, setTimerSheet] = useState<{ isOpen: boolean; seconds: number; label: string }>({
    isOpen: false,
    seconds: 0,
    label: '',
  });

  // In-app timers are a premium feature — free users get the upsell instead.
  const [premiumOpen, setPremiumOpen] = useState(false);

  // Flat list of ingredients
  const allIngredients = useMemo(() => {
    return recipe.ingredients
      ? recipe.ingredients.flatMap(g =>
          g.items.map(item => ({
            ...item,
            category: item.category || g.name,
          }))
        )
      : [];
  }, [recipe.ingredients]);

  // Highlights ingredients, equipment, temperatures, and timers in instruction text
  const renderedContent = useMemo(() => {
    if (!text) return text;

    const rangeSeparator = `(?:–|—|-|bis|to|a|al|et|and|or|ve)`;
    const tempPattern = `\\b\\d+(?:[.,]\\d+)?(?:\\s*${rangeSeparator}\\s*\\d+(?:[.,]\\d+)?)?\\s*(?:Fahrenheit|Celsius|stopniach|degrees|stopnie|stopnia|degree|grados|degrés|graden|derece|stopni|grado|degré|graus|gradi|grau|Grad|°[CF]?)(?![a-zA-Z0-9])`;
    const inlineTagPattern = `\\[[^\\]]+\\]\\((?:ing|timer):[^)]+\\)`;

    // Legacy terms building for equipment or untagged legacy recipes
    const legacyTerms: {
      term: string;
      type: 'ingredient' | 'equipment';
      ingredient?: typeof allIngredients[number];
      info: string;
    }[] = [];

    const hasInlineTags = /\[[^\]]+\]\((?:ing|timer):[^)]+\)/.test(text);

    if (!hasInlineTags) {
      allIngredients.forEach(ing => {
        const scaledAmount = formatAmount(ing.amount, ing.unit);
        const amountStr = scaledAmount ? `${scaledAmount} ` : '';
        const unitStr = ing.unit ? `${ing.unit} ` : '';
        const modifierStr = ing.modifier ? ` (${ing.modifier})` : '';
        const noteStr = ing.notes ? ` (${ing.notes})` : '';
        let info = `${ing.name}${modifierStr}`.trim();
        if (noteStr) info += ` ,${noteStr}`;
        info += ` (${amountStr}${unitStr})`;

        if (ing.name && ing.name.length >= 2) {
          legacyTerms.push({ term: ing.name.toLowerCase(), type: 'ingredient', ingredient: ing, info });
        }
        if (ing.baseName && ing.baseName.length >= 2) {
          legacyTerms.push({ term: ing.baseName.toLowerCase(), type: 'ingredient', ingredient: ing, info });
        }
      });
    }

    if (recipe.equipment) {
      recipe.equipment.forEach(eq => {
        if (eq && eq.length > 2) {
          legacyTerms.push({
            term: eq.toLowerCase(),
            type: 'equipment',
            info: t('recipe.equipmentTooltip', { name: eq })
          });
        }
      });
    }

    legacyTerms.sort((a, b) => b.term.length - a.term.length);
    const uniqueLegacyTerms = legacyTerms.filter((item, index, self) =>
      self.findIndex(t => t.term === item.term) === index
    );

    const escapedLegacyTerms = uniqueLegacyTerms.map(t => {
      let esc = t.term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (t.term.length <= 3) {
        esc = `(?<=^|[\\s.,:;!?()[\\]{}'"\\-/])${esc}(?=$|[\\s.,:;!?()[\\]{}'"\\-/])`;
      }
      return esc;
    });

    const patterns = [inlineTagPattern, tempPattern, ...escapedLegacyTerms].filter(Boolean);
    const regex = new RegExp(`(${patterns.join('|')})`, 'gi');

    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, index) => {
          // 1a. Inline Ingredient Tag: [word](ing:baseName)
          const inlineIngMatch = part.match(/^\[([^\]]+)\]\(ing:([^)]+)\)$/);
          if (inlineIngMatch) {
            const wordInText = inlineIngMatch[1];
            const targetBase = inlineIngMatch[2].trim().toLowerCase();
            const matchedIng = allIngredients.find(ing =>
              ing.baseName?.toLowerCase() === targetBase || ing.name.toLowerCase() === targetBase
            );

            return (
              <InstructionIngredientPopover
                key={index}
                displayText={wordInText}
                matchedIngredient={matchedIng}
                fallbackText={inlineIngMatch[2]}
                formatAmount={formatAmount}
                variant={variant}
              />
            );
          }

          // 1b. Inline Timer Tag: [time text](timer:seconds)
          const inlineTimerMatch = part.match(/^\[([^\]]+)\]\(timer:(\d+)\)$/);
          if (inlineTimerMatch) {
            const timeText = inlineTimerMatch[1];
            const seconds = parseInt(inlineTimerMatch[2], 10);
            const canTimer = seconds >= 15;

            return (
              <span
                key={index}
                onClick={canTimer ? (e) => {
                  e.stopPropagation();
                  if (!isPremium) {
                    setPremiumOpen(true);
                    return;
                  }
                  setTimerSheet({ isOpen: true, seconds, label: text });
                } : undefined}
                className={`inline-flex items-center gap-1.5 align-middle font-semibold transition-all select-none ${
                  canTimer
                    ? variant === 'focused'
                      ? 'text-blue-700 dark:text-blue-300 bg-blue-500/12 dark:bg-blue-500/20 px-2 py-0.5 rounded-lg hover:bg-blue-500/20 dark:hover:bg-blue-500/30 cursor-pointer active:scale-95'
                      : 'text-blue-600 dark:text-blue-500 cursor-pointer hover:underline decoration-blue-500/30 underline-offset-4 active:scale-95'
                    : 'text-gray-500 dark:text-gray-400 cursor-default'
                }`}
                title={canTimer ? 'Timer starten / Start timer' : undefined}
              >
                <Clock className={`w-4 h-4 shrink-0 ${
                  canTimer ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`} />
                {timeText}
              </span>
            );
          }

          // 2. Temperature match
          const isTemp = new RegExp(`^${tempPattern}$`, 'i').test(part);
          if (isTemp) {
            return (
              <span
                key={index}
                className={`${getChipClass(variant)} cursor-default select-none`}
              >
                {part}
              </span>
            );
          }

          // 3. Legacy term match (Equipment or Untagged ingredient)
          const matched = uniqueLegacyTerms.find(t => part.toLowerCase() === t.term);
          if (matched) {
            const isIng = matched.type === 'ingredient';
            if (!isIng) {
              return (
                <span
                  key={index}
                  className={`${getChipClass(variant)} cursor-default select-none`}
                >
                  {part}
                </span>
              );
            }

            return (
              <InstructionIngredientPopover
                key={index}
                displayText={part}
                matchedIngredient={matched.ingredient}
                fallbackText={matched.info}
                formatAmount={formatAmount}
                variant={variant}
              />
            );
          }
          return part;
        })}
      </>
    );
  }, [text, recipe.equipment, allIngredients, formatAmount, t, isPremium, variant]);

  return (
    <>
      {renderedContent}
      <TimerConfirmSheet
        isOpen={timerSheet.isOpen}
        durationSeconds={timerSheet.seconds}
        label={timerSheet.label}
        recipeId={recipe.id}
        stepNum={stepNum}
        onClose={() => setTimerSheet(s => ({ ...s, isOpen: false }))}
      />
      <PremiumModal isOpen={premiumOpen} onOpenChange={setPremiumOpen} />
    </>
  );
}
