import type { AggregatedShoppingItem } from '../../types';

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
 * 2. Checked items belonging to an active aisle remain visible in that aisle (at the bottom)
 *    so items do not abruptly disappear while shopping in that category.
 * 3. Only when ALL items in a category are checked off, the category leaves the active list
 *    and its items move into the completed "Erledigt" drawer.
 */
export function partitionShoppingCategories(
  aggregatedList: {
    toBuy?: AggregatedShoppingItem[];
    unchecked?: AggregatedShoppingItem[];
    checked: AggregatedShoppingItem[];
  },
  categoryOrderList: readonly string[] = []
): CategorizedShoppingResult {
  const toBuy = aggregatedList.toBuy || aggregatedList.unchecked || [];
  const checked = aggregatedList.checked || [];

  const categoryIndex = (cat: string) => {
    const idx = categoryOrderList.indexOf(cat.toUpperCase());
    return idx === -1 ? 999 : idx;
  };

  // 1. Identify which categories currently have at least one unchecked item
  const activeCategorySet = new Set<string>();
  toBuy.forEach((item) => {
    activeCategorySet.add(item.category || 'OTHER');
  });

  // 2. Map of active categories holding their unchecked and in-aisle checked items
  const activeCategoryMap = new Map<
    string,
    { unchecked: AggregatedShoppingItem[]; checked: AggregatedShoppingItem[] }
  >();

  toBuy.forEach((item) => {
    const cat = item.category || 'OTHER';
    if (!activeCategoryMap.has(cat)) {
      activeCategoryMap.set(cat, { unchecked: [], checked: [] });
    }
    activeCategoryMap.get(cat)!.unchecked.push(item);
  });

  const drawerChecked: AggregatedShoppingItem[] = [];

  // 3. Place checked items: in-aisle if category is still active, else in the completed drawer
  checked.forEach((item) => {
    const cat = item.category || 'OTHER';
    if (activeCategorySet.has(cat)) {
      if (!activeCategoryMap.has(cat)) {
        activeCategoryMap.set(cat, { unchecked: [], checked: [] });
      }
      activeCategoryMap.get(cat)!.checked.push(item);
    } else {
      drawerChecked.push(item);
    }
  });

  // 4. Construct sorted active groups (unchecked items first, checked items below)
  const activeGroups = Array.from(activeCategoryMap.entries())
    .map(([category, { unchecked, checked: checkedItems }]) => ({
      category,
      items: [...unchecked, ...checkedItems],
    }))
    .sort((a, b) => categoryIndex(a.category) - categoryIndex(b.category));

  // 5. Construct sorted drawer items
  const drawerCheckedItems = [...drawerChecked].sort(
    (a, b) => categoryIndex(a.category || 'OTHER') - categoryIndex(b.category || 'OTHER')
  );

  return {
    activeGroups,
    activeCategorySet,
    drawerCheckedItems,
  };
}
