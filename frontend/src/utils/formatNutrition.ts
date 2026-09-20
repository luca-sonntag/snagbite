import type { Recipe, MealPlanRecipeSummary } from '../types';

/**
 * Resolves the headline calories figure for a recipe card or poster.
 * Checks direct calories, nutritionalValues, sourceNutritionalValues, or calculates from ingredients.
 */
export function getRecipeCalories(recipe?: Recipe | MealPlanRecipeSummary | null): number | null {
  if (!recipe) return null;

  // Direct calories on MealPlanRecipeSummary or Recipe
  if ('calories' in recipe && typeof (recipe as MealPlanRecipeSummary).calories === 'number' && ((recipe as MealPlanRecipeSummary).calories ?? 0) > 0) {
    return Math.round((recipe as MealPlanRecipeSummary).calories!);
  }

  const r = recipe as Recipe;
  const direct =
    r.nutritionalValues?.calories ?? r.sourceNutritionalValues?.calories;
  if (typeof direct === 'number' && direct > 0) {
    return Math.round(direct);
  }

  // If calories are not present at the top level, derive from ingredients if present
  if (r.ingredients && r.ingredients.length > 0) {
    let totalCalories = 0;
    for (const group of r.ingredients) {
      if (!group.items) continue;
      for (const ing of group.items) {
        if (ing.calories && ing.calories > 0) {
          totalCalories += ing.calories;
        }
      }
    }
    const baseServings = Math.max(1, r.servings || 1);
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
