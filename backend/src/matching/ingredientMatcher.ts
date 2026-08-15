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
  if (de.includes('nature') || en.includes('plain') || en.includes('unsalted') || de.includes('trocken') || en.includes('dry')) score += 20;
  if (
    de.includes('mit ') ||
    de.includes('gefüllt') ||
    en.includes('filled') ||
    de.includes('zubereitet') ||
    de.includes('gericht') ||
    de.includes('salat') ||
    de.includes('teig') ||
    de.includes('sauce') ||
    de.includes('burger')
  ) {
    score -= 60;
  }
  return score;
}

// Allowed / natural adjacent category pairs (distance = 0)
const COMPATIBLE_CATEGORY_PAIRS = new Set([
  'GRAINS_PASTA:PANTRY_BAKING',
  'PANTRY_BAKING:GRAINS_PASTA',
  'DAIRY_EGGS:OILS_CONDIMENTS',
  'OILS_CONDIMENTS:DAIRY_EGGS',
  'SWEETS_SNACKS:PANTRY_BAKING',
  'PANTRY_BAKING:SWEETS_SNACKS',
  'SWEETS_SNACKS:DAIRY_EGGS',
  'DAIRY_EGGS:SWEETS_SNACKS',
]);

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

const GENERIC_FOOD_FORMS = new Set([
  'pulver',
  'powder',
  'paste',
  'sauce',
  'soße',
  'sosse',
  'salat',
  'salad',
  'suppe',
  'soup',
  'drink',
  'sirup',
  'syrup',
  'extrakt',
  'extract',
  'gericht',
  'dish',
  'burger',
  'mix',
  'gewürz',
  'seasoning',
  'zubereitung',
  'chips',
  'chunks',
  'flocken',
  'flakes',
  'stuecke',
  'stücke',
]);

/**
 * Checks whether candidate tokens match the query tokens with head-noun validation.
 * In culinary names (DE & EN), matching ONLY a generic food form (e.g. "powder", "paste", "sauce")
 * without the qualifying ingredient noun (e.g. "baking" vs "chocolate", "tomato" vs "wasabi")
 * is strictly rejected.
 */
function isGenericTokenMatch(queryTokens: string[], candidateTokens: string[]): { matched: boolean; score: number } {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return { matched: false, score: 0 };

  const queryStr = queryTokens.join(' ');
  const candStr = candidateTokens.join(' ');

  // Exact match
  if (queryStr === candStr) return { matched: true, score: 500 };

  // Token-by-token comparison with word-boundary and substantive noun awareness
  let matchedTokens = 0;
  let nonGenericMatchedTokens = 0;

  for (const qt of queryTokens) {
    if (qt.length < 2) continue;
    for (const ct of candidateTokens) {
      if (ct.length < 2) continue;

      let isMatch = false;
      let matchedWord = '';

      if (qt === ct) {
        isMatch = true;
        matchedWord = qt;
      } else if (qt.length >= 4 && ct.length >= 4 && (qt.startsWith(ct) || ct.startsWith(qt)) && Math.abs(qt.length - ct.length) <= 3) {
        // Stem / Plural / Prefix match
        isMatch = true;
        matchedWord = qt;
      } else if (qt.length >= 6 && ct.length >= 4 && qt.endsWith(ct) && !GENERIC_FOOD_FORMS.has(ct)) {
        // Compound word head match (e.g. "kirschtomaten" -> ends with "tomaten")
        // Exclude generic suffixes like "backpulver" ending with "pulver"
        isMatch = true;
        matchedWord = ct;
      }

      if (isMatch) {
        matchedTokens++;
        if (!GENERIC_FOOD_FORMS.has(matchedWord.toLowerCase()) && !GENERIC_STOP_WORDS.has(matchedWord.toLowerCase())) {
          nonGenericMatchedTokens++;
        }
        break;
      }
    }
  }

  // Reject if the only matched token is a generic container/form (e.g. only 'powder' or only 'paste')
  if (nonGenericMatchedTokens === 0) {
    return { matched: false, score: 0 };
  }

  const queryHead = queryTokens[queryTokens.length - 1];
  const candHead = candidateTokens[candidateTokens.length - 1];
  const headMatches = queryHead === candHead ||
    (queryHead.length >= 4 && candHead.length >= 4 && (queryHead.startsWith(candHead) || candHead.startsWith(queryHead) || queryHead.endsWith(candHead)));

  // If multi-word query: require head noun match AND high token overlap (>= 50%)
  const overlapRatio = matchedTokens / queryTokens.length;

  if (queryTokens.length > 1) {
    if (headMatches && overlapRatio >= 0.5) {
      return { matched: true, score: 250 + matchedTokens * 50 };
    }
    if (overlapRatio >= 0.8) {
      return { matched: true, score: 220 + matchedTokens * 40 };
    }
    return { matched: false, score: 0 };
  }

  // Single word query:
  if (matchedTokens === 1) {
    if (queryStr === candStr) {
      return { matched: true, score: 300 + queryTokens[0].length * 10 };
    }
    if (candidateTokens.length === 1 && (queryTokens[0].startsWith(candidateTokens[0]) || candidateTokens[0].startsWith(queryTokens[0]))) {
      return { matched: true, score: 250 + queryTokens[0].length * 10 };
    }
    if (headMatches) {
      return { matched: true, score: 200 + queryTokens[0].length * 5 };
    }
  }

  return { matched: false, score: 0 };
}

/**
 * Finds a matching canonical ingredient using a high-precision multi-stage lookup:
 * 1. Exact baseName / rawName O(1) index check
 * 2. Category-scoped and precision-scored token matching preferring raw/base foods over composite dishes
 */
export function findCanonicalIngredient(rawName: string, baseName?: string, expectedCategory?: string): CanonicalIngredient | null {
  const normBase = baseName ? normalizeSearchTerm(baseName) : '';
  const normRaw = normalizeSearchTerm(rawName);
  const queryCombined = `${normRaw} ${normBase}`.toLowerCase();
  const wantsMager = queryCombined.includes('mager') || queryCombined.includes('lean') || queryCombined.includes('light') || queryCombined.includes('low fat');

  const rawTokens = normRaw.split(/\s+/).filter(t => t.length > 0 && !GENERIC_STOP_WORDS.has(t));
  const baseTokens = normBase.split(/\s+/).filter(t => t.length > 0 && !GENERIC_STOP_WORDS.has(t));

  const cleanCategory = expectedCategory ? expectedCategory.trim().toUpperCase() : undefined;

  // Stage 1: Exact specific rawName check
  if (normRaw && !GENERIC_STOP_WORDS.has(normRaw)) {
    const directRaw = byAlias.get(normRaw) || byId.get(normRaw) || byNameDe.get(normRaw) || byNameEn.get(normRaw);
    if (directRaw) {
      // If category is given and differs drastically, don't blindly accept
      if (!cleanCategory || directRaw.category === cleanCategory || cleanCategory === 'OTHER') {
        return directRaw;
      }
    }
  }

  // Stage 1b: Exact baseName check
  if (normBase && !GENERIC_STOP_WORDS.has(normBase) && !wantsMager) {
    const directBase = byAlias.get(normBase) || byId.get(normBase) || byNameEn.get(normBase) || byNameDe.get(normBase);
    if (directBase) {
      if (!cleanCategory || directBase.category === cleanCategory || cleanCategory === 'OTHER') {
        return directBase;
      }
    }
  }

  // Stage 2: Precision scoring across all canonical items
  const candidates: { item: CanonicalIngredient; score: number }[] = [];

  for (const item of CANONICAL_INGREDIENTS) {
    const itemNameDe = (item.name_de || '').toLowerCase();
    const itemNameEn = (item.name_en || '').toLowerCase();

    for (const alias of item.aliases) {
      const aliasNorm = normalizeSearchTerm(alias);
      if (!aliasNorm || aliasNorm.length < 2) continue;
      if (GENERIC_STOP_WORDS.has(aliasNorm)) continue;

      const aliasTokens = aliasNorm.split(/\s+/).filter(t => t.length > 0 && !GENERIC_STOP_WORDS.has(t));
      if (aliasTokens.length === 0) continue;

      let matchScore = 0;

      if (normBase && aliasNorm === normBase) {
        matchScore = 500 + aliasNorm.length * 10;
      } else if (normRaw && aliasNorm === normRaw) {
        matchScore = 500 + aliasNorm.length * 10;
      } else {
        const rawRes = isGenericTokenMatch(rawTokens, aliasTokens);
        const baseRes = isGenericTokenMatch(baseTokens, aliasTokens);

        if (rawRes.matched && rawRes.score > matchScore) {
          matchScore = rawRes.score;
        }
        if (baseRes.matched && baseRes.score > matchScore) {
          matchScore = baseRes.score;
        }
      }

      if (matchScore > 0) {
        matchScore += getSimplicityScore(item);

        // 1. Category-aware weighting
        if (cleanCategory && cleanCategory !== 'OTHER') {
          if (item.category === cleanCategory) {
            matchScore += 150; // High confidence boost for matching department
          } else if (item.category === 'PREPARED_DISHES') {
            matchScore -= 250; // Strong penalty: Never match raw ingredient to a prepared meal
          } else if (COMPATIBLE_CATEGORY_PAIRS.has(`${cleanCategory}:${item.category}`)) {
            matchScore -= 20; // Mild adjustment for naturally adjacent categories
          } else {
            matchScore -= 350; // Strict penalty for disjoint category mismatches
          }
        } else {
          // If no recipe category given, still heavily penalize prepared dishes
          if (item.category === 'PREPARED_DISHES') {
            matchScore -= 200;
          }
        }

        // 2. Specificity (mager / low fat)
        if (wantsMager) {
          if (itemNameDe.includes('mager') || itemNameEn.includes('lean') || itemNameEn.includes('low fat') || itemNameDe.includes('0.2%')) {
            matchScore += 80;
          } else if (itemNameDe.includes('rahm') || itemNameDe.includes('40%') || itemNameDe.includes('doppelrahm')) {
            matchScore -= 80;
          }
        }

        candidates.push({ item, score: matchScore });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    // Threshold for accepting match: >= 200 ensures strong verified match
    if (candidates[0].score >= 200) {
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
export function matchAndEnrichIngredient(ingredient: Ingredient, groupCategory?: string): {
  matched: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  const effectiveCategory = ingredient.category || groupCategory;
  const match = findCanonicalIngredient(ingredient.name, ingredient.baseName, effectiveCategory);

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
      const result = matchAndEnrichIngredient(ing, group.name);
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
