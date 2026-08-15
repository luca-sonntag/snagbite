import { CANONICAL_INGREDIENTS, type CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { Recipe, Ingredient } from '../types.js';

// Pre-indexed lookup maps for O(1) matching
const byId = new Map<string, CanonicalIngredient>();
const byAlias = new Map<string, CanonicalIngredient>();
const byNameEn = new Map<string, CanonicalIngredient>();
const byNameDe = new Map<string, CanonicalIngredient>();

function getSimplicityScore(item: CanonicalIngredient): number {
  const de = (item.name_de || '').toLowerCase();
  const en = (item.name_en || '').toLowerCase();
  let score = 100 - de.length; // shorter name = simpler base food
  if (de.includes('roh') || en.includes('raw')) score += 30;
  if (de.includes('nature') || en.includes('plain') || en.includes('unsalted')) score += 20;
  if (
    de.includes('mit ') ||
    de.includes('zubereitet') ||
    de.includes('gericht') ||
    de.includes('salat') ||
    de.includes('teig') ||
    de.includes('sauce') ||
    de.includes('burger')
  ) {
    score -= 50;
  }
  return score;
}

for (const item of CANONICAL_INGREDIENTS) {
  byId.set(item.id.toLowerCase().trim(), item);
  byNameEn.set(item.name_en.toLowerCase().trim(), item);
  byNameDe.set(item.name_de.toLowerCase().trim(), item);

  for (const alias of item.aliases) {
    const key = alias.toLowerCase().trim();
    if (!key) continue;
    const existing = byAlias.get(key);
    if (!existing || getSimplicityScore(item) > getSimplicityScore(existing)) {
      byAlias.set(key, item);
    }
  }
}

/**
 * Normalizes a raw ingredient name or baseName by stripping modifiers in parentheses,
 * comma suffixes, extra whitespace, and converting to lowercase.
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  let cleaned = term.toLowerCase().trim();

  // 1. Remove parenthetical descriptions: "Zwiebel (gewürfelt)" -> "Zwiebel"
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, ' ').trim();

  // 2. Remove trailing comma modifiers: "Zwiebel, fein gewürfelt" -> "Zwiebel"
  const commaIndex = cleaned.indexOf(',');
  if (commaIndex !== -1) {
    cleaned = cleaned.slice(0, commaIndex).trim();
  }

  // 3. Remove punctuation / multiple spaces
  cleaned = cleaned.replace(/[-_.]/g, ' ').replace(/[()[\]{},;:"'!?]/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Normalizes unit strings into standardized keys for portion weight calculation.
 */
export function normalizeUnit(rawUnit?: string): string {
  if (!rawUnit) return 'piece';
  const u = rawUnit.toLowerCase().trim().replace(/\.$/, '');

  if (['g', 'gram', 'grams', 'gramm'].includes(u)) return 'g';
  if (['kg', 'kilogram', 'kilograms', 'kilogramm'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'milliliters', 'millilitre'].includes(u)) return 'ml';
  if (['l', 'liter', 'liters', 'litre'].includes(u)) return 'l';
  if (['el', 'tbsp', 'tablespoon', 'tablespoons', 'essloeffel', 'esslöffel'].includes(u)) return 'tablespoon';
  if (['tl', 'tsp', 'teaspoon', 'teaspoons', 'teeloeffel', 'teelöffel'].includes(u)) return 'teaspoon';
  if (['cup', 'cups', 'tasse', 'tassen'].includes(u)) return 'cup';
  if (['zehe', 'zehen', 'clove', 'cloves'].includes(u)) return 'clove';
  if (['stk', 'stk.', 'stueck', 'stück', 'stuecke', 'stücke', 'piece', 'pieces', 'einheit', 'knolle'].includes(u)) return 'piece';
  if (['prise', 'prisen', 'pinch', 'pinches', 'messerspitze', 'msp'].includes(u)) return 'pinch';
  if (['scheibe', 'scheiben', 'slice', 'slices'].includes(u)) return 'slice';
  if (['dose', 'dosen', 'can', 'cans', 'tin', 'tins'].includes(u)) return 'can';
  if (['bund', 'bunch', 'bunches', 'strauss', 'strauß'].includes(u)) return 'bunch';
  if (['handvoll', 'handful'].includes(u)) return 'handful';

  return u;
}

function isWordMatch(text: string, word: string): boolean {
  if (!text || !word) return false;
  if (text === word) return true;

  const textTokens = text.split(/\s+/).filter(t => t.length > 0 && !GENERIC_STOP_WORDS.has(t));
  const wordTokens = word.split(/\s+/).filter(t => t.length > 0 && !GENERIC_STOP_WORDS.has(t));

  if (textTokens.length === 0 || wordTokens.length === 0) return false;

  if (wordTokens.length === 1 && textTokens.includes(wordTokens[0])) {
    return true;
  }

  if (wordTokens.length > 1 && wordTokens.every(wt => textTokens.includes(wt))) {
    return true;
  }

  // Stem / Plural matching (only from start of word, min 4 chars)
  for (const tt of textTokens) {
    for (const wt of wordTokens) {
      if (wt.length >= 4 && tt.length >= 4 && (tt.startsWith(wt) || wt.startsWith(tt)) && Math.abs(tt.length - wt.length) <= 4) {
        return true;
      }
    }
  }

  return false;
}

const GENERIC_STOP_WORDS = new Set([
  'sauce',
  'soße',
  'sosse',
  'gericht',
  'salat',
  'drink',
  'suppe',
  'pulver',
  'nature',
  'plain',
  'extrakt',
  'zubereitet',
  'geheim',
  'secret',
  'exotic',
  'unbekannt',
]);

/**
 * Finds a matching canonical ingredient using a high-precision multi-stage lookup:
 * 1. Exact baseName / rawName O(1) index check
 * 2. Precision-scored word-boundary alias matching preferring simple/raw foods over composite dishes
 */
export function findCanonicalIngredient(rawName: string, baseName?: string): CanonicalIngredient | null {
  const normBase = baseName ? normalizeSearchTerm(baseName) : '';
  const normRaw = normalizeSearchTerm(rawName);
  const queryCombined = `${normRaw} ${normBase}`.toLowerCase();
  const wantsMager = queryCombined.includes('mager') || queryCombined.includes('lean') || queryCombined.includes('light') || queryCombined.includes('low fat');

  // Stage 1: Exact specific rawName check (prioritize specific "magerquark" over generic "quark")
  if (normRaw && !GENERIC_STOP_WORDS.has(normRaw)) {
    const directRaw = byAlias.get(normRaw) || byId.get(normRaw) || byNameDe.get(normRaw) || byNameEn.get(normRaw);
    if (directRaw) return directRaw;
  }

  // Stage 1b: Exact baseName check (if not specifically requesting a modifier variant)
  if (normBase && !GENERIC_STOP_WORDS.has(normBase) && !wantsMager) {
    const directBase = byAlias.get(normBase) || byId.get(normBase) || byNameEn.get(normBase) || byNameDe.get(normBase);
    if (directBase) return directBase;
  }

  // Stage 2: Precision scoring over all items
  const candidates: { item: CanonicalIngredient; score: number }[] = [];

  for (const item of CANONICAL_INGREDIENTS) {
    const itemNameDe = (item.name_de || '').toLowerCase();
    const itemNameEn = (item.name_en || '').toLowerCase();

    const isCompositeDish =
      itemNameDe.includes('salat mit') ||
      itemNameDe.includes('gericht') ||
      itemNameDe.includes('zubereitet') ||
      itemNameDe.includes('burger mit') ||
      itemNameDe.includes('teig mit') ||
      itemNameDe.includes('sauce mit') ||
      itemNameDe.includes('ohne ei') ||
      itemNameDe.includes('cordon bleu');

    for (const alias of item.aliases) {
      const aliasNorm = normalizeSearchTerm(alias);
      if (!aliasNorm || aliasNorm.length < 2) continue;
      if (GENERIC_STOP_WORDS.has(aliasNorm)) continue; // Never match purely on generic word like 'sauce'

      let matchScore = 0;

      if (normBase && aliasNorm === normBase) {
        matchScore = 500 + aliasNorm.length * 10;
      } else if (normRaw && aliasNorm === normRaw) {
        matchScore = 500 + aliasNorm.length * 10;
      } else if (normRaw && isWordMatch(normRaw, aliasNorm)) {
        matchScore = 200 + aliasNorm.length * 8;
      } else if (normBase && isWordMatch(normBase, aliasNorm)) {
        matchScore = 180 + aliasNorm.length * 8;
      }

      if (matchScore > 0) {
        matchScore += getSimplicityScore(item);

        if (wantsMager) {
          if (itemNameDe.includes('mager') || itemNameEn.includes('lean') || itemNameEn.includes('low fat') || itemNameDe.includes('0.2%')) {
            matchScore += 80;
          } else if (itemNameDe.includes('rahm') || itemNameDe.includes('40%') || itemNameDe.includes('doppelrahm')) {
            matchScore -= 80;
          }
        }

        if (isCompositeDish) {
          matchScore -= 120;
        }
        candidates.push({ item, score: matchScore });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0].score >= 150) {
      return candidates[0].item;
    }
  }

  return null;
}

/**
 * Calculates the total weight in grams for a given amount, unit, and matched ingredient.
 */
export function calculateWeightGrams(amount: number, unit: string, item: CanonicalIngredient | null): number {
  if (amount <= 0) return 0;
  const normUnit = normalizeUnit(unit);

  // 1. Direct weight / volume
  if (normUnit === 'g') return amount;
  if (normUnit === 'kg') return amount * 1000;
  if (normUnit === 'ml') return amount;
  if (normUnit === 'l') return amount * 1000;

  // 2. Specific standard unit weights for this ingredient
  if (item?.standard_units) {
    const std = item.standard_units as Record<string, number | undefined>;
    if (std[normUnit] !== undefined && std[normUnit]! > 0) {
      return amount * std[normUnit]!;
    }
  }

  // 3. Global default fallbacks by unit
  const globalDefaults: Record<string, number> = {
    tablespoon: 15,
    teaspoon: 5,
    cup: 200,
    clove: 4,
    piece: 100,
    pinch: 0.5,
    slice: 30,
    can: 400,
    bunch: 25,
    handful: 30,
  };

  if (globalDefaults[normUnit] !== undefined) {
    return amount * globalDefaults[normUnit];
  }

  // 4. Default: assume 100g per piece/unit if completely unknown
  return amount * 100;
}

/**
 * Matches and enriches a single ingredient.
 * If a canonical match is found, updates the nutrients based on the 100g reference values.
 * If unmatched, keeps the AI estimated values as a safe fallback.
 */
export function matchAndEnrichIngredient(ingredient: Ingredient): {
  matched: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  const match = findCanonicalIngredient(ingredient.name, ingredient.baseName);

  if (!match) {
    ingredient.isVerified = false;
    return {
      matched: false,
      calories: ingredient.calories ?? 0,
      protein: ingredient.protein ?? 0,
      carbs: ingredient.carbs ?? 0,
      fat: ingredient.fat ?? 0,
    };
  }

  const weightGrams = calculateWeightGrams(ingredient.amount, ingredient.unit, match);
  const factor = weightGrams / 100;

  const cal = Math.round(match.nutrients_per_100g.calories * factor);
  const prot = Math.round(match.nutrients_per_100g.protein * factor * 10) / 10;
  const carb = Math.round(match.nutrients_per_100g.carbs * factor * 10) / 10;
  const fat = Math.round(match.nutrients_per_100g.fat * factor * 10) / 10;

  ingredient.canonicalId = match.id;
  ingredient.matchedName = match.name_de;
  ingredient.isVerified = true;
  ingredient.calories = cal;
  ingredient.protein = prot;
  ingredient.carbs = carb;
  ingredient.fat = fat;

  if (!ingredient.category || ingredient.category === 'OTHER') {
    ingredient.category = match.category;
  }

  return { matched: true, calories: cal, protein: prot, carbs: carb, fat };
}

/**
 * Enriches all ingredients in a recipe with canonical nutritional data and
 * computes the recipe-level nutritional values per serving (if not explicitly given).
 */
export function enrichRecipeWithCanonicalIngredients(recipe: Recipe): void {
  if (!recipe || !recipe.ingredients) return;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matchedCount = 0;
  let totalIngredients = 0;

  for (const group of recipe.ingredients) {
    if (!group.items) continue;
    for (const ing of group.items) {
      totalIngredients++;
      const result = matchAndEnrichIngredient(ing);
      if (result.matched) {
        matchedCount++;
      }
      totalCalories += result.calories;
      totalProtein += result.protein;
      totalCarbs += result.carbs;
      totalFat += result.fat;
    }
  }

  const servings = recipe.servings > 0 ? recipe.servings : 1;

  // If recipe has no explicit nutritional values or they are all 0, calculate them from the ingredient sum
  if (
    !recipe.nutritionalValues ||
    (recipe.nutritionalValues.calories === 0 &&
      recipe.nutritionalValues.protein === 0 &&
      recipe.nutritionalValues.carbs === 0 &&
      recipe.nutritionalValues.fat === 0)
  ) {
    recipe.nutritionalValues = {
      calories: Math.round(totalCalories / servings),
      protein: Math.round((totalProtein / servings) * 10) / 10,
      carbs: Math.round((totalCarbs / servings) * 10) / 10,
      fat: Math.round((totalFat / servings) * 10) / 10,
    };
  }
}
