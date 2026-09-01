import { config } from '../config.js';
import { getDefaultShelfLifeDays } from '@cookbook/shared';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import { canonicalizeBaseName, buildMappingKeys, toEnglishSingular } from './baseNameCanonical.js';
import {
  resolveIngredient,
  mapWithConcurrency,
  type ResolverInput,
} from './ingredientResolver.js';
import {
  lookupMapping,
  storeMapping,
  flushHitCounts,
  type EstimatedNutrients,
} from './mappingStore.js';
import type { Recipe, Ingredient, ParentIngredientInfo, GeminiUsageInfo } from '../types.js';
import { estimateCost } from '../logger.js';
import { normalizeUnit, normalizeSearchTerm } from './matcherUtils.js';
import {
  calculateWeightGrams,
  isNutritionallyPlausible,
  applyCanonicalMatchToIngredient,
} from './nutritionCalculator.js';
import { openFoodFactsAccess } from './openFoodFactsIndex.js';

// Re-exported so existing callers, routes and unit tests keep importing from ingredientMatcher.
export {
  toEnglishSingular,
  canonicalizeBaseName,
  buildMappingKeys,
  normalizeUnit,
  normalizeSearchTerm,
  calculateWeightGrams,
  isNutritionallyPlausible,
  applyCanonicalMatchToIngredient,
  openFoodFactsAccess,
};

/**
 * Ingredients of one recipe resolved in parallel. Kept small on purpose: the
 * resolver's process-wide semaphore is the real limit, and a large fan-out here
 * would just queue up behind it.
 */
const RECIPE_RESOLVE_CONCURRENCY = 3;

/**
 * Resolves one ingredient via the learned mapping store (cache) or Gemini tool resolver
 * backed by Open Food Facts DACH database.
 */
export async function resolveAndRemember(
  input: ResolverInput
): Promise<{ match: CanonicalIngredient | null; estimate: EstimatedNutrients | null; usage?: GeminiUsageInfo }> {
  const keys = buildMappingKeys(input.baseName, input.name, input.synonyms);
  const category = (input.category || '').toUpperCase().trim();

  if (keys.length > 0) {
    const known = await lookupMapping(keys, category);
    if (known) {
      const code = known.productCode;
      const item = code ? openFoodFactsAccess.get(code) : null;
      // Only return cache hit if item was found or if it was an explicit no_match with estimate
      if (!code || item) {
        return { match: item, estimate: known.estimatedNutrients };
      }
    }
  }

  const resolved = await resolveIngredient(input, openFoodFactsAccess);
  const resolvedCode = resolved?.productCode;
  const item = resolvedCode ? openFoodFactsAccess.get(resolvedCode) : null;

  // Offline search fallback if disabled or local dev
  let effectiveItem = item;
  if (!effectiveItem && (!config.INGREDIENT_RESOLVER_ENABLED || !config.GEMINI_API_KEY)) {
    let hits = openFoodFactsAccess.search(input.baseName || input.name, input.category, 1);
    if (hits.length === 0 && input.baseName && input.name) {
      hits = openFoodFactsAccess.search(input.name, input.category, 1);
    }
    if (hits.length > 0) {
      effectiveItem = hits[0];
    }
  }

  // Derive per-100g nutritional estimate from recipe if not matched to an OFF product
  let estimatedNutrients: EstimatedNutrients | null = resolved?.estimatedNutrients ?? null;
  if (
    !effectiveItem &&
    !estimatedNutrients &&
    input.calories !== undefined &&
    input.calories !== null &&
    input.amount &&
    input.amount > 0
  ) {
    const weightGrams = calculateWeightGrams(input.amount, input.unit || 'g', null, input.gramsPerUnit);
    if (weightGrams > 0) {
      const factor = 100 / weightGrams;
      estimatedNutrients = {
        calories: Math.round((input.calories || 0) * factor),
        protein: Math.round((input.protein || 0) * factor * 10) / 10,
        carbs: Math.round((input.carbs || 0) * factor * 10) / 10,
        fat: Math.round((input.fat || 0) * factor * 10) / 10,
      };
    }
  }

  const typicalPackageAmount = resolved?.typicalPackageAmount ?? input.typicalPackageAmount ?? null;
  const typicalPackageUnit = resolved?.typicalPackageUnit ?? input.typicalPackageUnit ?? null;
  const rawShelfLife =
    resolved?.shelfLifeDays ??
    input.shelfLifeDays ??
    getDefaultShelfLifeDays(category, input.baseName || input.name);

  // Guarantee supermarket-realistic minimum shelf life (avoid 1-day fresh counter panic)
  const isMeatOrFish = category === 'MEAT_POULTRY' || category === 'SEAFOOD';
  const shelfLifeDays = isMeatOrFish ? Math.max(3, rawShelfLife) : Math.max(2, rawShelfLife);

  // ALWAYS store in ingredient_mappings so 100% of ingredients are learned & cached
  if (keys.length > 0) {
    const mappingKey = canonicalizeBaseName(input.baseName) || keys[0];
    const mappingKeyDe = canonicalizeBaseName(input.name);
    const aliases = keys.filter((k) => k !== mappingKey && k !== mappingKeyDe);

    await storeMapping(
      {
        mappingKey,
        mappingKeyDe: mappingKeyDe !== mappingKey ? mappingKeyDe : null,
        aliases,
        category,
      },
      {
        productCode: effectiveItem ? effectiveItem.product_code || effectiveItem.id : null,
        resolution: effectiveItem ? 'matched' : 'no_match',
        estimatedNutrients: effectiveItem ? null : estimatedNutrients,
        typicalPackageAmount,
        typicalPackageUnit,
        shelfLifeDays,
        source: 'agent',
        confidence: resolved?.confidence ?? 0.8,
        model: resolved?.model ?? config.GEMINI_MODEL,
        reasoning:
          resolved?.reasoning ??
          (effectiveItem ? 'Matched to Open Food Facts product' : 'Extracted from recipe ingredients'),
      }
    );
  }

  return { match: effectiveItem, estimate: effectiveItem ? null : estimatedNutrients, usage: resolved?.usage };
}

/**
 * Finds a matching canonical ingredient via the learned mapping store and Gemini resolver.
 * (Convenience method for standalone lookups / unit tests.)
 */
export async function findCanonicalIngredient(
  name: string,
  baseName?: string,
  category?: string,
  synonyms?: string[],
  parentIngredient?: ParentIngredientInfo,
  modifier?: string,
  brand?: string,
  _ingredientRef?: Ingredient
): Promise<CanonicalIngredient | null> {
  const { match } = await resolveAndRemember({
    name,
    baseName,
    brand,
    modifier,
    category,
    synonyms,
    parentIngredient,
  });
  return match;
}

/**
 * Matches and enriches a single ingredient.
 */
export async function matchAndEnrichIngredient(
  ingredient: Ingredient,
  groupCategory?: string
): Promise<{
  matched: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> {
  const effectiveCategory = ingredient.category || groupCategory;
  const match = await findCanonicalIngredient(
    ingredient.name,
    ingredient.baseName,
    effectiveCategory,
    ingredient.synonyms,
    ingredient.parentIngredient,
    ingredient.modifier,
    ingredient.brand,
    ingredient
  );

  let grams = calculateWeightGrams(ingredient.amount, ingredient.unit, match, ingredient.gramsPerUnit);
  if (grams === 0 && ingredient.amount > 0) {
    grams = ingredient.amount;
  }

  if (match) {
    const factor = grams / 100;
    return {
      matched: true,
      calories: Math.round(match.nutrients_per_100g.calories * factor),
      protein: Math.round(match.nutrients_per_100g.protein * factor * 10) / 10,
      carbs: Math.round(match.nutrients_per_100g.carbs * factor * 10) / 10,
      fat: Math.round(match.nutrients_per_100g.fat * factor * 10) / 10,
    };
  }

  return {
    matched: false,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

/**
 * Enriches all ingredients across a recipe with Open Food Facts data.
 * All items are resolved via the learned mapping store & tool-using Gemini resolver.
 */
export async function enrichRecipeWithCanonicalIngredients(
  recipe: Recipe
): Promise<{ usage?: GeminiUsageInfo }> {
  if (!recipe || !recipe.ingredients) return {};

  const flatItems: Array<{ ing: Ingredient; groupName?: string; id: string }> = [];
  let itemCounter = 0;

  for (const group of recipe.ingredients) {
    if (!group.items) continue;
    for (const ing of group.items) {
      flatItems.push({ ing, groupName: group.name, id: `item_${itemCounter++}` });
    }
  }

  if (flatItems.length === 0) return {};

  const matchedCanonicalMap = new Map<string, CanonicalIngredient | null>();
  const estimateMap = new Map<string, EstimatedNutrients>();

  const unresolved: Array<{ id: string; input: ResolverInput }> = flatItems.map(({ ing, groupName, id }) => ({
    id,
    input: {
      name: ing.name,
      baseName: ing.baseName,
      brand: ing.brand,
      modifier: ing.modifier,
      category: ing.category || groupName,
      synonyms: ing.synonyms,
      isGenericGrocery: ing.isGenericGrocery,
      parentIngredient: ing.parentIngredient,
      typicalPackageAmount: ing.typicalPackageAmount,
      typicalPackageUnit: ing.typicalPackageUnit,
      shelfLifeDays: ing.shelfLifeDays,
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      amount: ing.amount,
      unit: ing.unit,
      gramsPerUnit: ing.gramsPerUnit,
    },
  }));

  // Resolve all items in parallel via learned store & Gemini tool resolver
  let totalPromptTokens = 0;
  let totalCandidateTokens = 0;
  let totalTokens = 0;
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  let modelUsed: string | undefined;
  let resolverCallCount = 0;

  if (unresolved.length > 0) {
    const results = await mapWithConcurrency(unresolved, RECIPE_RESOLVE_CONCURRENCY, item =>
      resolveAndRemember(item.input)
    );

    for (let i = 0; i < unresolved.length; i++) {
      const { id } = unresolved[i];
      const { match, estimate, usage } = results[i];
      matchedCanonicalMap.set(id, match);
      if (!match && estimate) estimateMap.set(id, estimate);
      if (usage) {
        resolverCallCount++;
        modelUsed = usage.model ?? modelUsed;
        totalDurationMs += usage.durationMs ?? 0;
        if (usage.tokenUsage) {
          totalPromptTokens += usage.tokenUsage.promptTokens;
          totalCandidateTokens += usage.tokenUsage.candidateTokens;
          totalTokens += usage.tokenUsage.totalTokens;
        }
        if (usage.costEstimate) {
          totalCostUsd += usage.costEstimate.totalCostUsd;
        }
      }
    }
  }

  // Flush hit counters accumulated during resolution
  await flushHitCounts().catch(() => {});

  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const { ing, id } of flatItems) {
    const canonical = matchedCanonicalMap.get(id) ?? null;
    const fallbackEstimate = estimateMap.get(id);

    const calculated = applyCanonicalMatchToIngredient(ing, canonical, fallbackEstimate);

    totalKcal += calculated.calories;
    totalProtein += calculated.protein;
    totalCarbs += calculated.carbs;
    totalFat += calculated.fat;
  }

  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;

  recipe.nutritionalValues = {
    calories: Math.round(totalKcal / servings),
    protein: Math.round((totalProtein / servings) * 10) / 10,
    carbs: Math.round((totalCarbs / servings) * 10) / 10,
    fat: Math.round((totalFat / servings) * 10) / 10,
  };

  const totalItems = flatItems.length;
  const verifiedCount = flatItems.filter(f => f.ing.isVerified).length;
  recipe.nutritionCoverage = totalItems > 0 ? Math.round((verifiedCount / totalItems) * 100) / 100 : 1;

  if (resolverCallCount > 0) {
    const tokenUsage = {
      promptTokens: totalPromptTokens,
      candidateTokens: totalCandidateTokens,
      totalTokens,
    };
    return {
      usage: {
        model: modelUsed,
        tokenUsage,
        costEstimate: estimateCost(modelUsed || 'gemini-2.5-flash', tokenUsage),
        durationMs: totalDurationMs,
      },
    };
  }

  return {};
}
