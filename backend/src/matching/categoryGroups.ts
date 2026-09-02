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
