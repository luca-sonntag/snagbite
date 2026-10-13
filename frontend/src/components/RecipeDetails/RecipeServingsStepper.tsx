import ServingsStepper from '../ServingsStepper';
import { useI18n } from '../../context/I18nContext';

interface RecipeServingsStepperProps {
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
}

export default function RecipeServingsStepper({
  servings,
  onDecreaseServings,
  onIncreaseServings,
}: RecipeServingsStepperProps) {
  const { t } = useI18n();

  return (
    <div id="tour-recipe-servings">
      <ServingsStepper
        servings={servings}
        onDecrease={onDecreaseServings}
        onIncrease={onIncreaseServings}
        size="md"
        showIcon={false}
        ariaLabel={t('recipe.serves')}
      />
    </div>
  );
}
