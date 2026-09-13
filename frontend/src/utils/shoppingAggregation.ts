import type { ShoppingListItem, AggregatedShoppingItem } from '../types';
import {
  getParentIngredient,
  normalizeFoodBaseKey,
  normalizeUnit,
  getIngredientDisplayName,
} from './ingredientTaxonomy';

export interface GroupedShoppingList {
  toBuy: AggregatedShoppingItem[];
  inPantry: AggregatedShoppingItem[];
  checked: AggregatedShoppingItem[];
}

export function aggregateShoppingItems(items: ShoppingListItem[]): GroupedShoppingList {
  const toBuyMap = new Map<string, AggregatedShoppingItem>();
  const checkedMap = new Map<string, AggregatedShoppingItem>();

  for (const item of items) {
    const parent = getParentIngredient(item);
    const groupKeyName = normalizeFoodBaseKey(item);
    const displayUnit = normalizeUnit(item.unit || (parent ? parent.unit : ''));

    // Key by universal food base key so all components and variants merge into one card
    const key = groupKeyName.toLowerCase().trim();
    const targetMap = item.checked ? checkedMap : toBuyMap;

    const currentSubName = item.modifier ? `${item.name} (${item.modifier})` : item.name;
    const existing = targetMap.get(key);

    if (existing) {
      if (item.inPantryWarning) {
        existing.inPantryWarning = true;
      }
      if (existing.unit.toLowerCase().trim() === displayUnit.toLowerCase().trim()) {
        existing.amount += item.amount;
      }
      if (!existing.itemIds.includes(item.id)) {
        existing.itemIds.push(item.id);
      }
      if (!existing.category && item.category) {
        existing.category = item.category;
      }
      if (!existing.typicalPackageAmount && item.typicalPackageAmount) {
        existing.typicalPackageAmount = item.typicalPackageAmount;
        existing.typicalPackageUnit = item.typicalPackageUnit;
      }
      if (!existing.synonyms && item.synonyms) {
        existing.synonyms = item.synonyms;
      }

      if (
        !existing.subItems &&
        (existing.modifier !== item.modifier ||
          existing.name !== item.name ||
          existing.baseName !== item.baseName ||
          existing.unit.toLowerCase().trim() !== displayUnit.toLowerCase().trim())
      ) {
        const firstSubName = existing.modifier ? `${existing.name} (${existing.modifier})` : existing.name;
        const firstItemSource = existing.sources[0];
        existing.subItems = [
          {
            name: firstSubName,
            rawName: existing.name,
            baseName: existing.baseName || existing.name,
            modifier: existing.modifier,
            amount: existing.amount,
            unit: existing.unit,
            recipeTitle: firstItemSource?.recipeTitle || '',
          },
        ];
        existing.modifier = undefined;
      }

      if (existing.subItems) {
        const sub = existing.subItems.find(
          (s) =>
            s.name.toLowerCase() === currentSubName.toLowerCase() &&
            s.unit.toLowerCase().trim() === item.unit.toLowerCase().trim() &&
            s.recipeTitle === item.recipeTitle
        );
        if (sub) {
          sub.amount += item.amount;
        } else {
          existing.subItems.push({
            name: currentSubName,
            rawName: item.name,
            baseName: item.baseName || item.name,
            modifier: item.modifier,
            amount: item.amount,
            unit: item.unit,
            recipeTitle: item.recipeTitle,
          });
        }
      }

      const hasSource = existing.sources.some((s) => s.recipeId === item.recipeId);
      if (!hasSource) {
        existing.sources.push({
          recipeId: item.recipeId,
          recipeTitle: item.recipeTitle,
          amount: item.amount,
          unit: item.unit,
        });
      } else {
        const sourceObj = existing.sources.find((s) => s.recipeId === item.recipeId);
        if (sourceObj) {
          sourceObj.amount += item.amount;
        }
      }
    } else {
      const initialSubItems = parent
        ? [
            {
              name: currentSubName,
              rawName: item.name,
              baseName: item.baseName || item.name,
              modifier: item.modifier,
              amount: item.amount,
              unit: item.unit,
              recipeTitle: item.recipeTitle,
            },
          ]
        : undefined;

      const displayName = getIngredientDisplayName(item);

      targetMap.set(key, {
        name: displayName,
        baseName: groupKeyName,
        parentIngredient: parent || undefined,
        modifier: parent ? undefined : item.modifier,
        unit: displayUnit,
        amount: item.amount,
        checked: item.checked,
        category: item.category,
        canonicalId: item.canonicalId || undefined,
        synonyms: item.synonyms,
        itemIds: [item.id],
        inPantryWarning: item.inPantryWarning,
        typicalPackageAmount: item.typicalPackageAmount,
        typicalPackageUnit: item.typicalPackageUnit,
        sources: [
          {
            recipeId: item.recipeId,
            recipeTitle: item.recipeTitle,
            amount: item.amount,
            unit: item.unit,
          },
        ],
        subItems: initialSubItems,
      });
    }
  }

  const toBuyList = Array.from(toBuyMap.values());
  return {
    toBuy: toBuyList,
    inPantry: toBuyList.filter((i) => i.inPantryWarning),
    checked: Array.from(checkedMap.values()),
  };
}

export function extractActiveRecipes(
  items: ShoppingListItem[]
): Array<{ recipeId: string; recipeTitle: string; totalItems: number; checkedItems: number }> {
  const recipeMap = new Map<
    string,
    { recipeId: string; recipeTitle: string; totalItems: number; checkedItems: number }
  >();

  for (const item of items) {
    if (!item.recipeId) continue;
    const existing = recipeMap.get(item.recipeId);
    if (existing) {
      existing.totalItems += 1;
      if (item.checked) existing.checkedItems += 1;
    } else {
      recipeMap.set(item.recipeId, {
        recipeId: item.recipeId,
        recipeTitle: item.recipeTitle || '',
        totalItems: 1,
        checkedItems: item.checked ? 1 : 0,
      });
    }
  }

  return Array.from(recipeMap.values());
}
