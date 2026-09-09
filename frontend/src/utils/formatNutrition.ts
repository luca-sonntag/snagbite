import type { Recipe } from '../types';

/**
 * Resolves the headline calories figure for a recipe card or poster.
 * Checks nutritionalValues, sourceNutritionalValues, or calculates from ingredients.
 */
export function getRecipeCalories(recipe?: Recipe | null): number | null {
  if (!recipe) return null;

  const direct =
    recipe.nutritionalValues?.calories ?? recipe.sourceNutritionalValues?.calories;
  if (typeof direct === 'number' && direct > 0) {
    return Math.round(direct);
  }

  // If calories are not present at the top level, derive from ingredients if present
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    let totalCalories = 0;
    for (const group of recipe.ingredients) {
      if (!group.items) continue;
      for (const ing of group.items) {
        if (ing.calories && ing.calories > 0) {
          totalCalories += ing.calories;
        }
      }
    }
    const baseServings = Math.max(1, recipe.servings || 1);
    if (totalCalories > 0) {
      return Math.round(totalCalories / baseServings);
    }
  }

  return null;
}

/**
 * Formats a calorie number into a localized display string (e.g. "625 kcal").
 */
export function formatCalories(calories: number | null | undefined): string | null {
  if (!calories || calories <= 0) return null;
  return `${calories.toLocaleString('de-DE')} kcal`;
}
