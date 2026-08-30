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
  const inPantryMap = new Map<string, AggregatedShoppingItem>();
  const checkedMap = new Map<string, AggregatedShoppingItem>();

  for (const item of items) {
    const parent = getParentIngredient(item);
    const groupKeyName = normalizeFoodBaseKey(item);
    const displayUnit = normalizeUnit(parent ? parent.unit || item.unit : item.unit);

    const key = `${groupKeyName.toLowerCase().trim()}|${displayUnit.toLowerCase().trim()}`;
    const targetMap = item.checked ? checkedMap : item.inPantryWarning ? inPantryMap : toBuyMap;

    const currentSubName = item.modifier ? `${item.name} (${item.modifier})` : item.name;
    const existing = targetMap.get(key);

    if (existing) {
      existing.amount += item.amount;
      if (!existing.itemIds.includes(item.id)) {
        existing.itemIds.push(item.id);
      }
      if (!existing.category && item.category) {
        existing.category = item.category;
      }

      if (
        !existing.subItems &&
        (existing.modifier !== item.modifier ||
          existing.name !== item.name ||
          existing.baseName !== item.baseName)
      ) {
        const firstSubName = existing.modifier ? `${existing.name} (${existing.modifier})` : existing.name;
        const firstItemSource = existing.sources[0];
        existing.subItems = [
          {
            name: firstSubName,
            rawName: existing.name,
            baseName: existing.baseName || existing.name,
            modifier: existing.modifier,
            amount: existing.amount - item.amount,
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
        itemIds: [item.id],
        inPantryWarning: item.inPantryWarning,
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

  return {
    toBuy: Array.from(toBuyMap.values()),
    inPantry: Array.from(inPantryMap.values()),
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
