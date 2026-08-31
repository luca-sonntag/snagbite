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

/**
 * Calculates a standard expiration date string 'YYYY-MM-DD' from now + shelfDays,
 * safely avoiding midnight timezone shift bugs.
 */
export function calculateExpiresAtDate(shelfDays: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + shelfDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates remaining whole days until expiration from an ISO/date string,
 * avoiding timezone offset and boundary truncation issues.
 */
export function getDaysRemaining(expiresAt?: string | null, fromDate: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const datePart = expiresAt.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  const [expYear, expMonth, expDay] = parts;
  const fromYear = fromDate.getFullYear();
  const fromMonth = fromDate.getMonth();
  const fromDay = fromDate.getDate();

  // Compare calendar days using UTC midnight representation of date components
  const expUtc = Date.UTC(expYear, expMonth - 1, expDay);
  const fromUtc = Date.UTC(fromYear, fromMonth, fromDay);

  const diffMs = expUtc - fromUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

