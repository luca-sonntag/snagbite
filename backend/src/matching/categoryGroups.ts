/**
 * Major supermarket category grouping and compatibility utilities
 * for safe mapping store lookups and ingredient classification.
 */

export const CATEGORY_GROUPS: Record<string, string> = {
  // Produce / Fruits / Vegetables
  PRODUCE: 'PRODUCE',
  FRUITS_VEGETABLES: 'PRODUCE',
  VEGETABLES: 'PRODUCE',
  FRUITS: 'PRODUCE',
  OBST: 'PRODUCE',
  GEMÜSE: 'PRODUCE',
  'OBST & GEMÜSE': 'PRODUCE',
  'OBST UND GEMÜSE': 'PRODUCE',
  'GEMÜSE, PILZE & SALATE': 'PRODUCE',
  'OBST, FRÜCHTE & BEEREN': 'PRODUCE',
  FRÜCHTE: 'PRODUCE',
  'FRUITS & BERRIES': 'PRODUCE',
  'VEGETABLES & MUSHROOMS': 'PRODUCE',

  // Nuts & Seeds
  NUTS_SEEDS: 'NUTS_SEEDS',
  NUTS: 'NUTS_SEEDS',
  SEEDS: 'NUTS_SEEDS',
  NÜSSE: 'NUTS_SEEDS',
  'NÜSSE & SAMEN': 'NUTS_SEEDS',

  // Spices / Herbs / Seasonings / Oils
  SPICES_SEASONINGS: 'SPICES',
  SPICES_HERBS: 'SPICES',
  SPICES_OILS: 'SPICES',
  SPICES: 'SPICES',
  GEWÜRZE: 'SPICES',
  'GEWÜRZE & ÖLE': 'SPICES',
  OILS_CONDIMENTS: 'SPICES',
  OILS: 'SPICES',
  ÖLE: 'SPICES',

  // Dairy & Eggs
  DAIRY: 'DAIRY',
  DAIRY_EGGS: 'DAIRY',
  MOLKEREIPRODUKTE: 'DAIRY',
  MILCHPRODUKTE: 'DAIRY',
  KÄSE: 'DAIRY',
  CHEESE: 'DAIRY',

  // Meat & Fish & Seafood
  MEAT_FISH: 'MEAT_FISH',
  MEAT_POULTRY: 'MEAT_FISH',
  SEAFOOD: 'MEAT_FISH',
  MEAT: 'MEAT_FISH',
  FISH: 'MEAT_FISH',
  FLEISCH: 'MEAT_FISH',
  FISCH: 'MEAT_FISH',
  'FLEISCH & FISCH': 'MEAT_FISH',

  // Grains & Pasta & Bakery
  GRAINS_PASTA: 'GRAINS',
  GRAINS_BAKERY: 'GRAINS',
  GRAINS: 'GRAINS',
  PASTA: 'GRAINS',
  GETREIDE: 'GRAINS',
  NUDELN: 'GRAINS',
  BREAD: 'GRAINS',
  BROT: 'GRAINS',
  BACKWAREN: 'GRAINS',
  BREAD_BAKERY: 'GRAINS',

  // Baking & Pantry
  BAKING_COOKING: 'BAKING',
  PANTRY_BAKING: 'BAKING',
  BACKEN: 'BAKING',
  BACKZUTATEN: 'BAKING',
  BAKING: 'BAKING',

  // Sweets & Snacks
  SWEETS_SNACKS: 'SWEETS',
  SWEETS: 'SWEETS',
  SNACKS: 'SWEETS',
  SÜSSWAREN: 'SWEETS',

  // Beverages
  BEVERAGES: 'BEVERAGES',
  GETRÄNKE: 'BEVERAGES',
  DRINKS: 'BEVERAGES',

  // Canned & Preserved
  CANNED_PRESERVED: 'CANNED',
  CANNED: 'CANNED',
  KONSERVEN: 'CANNED',
};

export function getMajorCategoryGroup(cat?: string | null): string {
  if (!cat) return '';
  const upper = cat.toUpperCase().trim();
  return CATEGORY_GROUPS[upper] || upper;
}

export function areCategoriesCompatible(catA?: string | null, catB?: string | null): boolean {
  if (!catA || !catB) return true;
  const upperA = catA.toUpperCase().trim();
  const upperB = catB.toUpperCase().trim();
  if (upperA === upperB) return true;
  const groupA = getMajorCategoryGroup(upperA);
  const groupB = getMajorCategoryGroup(upperB);
  if (!groupA || !groupB) return true;
  return groupA === groupB;
}

export const RECIPE_CATEGORY_KEYS = [
  'VEGETABLES',
  'FRUITS',
  'DAIRY_EGGS',
  'MEAT_POULTRY',
  'SEAFOOD',
  'GRAINS_PASTA',
  'OILS_CONDIMENTS',
  'SPICES_HERBS',
  'NUTS_SEEDS',
  'SWEETS_SNACKS',
  'BEVERAGES',
  'PANTRY_BAKING',
  'PREPARED_DISHES',
  'FROZEN',
  'OTHER',
] as const;

export type RecipeCategoryKey = (typeof RECIPE_CATEGORY_KEYS)[number];

const LEGACY_CATEGORY_FALLBACKS: Record<string, RecipeCategoryKey> = {
  PRODUCE: 'VEGETABLES',
  FRUITS_VEGETABLES: 'VEGETABLES',
  GEMÜSE: 'VEGETABLES',
  'OBST & GEMÜSE': 'VEGETABLES',
  'OBST UND GEMÜSE': 'VEGETABLES',
  'GEMÜSE, PILZE & SALATE': 'VEGETABLES',
  'VEGETABLES & MUSHROOMS': 'VEGETABLES',
  OBST: 'FRUITS',
  FRUIT: 'FRUITS',
  FRÜCHTE: 'FRUITS',
  'OBST & FRÜCHTE': 'FRUITS',
  'OBST, FRÜCHTE & BEEREN': 'FRUITS',
  'FRUITS & BERRIES': 'FRUITS',
  NUTS: 'NUTS_SEEDS',
  SEEDS: 'NUTS_SEEDS',
  NÜSSE: 'NUTS_SEEDS',
  'NÜSSE & SAMEN': 'NUTS_SEEDS',
  DAIRY: 'DAIRY_EGGS',
  MILCHPRODUKTE: 'DAIRY_EGGS',
  KÄSE: 'DAIRY_EGGS',
  CHEESE: 'DAIRY_EGGS',
  MEAT: 'MEAT_POULTRY',
  MEAT_FISH: 'MEAT_POULTRY',
  FLEISCH: 'MEAT_POULTRY',
  FISH: 'SEAFOOD',
  FISCH: 'SEAFOOD',
  SPICES_SEASONINGS: 'SPICES_HERBS',
  SPICES_OILS: 'SPICES_HERBS',
  SPICES: 'SPICES_HERBS',
  GEWÜRZE: 'SPICES_HERBS',
  ÖLE: 'OILS_CONDIMENTS',
  OILS: 'OILS_CONDIMENTS',
  CONDIMENTS: 'OILS_CONDIMENTS',
  BACKEN: 'PANTRY_BAKING',
  BAKING: 'PANTRY_BAKING',
  PANTRY: 'PANTRY_BAKING',
  SUPPLEMENTS: 'PANTRY_BAKING',
  SUPPLEMENT: 'PANTRY_BAKING',
  PROTEIN: 'PANTRY_BAKING',
  GETRÄNKE: 'BEVERAGES',
  DRINKS: 'BEVERAGES',
  SÜSSWAREN: 'SWEETS_SNACKS',
  SNACKS: 'SWEETS_SNACKS',
};

export function normalizeToCategoryKey(cat?: string | null): RecipeCategoryKey {
  if (!cat) return 'OTHER';
  const upper = cat.toUpperCase().trim();
  if ((RECIPE_CATEGORY_KEYS as readonly string[]).includes(upper)) {
    return upper as RecipeCategoryKey;
  }
  return LEGACY_CATEGORY_FALLBACKS[upper] || 'OTHER';
}

export function placeIngredientInGroup<T extends { category?: string; name: string }>(
  groups: Array<{ name: string; items: T[] }>,
  item: T,
  targetCategory: string
): void {
  const normCat = normalizeToCategoryKey(targetCategory);
  item.category = normCat;

  let targetGroup = groups.find((g) => normalizeToCategoryKey(g.name) === normCat);
  if (!targetGroup) {
    if (groups.length === 1 && groups[0].name.toLowerCase() === 'zutaten') {
      targetGroup = groups[0];
    } else {
      targetGroup = { name: normCat, items: [] };
      groups.push(targetGroup);
    }
  }
  targetGroup.items.push(item);
}
