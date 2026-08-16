import { Button } from '@heroui/react';
import { Minus, Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface RecipeServingsStepperProps {
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
}

/**
 * Compact +/- control cluster that drives `useRecipeScaling`. The surrounding
 * label and card are provided by the parent (see RecipeInfoSection), so this
 * component only owns the two 44px touch targets and the portion count.
 */
export default function RecipeServingsStepper({
  servings,
  onDecreaseServings,
  onIncreaseServings,
}: RecipeServingsStepperProps) {
  const { t } = useI18n();

  // Keep the 44px touch targets; a subtle resting fill + emerald hover keeps
  // them light instead of the heavy solid-grey circles of the old design.
  const buttonClasses =
    'w-11 h-11 min-w-[44px] min-h-[44px] p-0 rounded-full text-gray-500 dark:text-gray-400 bg-black/[0.03] dark:bg-white/[0.05] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 transition-all';

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        className={buttonClasses}
        onPress={onDecreaseServings}
        aria-label={t('recipe.decreaseServings')}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <span className="text-base font-extrabold text-gray-900 dark:text-white min-w-[1.75rem] text-center tabular-nums select-none">
        {servings}
      </span>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        className={buttonClasses}
        onPress={onIncreaseServings}
        aria-label={t('recipe.increaseServings')}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
