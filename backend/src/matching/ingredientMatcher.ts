import Fuse, { type IFuseOptions } from 'fuse.js';
import { CANONICAL_INGREDIENTS, type CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { Recipe, Ingredient, ParentIngredientInfo } from '../types.js';

// Pre-indexed lookup maps for O(1) exact matching
const byId = new Map<string, CanonicalIngredient>();
const byAlias = new Map<string, CanonicalIngredient>();
const byNameEn = new Map<string, CanonicalIngredient>();
const byNameDe = new Map<string, CanonicalIngredient>();

// Category-scoped item lists for dedicated Fuse instances
const itemsByCategory = new Map<string, CanonicalIngredient[]>();

// Simplicity score for choosing between multiple alias matches
function getSimplicityScore(item: CanonicalIngredient): number {
  const de = (item.name_de || '').toLowerCase();
  const en = (item.name_en || '').toLowerCase();
  let score = 100 - de.length; // shorter name = simpler base food
  if (de.includes('roh') || en.includes('raw')) score += 30;
  if (de.includes('nature') || de.includes('mager') || en.includes('plain') || en.includes('unsalted') || de.includes('trocken')) score += 20;
  if (
    de.includes('zubereitet') ||
    de.includes('gericht') ||
    de.includes('salat') ||
    de.includes('burger') ||
    de.includes('konserve')
  ) {
    score -= 40;
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

  const cat = item.category || 'OTHER';
  if (!itemsByCategory.has(cat)) {
    itemsByCategory.set(cat, []);
  }
  itemsByCategory.get(cat)!.push(item);
}

// Fuse options for category-scoped and global fuzzy search
const FUSE_OPTIONS: IFuseOptions<CanonicalIngredient> = {
  keys: [
    { name: 'name_de', weight: 0.60 },
    { name: 'aliases', weight: 0.35 },
    { name: 'name_en', weight: 0.05 },
  ],
  threshold: 0.20, // Strict precision to eliminate false positives
  distance: 100,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
};

const categoryFuseMap = new Map<string, Fuse<CanonicalIngredient>>();
for (const [cat, items] of itemsByCategory.entries()) {
  categoryFuseMap.set(cat, new Fuse(items, FUSE_OPTIONS));
}

const globalFuse = new Fuse(CANONICAL_INGREDIENTS, {
  ...FUSE_OPTIONS,
  threshold: 0.18, // Even stricter for cross-category global fallback
});

/**
 * Normalizes a search term or ingredient name by removing modifiers,
 * parenthetical text, and special characters.
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

  return 'piece';
}

/**
 * Standardize category strings to canonical enum format.
 */
export function normalizeCategory(category?: string): string {
  if (!category) return '';
  const c = category.toUpperCase().trim();
  const map: Record<string, string> = {
    PRODUCE: 'FRUITS_VEGETABLES',
    VEGETABLES: 'FRUITS_VEGETABLES',
    FRUITS: 'FRUITS_VEGETABLES',
    FRUITS_VEGETABLES: 'FRUITS_VEGETABLES',
    DAIRY: 'DAIRY',
    DAIRY_EGGS: 'DAIRY',
    EGGS: 'DAIRY',
    MEAT: 'MEAT_FISH',
    POULTRY: 'MEAT_FISH',
    MEAT_POULTRY: 'MEAT_FISH',
    FISH: 'MEAT_FISH',
    SEAFOOD: 'MEAT_FISH',
    FISH_SEAFOOD: 'MEAT_FISH',
    MEAT_FISH: 'MEAT_FISH',
    GRAINS: 'GRAINS_PASTA',
    PASTA: 'GRAINS_PASTA',
    GRAINS_PASTA: 'GRAINS_PASTA',
    BAKING: 'BAKING_COOKING',
    PANTRY: 'BAKING_COOKING',
    PANTRY_BAKING: 'BAKING_COOKING',
    BAKING_COOKING: 'BAKING_COOKING',
    SPICES: 'SPICES_OILS',
    OILS: 'SPICES_OILS',
    SPICES_OILS: 'SPICES_OILS',
    OILS_CONDIMENTS: 'SPICES_OILS',
    CONDIMENTS: 'SPICES_OILS',
    HERBS_SPICES: 'SPICES_OILS',
    CANNED: 'CANNED_PRESERVED',
    CANNED_GOODS: 'CANNED_PRESERVED',
    CANNED_PRESERVED: 'CANNED_PRESERVED',
    FROZEN: 'FROZEN',
    FROZEN_FOODS: 'FROZEN',
    BREAD: 'BREAD_BAKERY',
    BAKERY: 'BREAD_BAKERY',
    BREAD_BAKERY: 'BREAD_BAKERY',
    BEVERAGES: 'BEVERAGES',
    DRINKS: 'BEVERAGES',
    SWEETS: 'SWEETS_SNACKS',
    SNACKS: 'SWEETS_SNACKS',
    SWEETS_SNACKS: 'SWEETS_SNACKS',
    SNACKS_SWEETS: 'SWEETS_SNACKS',
    READY_MEALS: 'READY_MEALS',
    CONVENIENCE: 'READY_MEALS',
    PREPARED_DISHES: 'READY_MEALS',
    REFRIGERATED_CONVENIENCE: 'REFRIGERATED_CONVENIENCE',
    OTHER: 'OTHER',
  };
  return map[c] || c;
}

/**
 * Finds a matching canonical ingredient using exact map lookups and Fuse.js fuzzy matching.
 */
export function findCanonicalIngredient(
  name: string,
  baseName?: string,
  category?: string,
  synonyms?: string[],
  searchQueries?: string[],
  parentIngredient?: ParentIngredientInfo
): CanonicalIngredient | null {
  const cleanCategory = normalizeCategory(category);
  const targetFuse = cleanCategory && categoryFuseMap.has(cleanCategory) ? categoryFuseMap.get(cleanCategory)! : null;

  // 1. Parent ingredient priority (e.g. "Ei" for "Eigelb", "Zitrone" for "Zitronenabrieb")
  if (parentIngredient?.name) {
    const normParent = normalizeSearchTerm(parentIngredient.name);
    const directParent = byAlias.get(normParent) || byNameDe.get(normParent) || byId.get(normParent);
    if (directParent) {
      if (!cleanCategory || directParent.category === cleanCategory || cleanCategory === 'OTHER') {
        return directParent;
      }
    }
  }

  // 2. Build prioritized search query list
  const queriesToTest: string[] = [];

  // A. Add explicit searchQueries from Gemini
  if (searchQueries && Array.isArray(searchQueries)) {
    for (const q of searchQueries) {
      if (q && typeof q === 'string') {
        const norm = normalizeSearchTerm(q);
        if (norm && !queriesToTest.includes(norm)) queriesToTest.push(norm);
      }
    }
  }

  // B. Add baseName & name
  if (baseName) {
    const norm = normalizeSearchTerm(baseName);
    if (norm && !queriesToTest.includes(norm)) queriesToTest.push(norm);
  }
  if (name) {
    const norm = normalizeSearchTerm(name);
    if (norm && !queriesToTest.includes(norm)) queriesToTest.push(norm);
  }

  // C. Add synonyms
  if (synonyms && Array.isArray(synonyms)) {
    for (const s of synonyms) {
      if (s && typeof s === 'string') {
        const norm = normalizeSearchTerm(s);
        if (norm && !queriesToTest.includes(norm)) queriesToTest.push(norm);
      }
    }
  }

  // 3. Stage 1: Exact Map Check across all queries
  for (const q of queriesToTest) {
    const direct = byAlias.get(q) || byNameDe.get(q) || byId.get(q) || byNameEn.get(q);
    if (direct) {
      if (!cleanCategory || direct.category === cleanCategory || cleanCategory === 'OTHER') {
        return direct;
      }
    }
  }

  // 4. Stage 2: Category-Scoped Fuse.js Search
  if (targetFuse) {
    for (const q of queriesToTest) {
      if (q.length < 2) continue;
      const fuseQuery = q.length > 32 ? q.slice(0, 32) : q;
      const results = targetFuse.search(fuseQuery, { limit: 1 });
      if (results.length > 0) {
        const best = results[0];
        if (best.score !== undefined && best.score <= 0.22) {
          return best.item;
        }
      }
    }
    // Category was specified and no high-confidence match found -> clean null fallback
    return null;
  }

  // 5. Stage 3: Global Fallback Fuse.js Search (ONLY if category was unspecified or OTHER)
  if (!cleanCategory || cleanCategory === 'OTHER') {
    for (const q of queriesToTest) {
      if (q.length < 3) continue;
      const fuseQuery = q.length > 32 ? q.slice(0, 32) : q;
      const results = globalFuse.search(fuseQuery, { limit: 1 });
      if (results.length > 0) {
        const best = results[0];
        if (best.score !== undefined && best.score <= 0.18) {
          return best.item;
        }
      }
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
    clove: 3,
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
  const match = findCanonicalIngredient(
    ingredient.name,
    ingredient.baseName,
    effectiveCategory,
    ingredient.synonyms,
    ingredient.searchQueries,
    ingredient.parentIngredient
  );

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
