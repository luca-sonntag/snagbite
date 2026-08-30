import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { EstimatedNutrients } from './mappingStore.js';
import type { Ingredient } from '../types.js';
import { normalizeUnit } from './matcherUtils.js';
import { canonicalizeBaseName } from './baseNameCanonical.js';

/**
 * Calculates the total weight in grams for a given amount, unit, and matched ingredient.
 * Prioritizes Gemini's estimated gramsPerUnit when available, with fallback to item standard units.
 */
export function calculateWeightGrams(
  amount: number,
  unit: string,
  item: CanonicalIngredient | null,
  gramsPerUnit?: number | null
): number {
  if (amount <= 0) return 0;
  const normUnit = normalizeUnit(unit);

  // 1. Direct grams / milliliters / metric volume / imperial weights
  if (normUnit === 'g' || normUnit === 'ml') return amount;
  if (normUnit === 'cl') return amount * 10;
  if (normUnit === 'dl') return amount * 100;
  if (normUnit === 'kg' || normUnit === 'l') return amount * 1000;
  if (normUnit === 'oz') return amount * 28.35;
  if (normUnit === 'fl_oz') return amount * 29.57;
  if (normUnit === 'lb') return amount * 453.6;

  // 2. High-precision Gemini gramsPerUnit (when available > 0)
  if (gramsPerUnit !== undefined && gramsPerUnit !== null && gramsPerUnit > 0) {
    return amount * gramsPerUnit;
  }

  // 3. Specific standard unit weights from canonical item (e.g. piece, slice, clove, tablespoon)
  if (item?.standard_units) {
    const std = item.standard_units as Record<string, number | undefined>;
    if (std[normUnit] !== undefined && std[normUnit]! > 0) {
      return amount * std[normUnit]!;
    }
  }

  // 4. Global standard defaults by unit
  const globalDefaults: Record<string, number> = {
    tablespoon: 15,
    teaspoon: 5,
    cup: 200,
    clove: 3,
    pinch: 0.5,
    dash: 1,
    slice: 25,
    piece: 80,
    leaf: 2,
    sprig: 2,
    stalk: 40,
    bulb: 150,
    head: 350,
    pack: 250,
    can: 400,
    jar: 350,
    bunch: 80,
    handful: 30,
  };

  if (globalDefaults[normUnit] !== undefined) {
    return amount * globalDefaults[normUnit];
  }

  return amount * 100;
}

/**
 * Generic nutritional plausibility check comparing estimated ingredient macros
 * against canonical food entry values per 100g.
 *
 * Protects against false matches where a light/zero/fat-reduced/custom product
 * is mistakenly mapped to a high-fat, high-sugar, or high-calorie standard staple.
 */
export function isNutritionallyPlausible(
  ingredient: Ingredient,
  candidate: CanonicalIngredient | null | undefined
): boolean {
  if (!candidate) return false;
  if (ingredient.calories === undefined || ingredient.calories === null) return true;
  if (!ingredient.amount || ingredient.amount <= 0) return true;

  const weightGrams = calculateWeightGrams(ingredient.amount, ingredient.unit, null, ingredient.gramsPerUnit);
  if (weightGrams <= 0) return true;

  const estKcalPer100g = (ingredient.calories / weightGrams) * 100;
  const candKcalPer100g = candidate.nutrients_per_100g.calories;

  // 1. Zero / Ultra-low calorie check (e.g. Zero Ketchup ~15 kcal vs standard Ketchup 98 kcal, Diet sodas ~0 vs 45)
  if (estKcalPer100g <= 35 && candKcalPer100g >= 75) {
    return false;
  }

  // 2. Light / Low-fat vs Full-fat check (e.g. Eat Lean Cheese ~160 kcal vs Gouda 380 kcal; Miracle Whip ~130 kcal vs Mayo 750 kcal)
  if (estKcalPer100g <= 220 && candKcalPer100g >= 340) {
    return false;
  }

  // 3. Significant Relative Calorie Divergence (> 2.5x gap for foods with substantial absolute differences)
  if (estKcalPer100g > 0 && candKcalPer100g > 0) {
    const ratio = candKcalPer100g / estKcalPer100g;
    if (ratio >= 2.5 && candKcalPer100g - estKcalPer100g >= 50) {
      return false;
    }
  }

  // 4. Macro Fat check: low-fat specified (<= 5g/100g) vs high-fat candidate (>= 25g/100g)
  if (ingredient.fat !== undefined && ingredient.fat !== null) {
    const estFatPer100g = (ingredient.fat / weightGrams) * 100;
    if (estFatPer100g <= 5 && candidate.nutrients_per_100g.fat >= 25) {
      return false;
    }
  }

  // 5. Macro Carbs check: low-carb / sugar-free specified (<= 3g/100g) vs high-carb candidate (>= 18g/100g)
  if (ingredient.carbs !== undefined && ingredient.carbs !== null) {
    const estCarbsPer100g = (ingredient.carbs / weightGrams) * 100;
    if (estCarbsPer100g <= 3 && candidate.nutrients_per_100g.carbs >= 18) {
      return false;
    }
  }

  return true;
}

/**
 * Helper to apply matched canonical nutritional data to an ingredient and compute its macro values.
 */
export function applyCanonicalMatchToIngredient(
  ingredient: Ingredient,
  match: CanonicalIngredient | null,
  cachedEstimate?: EstimatedNutrients | null
): {
  matched: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  if (ingredient.baseName) {
    ingredient.baseName = canonicalizeBaseName(ingredient.baseName);
  }

  let effectiveMatch = match;
  if (effectiveMatch && !isNutritionallyPlausible(ingredient, effectiveMatch)) {
    effectiveMatch = null;
  }

  if (!effectiveMatch) {
    // Remixes echo the parent's match fields back from the model — drop them so an
    // unmatched ingredient never carries a stale canonical reference next to
    // LLM-estimated macros.
    ingredient.isVerified = false;
    ingredient.canonicalId = undefined;
    ingredient.matchedName = undefined;

    // A stored per-100 g estimate fills in only where the extraction produced no
    // number at all. It never overwrites the model's own per-quantity values,
    // which were computed with the recipe in view.
    if (cachedEstimate && !((ingredient.calories ?? 0) > 0)) {
      const grams = calculateWeightGrams(ingredient.amount, ingredient.unit, null, ingredient.gramsPerUnit);
      const factor = grams / 100;
      ingredient.calories = Math.round(cachedEstimate.calories * factor);
      ingredient.protein = Math.round(cachedEstimate.protein * factor * 10) / 10;
      ingredient.carbs = Math.round(cachedEstimate.carbs * factor * 10) / 10;
      ingredient.fat = Math.round(cachedEstimate.fat * factor * 10) / 10;
    }

    return {
      matched: false,
      calories: ingredient.calories ?? 0,
      protein: ingredient.protein ?? 0,
      carbs: ingredient.carbs ?? 0,
      fat: ingredient.fat ?? 0,
    };
  }

  const weightGrams = calculateWeightGrams(ingredient.amount, ingredient.unit, effectiveMatch, ingredient.gramsPerUnit);
  const factor = weightGrams / 100;

  // Populate gramsPerUnit on ingredient if missing
  if ((!ingredient.gramsPerUnit || ingredient.gramsPerUnit <= 0) && ingredient.amount > 0) {
    ingredient.gramsPerUnit = Math.round((weightGrams / ingredient.amount) * 10) / 10;
  }

  const cal = Math.round(effectiveMatch.nutrients_per_100g.calories * factor);
  const prot = Math.round(effectiveMatch.nutrients_per_100g.protein * factor * 10) / 10;
  const carb = Math.round(effectiveMatch.nutrients_per_100g.carbs * factor * 10) / 10;
  const fat = Math.round(effectiveMatch.nutrients_per_100g.fat * factor * 10) / 10;

  ingredient.canonicalId = effectiveMatch.id;
  ingredient.matchedName = effectiveMatch.name_de;
  ingredient.isVerified = true;
  ingredient.calories = cal;
  ingredient.protein = prot;
  ingredient.carbs = carb;
  ingredient.fat = fat;

  if (!ingredient.category || ingredient.category === 'OTHER') {
    ingredient.category = effectiveMatch.category;
  }

  return { matched: true, calories: cal, protein: prot, carbs: carb, fat };
}
