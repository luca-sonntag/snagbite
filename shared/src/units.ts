/**
 * Authoritative culinary measurement unit normalizer.
 * Maps localized German and English units to canonical standard keys.
 */
export function normalizeUnit(unit?: string | null): string {
  if (!unit) return 'piece';
  const u = unit.toLowerCase().trim();
  if (['g', 'gramm', 'grams', 'gram', 'gr', 'g.'].includes(u)) return 'g';
  if (['kg', 'kilogramm', 'kilograms', 'kilo'].includes(u)) return 'kg';
  if (['mg', 'milligramm', 'milligram', 'milligrams'].includes(u)) return 'mg';
  if (['ml', 'milliliter', 'milliliters'].includes(u)) return 'ml';
  if (['cl', 'centiliter', 'centilitre', 'cl.'].includes(u)) return 'cl';
  if (['dl', 'deziliter', 'deciliter', 'decilitre', 'dl.'].includes(u)) return 'dl';
  if (['l', 'liter', 'liters', 'ltr'].includes(u)) return 'l';
  if (['el', 'esslöffel', 'tbsp', 'tablespoon', 'tablespoons'].includes(u)) return 'tablespoon';
  if (['tl', 'teelöffel', 'tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'teaspoon';
  if (['stk', 'stück', 'stueck', 'piece', 'pieces', 'pc', 'pcs', 'x'].includes(u)) return 'piece';
  if (['scheibe', 'scheiben', 'slice', 'slices'].includes(u)) return 'slice';
  if (
    [
      'packung',
      'packungen',
      'pkg',
      'pack',
      'packs',
      'package',
      'packages',
      'pck',
      'pckg',
      'päckchen',
      'paeckchen',
      'beutel',
    ].includes(u)
  )
    return 'pack';
  if (['dose', 'dosen', 'can', 'cans', 'tin'].includes(u)) return 'can';
  if (['glas', 'gläser', 'glaeser', 'jar', 'jars'].includes(u)) return 'jar';
  if (['becher', 'tub', 'tubs'].includes(u)) return 'cup';
  if (['tasse', 'tassen', 'cup', 'cups'].includes(u)) return 'cup';
  if (['bund', 'bunch', 'bunches'].includes(u)) return 'bunch';
  if (['prise', 'prisen', 'pinch', 'pinches', 'msp', 'msp.', 'messerspitze'].includes(u)) return 'pinch';
  if (['spritzer', 'schuss', 'dash', 'splash', 'tropfen', 'drops'].includes(u)) return 'dash';
  if (['zehe', 'zehen', 'clove', 'cloves'].includes(u)) return 'clove';
  if (['handvoll', 'handful'].includes(u)) return 'handful';
  if (['blatt', 'blätter', 'sheet', 'sheets', 'leaf', 'leaves'].includes(u)) return 'leaf';
  if (['kopf', 'köpfe', 'head', 'heads'].includes(u)) return 'head';
  if (['stange', 'stangen', 'stalk', 'stalks'].includes(u)) return 'stalk';
  if (['knolle', 'knollen', 'bulb', 'bulbs'].includes(u)) return 'bulb';
  if (['zweig', 'zweige', 'sprig', 'sprigs'].includes(u)) return 'sprig';
  if (['oz', 'ounce', 'ounces'].includes(u)) return 'oz';
  if (['fl oz', 'fl. oz.', 'fluid ounce', 'fluid ounces', 'floz'].includes(u)) return 'fl_oz';
  if (['lb', 'lbs', 'pound', 'pounds', 'pfund'].includes(u)) return 'lb';
  return 'piece';
}

/**
 * Converts a known culinary quantity to base metric unit (grams for mass, ml for volume, count for pieces).
 */
export function convertToBaseMetric(amount: number, unit?: string | null): { value: number; type: 'mass' | 'volume' | 'count' } | null {
  if (amount == null || isNaN(amount)) return null;
  const canonical = normalizeUnit(unit);

  // Mass (base in grams)
  if (canonical === 'g') return { value: amount, type: 'mass' };
  if (canonical === 'kg') return { value: amount * 1000, type: 'mass' };
  if (canonical === 'mg') return { value: amount * 0.001, type: 'mass' };
  if (canonical === 'oz') return { value: amount * 28.3495, type: 'mass' };
  if (canonical === 'lb') return { value: amount * 453.592, type: 'mass' };

  // Volume (base in ml)
  if (canonical === 'ml') return { value: amount, type: 'volume' };
  if (canonical === 'l') return { value: amount * 1000, type: 'volume' };
  if (canonical === 'cl') return { value: amount * 10, type: 'volume' };
  if (canonical === 'dl') return { value: amount * 100, type: 'volume' };
  if (canonical === 'fl_oz') return { value: amount * 29.5735, type: 'volume' };
  if (canonical === 'tablespoon') return { value: amount * 15, type: 'volume' };
  if (canonical === 'teaspoon') return { value: amount * 5, type: 'volume' };

  // Count / pieces
  if (['piece', 'slice', 'clove', 'leaf', 'head', 'stalk', 'bulb', 'sprig', 'pack', 'can', 'jar', 'cup', 'bunch'].includes(canonical)) {
    return { value: amount, type: 'count' };
  }

  return null;
}

/**
 * Evaluates whether an available pantry stock amount covers the required recipe quantity.
 * Supports cross-unit conversions (e.g. 1 kg covers 200 g, 250 ml covers 1 tbsp, etc.).
 */
export function isPantryStockSufficient(
  stockAmount: number,
  stockUnit?: string | null,
  requiredAmount?: number | null,
  requiredUnit?: string | null
): boolean {
  if (stockAmount <= 0) return false;
  if (requiredAmount == null || requiredAmount <= 0) return true;

  const stockBase = convertToBaseMetric(stockAmount, stockUnit);
  const reqBase = convertToBaseMetric(requiredAmount, requiredUnit);

  if (stockBase && reqBase && stockBase.type === reqBase.type) {
    return stockBase.value >= reqBase.value;
  }

  // Cross-metric fallback: 1 g ~= 1 ml for culinary liquids
  if (
    stockBase &&
    reqBase &&
    ((stockBase.type === 'mass' && reqBase.type === 'volume') ||
      (stockBase.type === 'volume' && reqBase.type === 'mass'))
  ) {
    return stockBase.value >= reqBase.value;
  }

  const canonStock = normalizeUnit(stockUnit);
  const canonReq = normalizeUnit(requiredUnit);

  if (canonStock === canonReq) {
    return stockAmount >= requiredAmount;
  }

  return true;
}

export type PantryStockStatus = 'sufficient' | 'low' | 'deficit';

/**
 * Calculates the available pantry stock coverage ratio compared to the recipe's requirement.
 * Returns e.g. 1.25 for 125%, 0.75 for 75%, 0.25 for 25%.
 */
export function getPantryStockRatio(
  stockAmount: number,
  stockUnit?: string | null,
  requiredAmount?: number | null,
  requiredUnit?: string | null
): number | null {
  if (stockAmount <= 0) return 0;
  if (requiredAmount == null || requiredAmount <= 0) return 1;

  const stockBase = convertToBaseMetric(stockAmount, stockUnit);
  const reqBase = convertToBaseMetric(requiredAmount, requiredUnit);

  if (stockBase && reqBase && stockBase.type === reqBase.type) {
    return stockBase.value / reqBase.value;
  }

  // Cross-metric fallback: 1 g ~= 1 ml for culinary liquids
  if (
    stockBase &&
    reqBase &&
    ((stockBase.type === 'mass' && reqBase.type === 'volume') ||
      (stockBase.type === 'volume' && reqBase.type === 'mass'))
  ) {
    return stockBase.value / reqBase.value;
  }

  const canonStock = normalizeUnit(stockUnit);
  const canonReq = normalizeUnit(requiredUnit);

  if (canonStock === canonReq) {
    return stockAmount / requiredAmount;
  }

  return null;
}

/**
 * Categorizes pantry stock into 3 distinct visual tiers:
 * - 'sufficient': >= 100% available (Emerald / Green)
 * - 'low': 50% - 99% available (Amber / Orange - should be reviewed)
 * - 'deficit': < 50% available (Rose / Red - clearly insufficient)
 */
export function getPantryStockStatus(
  stockAmount: number,
  stockUnit?: string | null,
  requiredAmount?: number | null,
  requiredUnit?: string | null
): PantryStockStatus {
  const ratio = getPantryStockRatio(stockAmount, stockUnit, requiredAmount, requiredUnit);
  if (ratio == null || ratio >= 1.0) {
    return 'sufficient';
  }
  if (ratio >= 0.5) {
    return 'low';
  }
  return 'deficit';
}
