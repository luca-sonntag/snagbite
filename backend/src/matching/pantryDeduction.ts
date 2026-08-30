import { normalizeUnit } from './matcherUtils.js';
import { calculateWeightGrams } from './nutritionCalculator.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { Ingredient } from '../types.js';
import type { PantryItem } from '../db/types/pantry.js';

/**
 * Calculates the numeric quantity to deduct from a pantry item given a consumed recipe ingredient.
 * Handles:
 * - Identical units (e.g. piece -> piece, g -> g)
 * - Metric weight and volume conversions (g <-> kg, ml <-> l, g <-> ml)
 * - Count/piece/slice/spoon to metric weight/volume (via calculateWeightGrams & gramsPerUnit)
 * - Metric weight to count/piece/slice
 * - Package containers (jar, can, pack) to metric weight
 */
export function calculatePantryDeduction(
  pantryItem: Pick<PantryItem, 'amount' | 'unit' | 'name' | 'baseName'>,
  recipeIng: Pick<Ingredient, 'amount' | 'unit' | 'name' | 'baseName' | 'gramsPerUnit'>,
  canonicalMatch: CanonicalIngredient | null = null
): number {
  const ingAmount = Number(recipeIng.amount) || 0;
  if (ingAmount <= 0) return 0;

  const rawIngUnit = recipeIng.unit || '';
  const rawPantryUnit = pantryItem.unit || '';

  const ingUnit = normalizeUnit(rawIngUnit);
  const pantryUnit = normalizeUnit(rawPantryUnit);

  // 1. Identical normalized units (e.g. piece vs piece, slice vs slice, g vs g, tbsp vs tbsp, can vs can)
  if (ingUnit === pantryUnit) {
    return ingAmount;
  }

  // 2. Pure metric weight & volume conversions
  const isIngMetricWeight = ingUnit === 'g' || ingUnit === 'kg';
  const isPantryMetricWeight = pantryUnit === 'g' || pantryUnit === 'kg';
  const isIngMetricVol = ingUnit === 'ml' || ingUnit === 'l';
  const isPantryMetricVol = pantryUnit === 'ml' || pantryUnit === 'l';

  if (isIngMetricWeight && isPantryMetricWeight) {
    const ingGrams = ingUnit === 'kg' ? ingAmount * 1000 : ingAmount;
    return pantryUnit === 'kg' ? ingGrams / 1000 : ingGrams;
  }

  if (isIngMetricVol && isPantryMetricVol) {
    const ingMl = ingUnit === 'l' ? ingAmount * 1000 : ingAmount;
    return pantryUnit === 'l' ? ingMl / 1000 : ingMl;
  }

  // Metric weight <-> volume (1g ~= 1ml standard for culinary liquids/sauces)
  if ((isIngMetricWeight && isPantryMetricVol) || (isIngMetricVol && isPantryMetricWeight)) {
    const ingGrams = (ingUnit === 'kg' || ingUnit === 'l') ? ingAmount * 1000 : ingAmount;
    return (pantryUnit === 'kg' || pantryUnit === 'l') ? ingGrams / 1000 : ingGrams;
  }

  // 3. Recipe ingredient is in count/pieces/spoons/slices, pantry is in metric weight/volume (g, kg, ml, l)
  if (isPantryMetricWeight || isPantryMetricVol) {
    const weightGrams = calculateWeightGrams(ingAmount, rawIngUnit, canonicalMatch, recipeIng.gramsPerUnit);
    if (pantryUnit === 'kg' || pantryUnit === 'l') {
      return weightGrams / 1000;
    }
    return weightGrams;
  }

  // 4. Recipe ingredient is in metric weight/volume, pantry is in count/pieces/slices/cloves
  const isPantryPiece = ['piece', 'slice', 'clove', 'tablespoon', 'teaspoon'].includes(pantryUnit);
  const pantryGramsPerUnit = isPantryPiece ? recipeIng.gramsPerUnit : null;
  const singlePantryItemGrams = calculateWeightGrams(1, rawPantryUnit, canonicalMatch, pantryGramsPerUnit);

  if (isIngMetricWeight || isIngMetricVol) {
    const ingWeightGrams = calculateWeightGrams(ingAmount, rawIngUnit, canonicalMatch, recipeIng.gramsPerUnit);
    if (singlePantryItemGrams > 0) {
      return Math.round((ingWeightGrams / singlePantryItemGrams) * 100) / 100;
    }
  }

  // 5. Container units (e.g. pantry in jars/cans/packs, recipe in pieces or weight)
  const isPantryContainer = ['jar', 'can', 'pack', 'bunch', 'cup'].includes(pantryUnit);
  if (isPantryContainer && singlePantryItemGrams > 0) {
    const ingWeightGrams = calculateWeightGrams(ingAmount, rawIngUnit, canonicalMatch, recipeIng.gramsPerUnit);
    return Math.round((ingWeightGrams / singlePantryItemGrams) * 100) / 100;
  }

  // Fallback: direct amount if units could not be mapped
  return ingAmount;
}
