import { useMemo } from 'react';
import type { Recipe, NutritionalValues } from '../types';

export function useRecipeNutrition(recipe: Recipe) {
  return useMemo(() => {
    // 1. Check if recipe has original/extracted nutritional values
    const original = recipe.nutritionalValues;
    const hasOriginal = !!(
      original &&
      ((original.calories !== undefined && original.calories !== null && original.calories !== 0) ||
        (original.protein !== undefined && original.protein !== null && original.protein !== 0) ||
        (original.carbs !== undefined && original.carbs !== null && original.carbs !== 0) ||
        (original.fat !== undefined && original.fat !== null && original.fat !== 0))
    );

    const hasVerifiedIngredients = !!(
      recipe.ingredients &&
      recipe.ingredients.some((g) => g.items?.some((i) => i.isVerified))
    );

    if (hasOriginal) {
      return {
        nutritionalValues: original,
        isAiEstimated: false,
        isVerified: hasVerifiedIngredients,
        hasNutritionInfo: true,
      };
    }

    // 2. Otherwise, check if we can calculate from ingredients
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let hasIngredientEstimates = false;

    if (recipe.ingredients) {
      for (const group of recipe.ingredients) {
        for (const ing of group.items) {
          if (
            (ing.calories !== undefined && ing.calories !== null && ing.calories > 0) ||
            (ing.protein !== undefined && ing.protein !== null && ing.protein > 0) ||
            (ing.carbs !== undefined && ing.carbs !== null && ing.carbs > 0) ||
            (ing.fat !== undefined && ing.fat !== null && ing.fat > 0)
          ) {
            hasIngredientEstimates = true;
            totalCalories += ing.calories || 0;
            totalProtein += ing.protein || 0;
            totalCarbs += ing.carbs || 0;
            totalFat += ing.fat || 0;
          }
        }
      }
    }

    if (hasIngredientEstimates) {
      const baseServings = recipe.servings || 1;
      // Create NutritionalValues raw numeric values per serving
      const calculated: NutritionalValues = {
        calories: totalCalories > 0 ? Math.round(totalCalories / baseServings) : null,
        protein: totalProtein > 0 ? Math.round((totalProtein / baseServings) * 10) / 10 : null,
        carbs: totalCarbs > 0 ? Math.round((totalCarbs / baseServings) * 10) / 10 : null,
        fat: totalFat > 0 ? Math.round((totalFat / baseServings) * 10) / 10 : null,
      };

      const hasNutritionInfo =
        calculated.calories !== null ||
        calculated.protein !== null ||
        calculated.carbs !== null ||
        calculated.fat !== null;

      return {
        nutritionalValues: calculated,
        isAiEstimated: true,
        isVerified: hasVerifiedIngredients,
        hasNutritionInfo,
      };
    }

    // 3. Fallback: no nutrition information
    return {
      nutritionalValues: null,
      isAiEstimated: false,
      isVerified: false,
      hasNutritionInfo: false,
    };
  }, [recipe]);
}
