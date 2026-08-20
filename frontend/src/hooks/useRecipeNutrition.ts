import { useMemo } from 'react';
import type { Recipe, NutritionalValues } from '../types';

/** Below this share of BLS-backed calories the figure is an estimate, not a verified value. */
const VERIFIED_COVERAGE_THRESHOLD = 0.9;

/**
 * Derives the per-serving nutrition figure from the ingredient list.
 *
 * The ingredient breakdown is the single source of truth: the headline number and
 * the per-ingredient sheet can never contradict each other, and no write path can
 * corrupt a value that is computed rather than stored. A figure stated by the
 * recipe source is returned separately as `sourceNutritionalValues` so the UI can
 * show it next to the computed one instead of silently replacing it.
 */
export function useRecipeNutrition(recipe: Recipe, currentServings?: number) {
  return useMemo(() => {
    const source = recipe.sourceNutritionalValues;
    const hasSource = !!(
      source &&
      ((source.calories !== undefined && source.calories !== null && source.calories !== 0) ||
        (source.protein !== undefined && source.protein !== null && source.protein !== 0) ||
        (source.carbs !== undefined && source.carbs !== null && source.carbs !== 0) ||
        (source.fat !== undefined && source.fat !== null && source.fat !== 0))
    );

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let matchedCalories = 0;
    let hasIngredientEstimates = false;

    if (recipe.ingredients) {
      for (const group of recipe.ingredients) {
        for (const ing of group.items) {
          const calories = ing.calories || 0;
          const protein = ing.protein || 0;
          const carbs = ing.carbs || 0;
          const fat = ing.fat || 0;

          if (calories > 0 || protein > 0 || carbs > 0 || fat > 0) {
            hasIngredientEstimates = true;
            totalCalories += calories;
            totalProtein += protein;
            totalCarbs += carbs;
            totalFat += fat;
            if (ing.isVerified) matchedCalories += calories;
          }
        }
      }
    }

    const effectiveServings = Math.max(1, currentServings || recipe.servings || 1);

    if (hasIngredientEstimates) {
      const calculated: NutritionalValues = {
        calories: totalCalories > 0 ? Math.round(totalCalories / effectiveServings) : null,
        protein: totalProtein > 0 ? Math.round((totalProtein / effectiveServings) * 10) / 10 : null,
        carbs: totalCarbs > 0 ? Math.round((totalCarbs / effectiveServings) * 10) / 10 : null,
        fat: totalFat > 0 ? Math.round((totalFat / effectiveServings) * 10) / 10 : null,
      };

      const coverage = totalCalories > 0 ? matchedCalories / totalCalories : 0;

      return {
        nutritionalValues: calculated,
        sourceNutritionalValues: hasSource ? source! : null,
        coverage,
        isAiEstimated: true,
        isVerified: coverage >= VERIFIED_COVERAGE_THRESHOLD,
        hasNutritionInfo:
          calculated.calories !== null ||
          calculated.protein !== null ||
          calculated.carbs !== null ||
          calculated.fat !== null,
      };
    }

    // No usable ingredient data. Recipes extracted before nutrition became derived
    // carry their figure in `nutritionalValues`; a stated source figure is the next
    // best thing. Both are shown as estimates, since neither can be traced to BLS.
    const legacy = recipe.nutritionalValues;
    const baseSource = hasSource ? source! : legacy;
    const hasFallback = !!(
      baseSource &&
      ((baseSource.calories !== undefined && baseSource.calories !== null && baseSource.calories !== 0) ||
        (baseSource.protein !== undefined && baseSource.protein !== null && baseSource.protein !== 0) ||
        (baseSource.carbs !== undefined && baseSource.carbs !== null && baseSource.carbs !== 0) ||
        (baseSource.fat !== undefined && baseSource.fat !== null && baseSource.fat !== 0))
    );

    if (hasFallback && baseSource) {
      const baseServings = Math.max(1, recipe.servings || 1);
      const ratio = baseServings / effectiveServings;
      const scaledFallback: NutritionalValues = {
        calories: baseSource.calories ? Math.round(baseSource.calories * ratio) : null,
        protein: baseSource.protein ? Math.round(baseSource.protein * ratio * 10) / 10 : null,
        carbs: baseSource.carbs ? Math.round(baseSource.carbs * ratio * 10) / 10 : null,
        fat: baseSource.fat ? Math.round(baseSource.fat * ratio * 10) / 10 : null,
      };

      return {
        nutritionalValues: scaledFallback,
        sourceNutritionalValues: null,
        coverage: 0,
        isAiEstimated: true,
        isVerified: false,
        hasNutritionInfo: true,
      };
    }

    return {
      nutritionalValues: null,
      sourceNutritionalValues: null,
      coverage: 0,
      isAiEstimated: false,
      isVerified: false,
      hasNutritionInfo: false,
    };
  }, [recipe, currentServings]);
}
