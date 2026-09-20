import type { Recipe, Ingredient } from '../../types';

export interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
  checkedSteps: Record<number, boolean>;
  toggleStep: (stepNum: number) => void;
  formatAmount: (amount: number, unit?: string) => string;
  initialStepOverride?: number;
  onRemixSuccess?: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent?: (newRecipe: Recipe) => void;
}

export interface CookingModeTimerSheetState {
  isOpen: boolean;
  seconds: number;
  label: string;
}

export interface StepIngredientItem extends Ingredient {
  category?: string;
}
