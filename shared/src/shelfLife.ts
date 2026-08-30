/**
 * Category-based shelf life defaults in days for pantry items and grocery tracking.
 */
export const CATEGORY_SHELF_LIFE_DAYS: Record<string, number> = {
  VEGETABLES: 7,
  FRUITS: 7,
  DAIRY_EGGS: 14,
  MEAT_POULTRY: 4,
  SEAFOOD: 3,
  GRAINS_PASTA: 180,
  OILS_CONDIMENTS: 180,
  SPICES_HERBS: 365,
  NUTS_SEEDS: 180,
  SWEETS_SNACKS: 90,
  BEVERAGES: 60,
  PANTRY_BAKING: 180,
  PREPARED_DISHES: 7,
  FROZEN: 180,
  OTHER: 14,
};

/**
 * Returns a smart default shelf life in days based on the ingredient category and name.
 */
export function getDefaultShelfLifeDays(
  category?: string | null,
  nameOrBaseName?: string | null
): number {
  const normCat = (category || '').toUpperCase().trim();

  // Special bakery case inside grains/pasta or general produce
  if (nameOrBaseName) {
    const lower = nameOrBaseName.toLowerCase().trim();
    if (
      lower.includes('brot') ||
      lower.includes('bread') ||
      lower.includes('toast') ||
      lower.includes('brötchen') ||
      lower.includes('baguette') ||
      lower.includes('croissant')
    ) {
      return 6;
    }
  }

  if (normCat && CATEGORY_SHELF_LIFE_DAYS[normCat] !== undefined) {
    return CATEGORY_SHELF_LIFE_DAYS[normCat];
  }

  return 14;
}
