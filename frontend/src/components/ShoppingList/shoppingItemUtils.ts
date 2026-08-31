import type { AggregatedShoppingItem, PantryItem, ParentIngredientInfo } from '../../types';
import { normalizeFoodBaseKey } from '../../utils/ingredientTaxonomy';
import { formatQuantity } from '../../utils/formatQuantity';

export interface PantryMatchableItem {
  name: string;
  baseName?: string;
  canonicalId?: string | null;
  parentIngredient?: ParentIngredientInfo | null;
}

export interface PantryStockMatch {
  pantryItem: PantryItem;
  formattedStock: string;
  isPartial: boolean; // true if available pantry stock < required amount
}

export function normalizeUnitToBase(
  amount: number,
  unit?: string
): { value: number; type: 'mass' | 'volume' | 'count' } | null {
  if (amount == null || isNaN(amount)) return null;
  const u = (unit || '').toLowerCase().trim();
  if (!u) return null;

  // Mass in grams
  if (u === 'g' || u === 'gramm' || u === 'grams' || u === 'gram') return { value: amount, type: 'mass' };
  if (u === 'kg' || u === 'kilogramm' || u === 'kilograms' || u === 'kilo') return { value: amount * 1000, type: 'mass' };
  if (u === 'mg') return { value: amount * 0.001, type: 'mass' };

  // Volume in ml
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return { value: amount, type: 'volume' };
  if (u === 'l' || u === 'liter' || u === 'litre' || u === 'liters') return { value: amount * 1000, type: 'volume' };
  if (u === 'cl') return { value: amount * 10, type: 'volume' };
  if (u === 'dl') return { value: amount * 100, type: 'volume' };
  if (u === 'tl' || u === 'tsp' || u === 'teelöffel') return { value: amount * 5, type: 'volume' };
  if (u === 'el' || u === 'tbsp' || u === 'esslöffel') return { value: amount * 15, type: 'volume' };

  // Count / pieces
  if (
    u === 'stk' ||
    u === 'stück' ||
    u === 'stueck' ||
    u === 'piece' ||
    u === 'pieces' ||
    u === 'scheibe' ||
    u === 'scheiben' ||
    u === 'slice' ||
    u === 'slices' ||
    u === 'zehe' ||
    u === 'zehen' ||
    u === 'clove' ||
    u === 'cloves'
  ) {
    return { value: amount, type: 'count' };
  }

  return null;
}

export function findPantryStockMatch(
  item: PantryMatchableItem,
  pantryItems: PantryItem[],
  requiredAmount?: number,
  requiredUnit?: string
): PantryStockMatch | null {
  if (!pantryItems || pantryItems.length === 0) return null;
  const itemKey = normalizeFoodBaseKey(item).toLowerCase().trim();
  const rawItemName = (item.name || '').toLowerCase().trim();

  const match = pantryItems.find((p) => {
    if (p.amount <= 0) return false;
    if (item.canonicalId && p.canonicalId && item.canonicalId === p.canonicalId) return true;
    const pKey = normalizeFoodBaseKey(p).toLowerCase().trim();
    if (pKey === itemKey) return true;
    const pName = (p.name || '').toLowerCase().trim();
    if (pName === rawItemName) return true;
    return false;
  });

  if (!match || match.amount <= 0) return null;

  let isPartial = false;
  if (requiredAmount != null && requiredAmount > 0) {
    const reqNorm = normalizeUnitToBase(requiredAmount, requiredUnit);
    const stockNorm = normalizeUnitToBase(match.amount, match.unit);

    if (reqNorm && stockNorm && reqNorm.type === stockNorm.type) {
      isPartial = stockNorm.value < reqNorm.value;
    } else if ((requiredUnit || '').toLowerCase().trim() === (match.unit || '').toLowerCase().trim()) {
      isPartial = match.amount < requiredAmount;
    }
  }

  return {
    pantryItem: match,
    formattedStock: `${formatQuantity(match.amount)} ${match.unit}`.trim(),
    isPartial,
  };
}

export function findPantryStock(item: PantryMatchableItem, pantryItems: PantryItem[]): string | null {
  const match = findPantryStockMatch(item, pantryItems);
  return match ? match.formattedStock : null;
}

export function getPackageRecommendation(
  amount: number,
  unit: string,
  pkgAmount?: number | null,
  pkgUnit?: string | null
): string | null {
  if (!pkgAmount || pkgAmount <= 0) return null;
  const cleanUnit = (unit || '').toLowerCase().trim();
  const cleanPkgUnit = (pkgUnit || '').toLowerCase().trim();

  // If already in the same unit and amount matches exactly, no extra container annotation needed
  if (cleanUnit === cleanPkgUnit && amount === pkgAmount) {
    return null;
  }

  if (cleanUnit === cleanPkgUnit && amount > 0) {
    if (amount <= pkgAmount) {
      return `1 Pkg. (${pkgAmount} ${pkgUnit})`;
    }
    const count = Math.ceil(amount / pkgAmount);
    return `${count} Pkg. (${count * pkgAmount} ${pkgUnit})`;
  }

  const containerName =
    cleanPkgUnit === 'glas' || cleanPkgUnit === 'jar'
      ? '1 Glas'
      : cleanPkgUnit === 'dose' || cleanPkgUnit === 'can'
      ? '1 Dose'
      : cleanPkgUnit === 'flasche' || cleanPkgUnit === 'bottle'
      ? '1 Flasche'
      : cleanPkgUnit === 'becher' || cleanPkgUnit === 'cup'
      ? '1 Becher'
      : cleanPkgUnit === 'bund' || cleanPkgUnit === 'bunch'
      ? '1 Bund'
      : '1 Pkg.';

  const pkgUnitStr = pkgUnit ? ` (${pkgAmount} ${pkgUnit})` : ` (${pkgAmount})`;
  return `${containerName}${pkgUnitStr}`;
}

export function extractExtraNote(
  item: AggregatedShoppingItem,
  formatItemAmount: (amount: number, unit: string) => string
): string | null {
  const mainBaseName = (item.baseName || item.name || '').toLowerCase().trim();

  if (item.subItems && item.subItems.length > 0) {
    const notes: string[] = [];
    const modifierAmounts = new Map<string, { totalAmount: number; unit: string; mod: string }>();

    for (const sub of item.subItems) {
      const subRawName = (sub.rawName || sub.name || '').trim();
      const subBaseName = (sub.baseName || subRawName).toLowerCase().trim();

      // Structural check: is subItem a distinct ingredient type (e.g. Eigelb vs Ei)?
      const isDistinctName =
        subBaseName &&
        subBaseName !== mainBaseName &&
        (!item.parentIngredient || subBaseName !== item.parentIngredient.baseName.toLowerCase().trim());

      const mod = sub.modifier?.trim();

      if (isDistinctName) {
        const amtStr = formatItemAmount(sub.amount, sub.unit);
        const modStr = mod ? ` (${mod})` : '';
        notes.push(`${amtStr ? `${amtStr} ` : ''}${subRawName}${modStr}`);
      } else if (mod) {
        const key = `${mod.toLowerCase()}|${sub.unit.toLowerCase()}`;
        const existing = modifierAmounts.get(key);
        if (existing) {
          existing.totalAmount += sub.amount;
        } else {
          modifierAmounts.set(key, { totalAmount: sub.amount, unit: sub.unit, mod });
        }
      }
    }

    modifierAmounts.forEach(({ totalAmount, unit, mod }) => {
      const isPartial = totalAmount < item.amount;
      if (isPartial) {
        const amtStr = formatItemAmount(totalAmount, unit);
        notes.push(amtStr ? `${mod} (${amtStr})` : mod);
      } else {
        notes.push(mod);
      }
    });

    const result = Array.from(new Set(notes.filter(Boolean))).join(', ');
    if (result) return result;
  }

  if (item.modifier) {
    return item.modifier.trim() || null;
  }

  return null;
}
