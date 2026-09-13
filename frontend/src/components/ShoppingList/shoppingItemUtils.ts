import type { AggregatedShoppingItem, PantryItem, ParentIngredientInfo, ShoppingListItem } from '../../types';
import { normalizeFoodBaseKey, normalizeUnit } from '../../utils/ingredientTaxonomy';
import { formatQuantity } from '../../utils/formatQuantity';
import { isPantryStockSufficient, getPantryStockStatus, type PantryStockStatus } from '@cookbook/shared';

export interface PantryMatchableItem {
  name: string;
  amount?: number;
  unit?: string;
  baseName?: string;
  canonicalId?: string | null;
  parentIngredient?: ParentIngredientInfo | null;
}

export interface PantryStockMatch {
  pantryItem: PantryItem;
  formattedStock: string;
  isPartial: boolean; // true if available pantry stock < required amount
  status: PantryStockStatus; // 'sufficient' | 'low' | 'deficit'
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

  const reqAmt = requiredAmount ?? item.amount;
  const reqUnt = requiredUnit ?? item.unit;

  const isPartial =
    reqAmt != null && reqAmt > 0
      ? !isPantryStockSufficient(match.amount, match.unit, reqAmt, reqUnt)
      : false;

  const status = getPantryStockStatus(match.amount, match.unit, reqAmt, reqUnt);

  return {
    pantryItem: match,
    formattedStock: `${formatQuantity(match.amount)} ${match.unit}`.trim(),
    isPartial,
    status,
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

export function findGroupMatchedIds(
  items: ShoppingListItem[],
  groupKeyName: string,
  unit: string
): string[] {
  const keyName = groupKeyName.toLowerCase().trim();
  const keyUnit = normalizeUnit(unit).toLowerCase().trim();
  return items
    .filter((item) => {
      const matchName =
        (item.baseName || item.name || '').toLowerCase().trim() === keyName ||
        (item.name || '').toLowerCase().trim() === keyName;
      const matchUnit = normalizeUnit(item.unit).toLowerCase().trim() === keyUnit;
      return matchName && matchUnit;
    })
    .map((i) => i.id);
}
