import type { AggregatedShoppingItem, ShoppingListItem } from '../../types';

export interface CategorizedShoppingResult {
  activeGroups: Array<{ category: string; items: AggregatedShoppingItem[] }>;
  activeCategorySet: Set<string>;
  drawerCheckedItems: AggregatedShoppingItem[];
}

export function getShoppingItemKey(item: AggregatedShoppingItem): string {
  return `${item.baseName || item.name}|${(item.modifier || '').toLowerCase().trim()}|${item.unit}`.toLowerCase();
}

/**
 * Partitions aggregated shopping items into active category aisles and completed drawer items.
 *
 * Rules:
 * 1. An aisle/category is "active" as long as it has at least ONE unchecked item.
 * 2. Checked items belonging to an active aisle remain visible in that aisle at their original
 *    stable position (no re-sorting within the category) until the entire category is checked off.
 * 3. Only when ALL items in a category are checked off, the entire category leaves the active list
 *    and its items move into the completed "Erledigt" drawer.
 */
export function partitionShoppingCategories(
  aggregatedList: {
    toBuy?: AggregatedShoppingItem[];
    unchecked?: AggregatedShoppingItem[];
    checked: AggregatedShoppingItem[];
  },
  categoryOrderList: readonly string[] = [],
  shoppingList?: ShoppingListItem[]
): CategorizedShoppingResult {
  const toBuy = aggregatedList.toBuy || aggregatedList.unchecked || [];
  const checked = aggregatedList.checked || [];

  const categoryIndex = (cat: string) => {
    const idx = categoryOrderList.indexOf(cat.toUpperCase());
    return idx === -1 ? 999 : idx;
  };

  // Build an index lookup based on the raw shopping list order so items never jump or re-sort
  const itemOrderMap = new Map<string, number>();
  if (shoppingList && shoppingList.length > 0) {
    shoppingList.forEach((item, idx) => {
      itemOrderMap.set(item.id, idx);
    });
  }

  const getItemSortIndex = (item: AggregatedShoppingItem, fallbackIndex: number): number => {
    if (item.itemIds && item.itemIds.length > 0 && itemOrderMap.size > 0) {
      let minIdx = Number.MAX_SAFE_INTEGER;
      for (const id of item.itemIds) {
        const found = itemOrderMap.get(id);
        if (found !== undefined && found < minIdx) {
          minIdx = found;
        }
      }
      if (minIdx !== Number.MAX_SAFE_INTEGER) {
        return minIdx;
      }
    }
    return fallbackIndex;
  };

  // 1. Identify which categories currently have at least one unchecked item
  const activeCategorySet = new Set<string>();
  toBuy.forEach((item) => {
    activeCategorySet.add(item.category || 'OTHER');
  });

  // 2. Map of active categories holding their items
  const activeCategoryMap = new Map<string, AggregatedShoppingItem[]>();

  toBuy.forEach((item) => {
    const cat = item.category || 'OTHER';
    if (!activeCategoryMap.has(cat)) {
      activeCategoryMap.set(cat, []);
    }
    activeCategoryMap.get(cat)!.push(item);
  });

  const drawerChecked: AggregatedShoppingItem[] = [];

  // 3. Place checked items: in-aisle if category is still active, else in the completed drawer
  checked.forEach((item) => {
    const cat = item.category || 'OTHER';
    if (activeCategorySet.has(cat)) {
      if (!activeCategoryMap.has(cat)) {
        activeCategoryMap.set(cat, []);
      }
      activeCategoryMap.get(cat)!.push(item);
    } else {
      drawerChecked.push(item);
    }
  });

  // 4. Construct sorted active groups (each category preserves stable original item order)
  const activeGroups = Array.from(activeCategoryMap.entries())
    .map(([category, items]) => {
      const sortedItems = [...items].sort((a, b) => {
        const indexA = getItemSortIndex(a, 0);
        const indexB = getItemSortIndex(b, 0);
        return indexA - indexB;
      });
      return {
        category,
        items: sortedItems,
      };
    })
    .sort((a, b) => categoryIndex(a.category) - categoryIndex(b.category));

  // 5. Construct sorted drawer items
  const drawerCheckedItems = [...drawerChecked].sort((a, b) => {
    const catDiff = categoryIndex(a.category || 'OTHER') - categoryIndex(b.category || 'OTHER');
    if (catDiff !== 0) return catDiff;
    return getItemSortIndex(a, 0) - getItemSortIndex(b, 0);
  });

  return {
    activeGroups,
    activeCategorySet,
    drawerCheckedItems,
  };
}
