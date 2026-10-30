import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { partitionShoppingCategories, getShoppingItemKey } from '../shoppingCategoryUtils';
import type { AggregatedShoppingItem, ShoppingListItem } from '../../../types';

function createMockItem(
  name: string,
  category: string,
  checked: boolean,
  unit = 'g',
  amount = 100
): AggregatedShoppingItem {
  return {
    name,
    baseName: name.toLowerCase(),
    amount,
    unit,
    checked,
    category,
    itemIds: [`id-${name}`],
    sources: [{ recipeId: 'r1', recipeTitle: 'Rezept' }],
  };
}

describe('shoppingCategoryUtils', () => {
  const categoryOrder = ['PRODUCE', 'DAIRY', 'BAKERY', 'MEAT', 'OTHER'];

  it('generates consistent item keys', () => {
    const item = createMockItem('Bio-Milch', 'DAIRY', false, 'ml', 500);
    assert.equal(getShoppingItemKey(item), 'bio-milch||ml');
  });

  it('keeps all items in active groups when none are checked', () => {
    const apple = createMockItem('Apfel', 'PRODUCE', false);
    const banana = createMockItem('Banane', 'PRODUCE', false);
    const milk = createMockItem('Milch', 'DAIRY', false);

    const result = partitionShoppingCategories(
      {
        toBuy: [apple, banana, milk],
        checked: [],
      },
      categoryOrder
    );

    assert.equal(result.activeGroups.length, 2);
    assert.equal(result.activeGroups[0].category, 'PRODUCE');
    assert.equal(result.activeGroups[0].items.length, 2);
    assert.equal(result.activeGroups[1].category, 'DAIRY');
    assert.equal(result.activeGroups[1].items.length, 1);
    assert.equal(result.drawerCheckedItems.length, 0);
  });

  it('keeps checked items inside the category at their original stable place without re-sorting', () => {
    const apple = createMockItem('Apfel', 'PRODUCE', true);
    const banana = createMockItem('Banane', 'PRODUCE', false);
    const milk = createMockItem('Milch', 'DAIRY', false);

    // Raw shopping list order: Apfel was first (idx 0), then Banane (idx 1), then Milch (idx 2)
    const rawList: ShoppingListItem[] = [
      { id: 'id-Apfel', name: 'Apfel', amount: 100, unit: 'g', checked: true, category: 'PRODUCE' },
      { id: 'id-Banane', name: 'Banane', amount: 100, unit: 'g', checked: false, category: 'PRODUCE' },
      { id: 'id-Milch', name: 'Milch', amount: 100, unit: 'g', checked: false, category: 'DAIRY' },
    ];

    // Apple is checked, but banana is still unchecked in PRODUCE
    const result = partitionShoppingCategories(
      {
        toBuy: [banana, milk],
        checked: [apple],
      },
      categoryOrder,
      rawList
    );

    // PRODUCE is still active because Banana is unchecked!
    assert.equal(result.activeCategorySet.has('PRODUCE'), true);
    assert.equal(result.activeGroups.length, 2);

    const produceGroup = result.activeGroups.find((g) => g.category === 'PRODUCE')!;
    assert.ok(produceGroup);
    assert.equal(produceGroup.items.length, 2);

    // Checked item Apfel stays at its original place (index 0), NOT moved to the bottom!
    assert.equal(produceGroup.items[0].name, 'Apfel');
    assert.equal(produceGroup.items[0].checked, true);
    assert.equal(produceGroup.items[1].name, 'Banane');
    assert.equal(produceGroup.items[1].checked, false);

    // Apple should NOT be in the completed drawer yet
    assert.equal(result.drawerCheckedItems.length, 0);
  });

  it('moves entire category to completed drawer once all items in that category are checked', () => {
    const apple = createMockItem('Apfel', 'PRODUCE', true);
    const banana = createMockItem('Banane', 'PRODUCE', true);
    const milk = createMockItem('Milch', 'DAIRY', false);

    const rawList: ShoppingListItem[] = [
      { id: 'id-Apfel', name: 'Apfel', amount: 100, unit: 'g', checked: true, category: 'PRODUCE' },
      { id: 'id-Banane', name: 'Banane', amount: 100, unit: 'g', checked: true, category: 'PRODUCE' },
      { id: 'id-Milch', name: 'Milch', amount: 100, unit: 'g', checked: false, category: 'DAIRY' },
    ];

    // Both items in PRODUCE are now checked!
    const result = partitionShoppingCategories(
      {
        toBuy: [milk],
        checked: [apple, banana],
      },
      categoryOrder,
      rawList
    );

    // PRODUCE should no longer be an active group
    assert.equal(result.activeCategorySet.has('PRODUCE'), false);
    assert.equal(result.activeGroups.length, 1);
    assert.equal(result.activeGroups[0].category, 'DAIRY');

    // Both apple and banana should now be in the drawer
    assert.equal(result.drawerCheckedItems.length, 2);
    assert.deepEqual(
      result.drawerCheckedItems.map((i) => i.name),
      ['Apfel', 'Banane']
    );
  });

  it('immediately moves single-item categories to completed drawer when checked', () => {
    const milk = createMockItem('Milch', 'DAIRY', true);
    const bread = createMockItem('Brot', 'BAKERY', false);

    const rawList: ShoppingListItem[] = [
      { id: 'id-Milch', name: 'Milch', amount: 100, unit: 'g', checked: true, category: 'DAIRY' },
      { id: 'id-Brot', name: 'Brot', amount: 100, unit: 'g', checked: false, category: 'BAKERY' },
    ];

    const result = partitionShoppingCategories(
      {
        toBuy: [bread],
        checked: [milk],
      },
      categoryOrder,
      rawList
    );

    assert.equal(result.activeGroups.length, 1);
    assert.equal(result.activeGroups[0].category, 'BAKERY');
    assert.equal(result.drawerCheckedItems.length, 1);
    assert.equal(result.drawerCheckedItems[0].name, 'Milch');
  });

  it('restores category to active list if an item is unchecked from the completed drawer', () => {
    // Both Apple and Banana were completed
    // Then Apple is unchecked (in toBuy), while Banana is still checked (in checked)
    const apple = createMockItem('Apfel', 'PRODUCE', false);
    const banana = createMockItem('Banane', 'PRODUCE', true);

    const rawList: ShoppingListItem[] = [
      { id: 'id-Apfel', name: 'Apfel', amount: 100, unit: 'g', checked: false, category: 'PRODUCE' },
      { id: 'id-Banane', name: 'Banane', amount: 100, unit: 'g', checked: true, category: 'PRODUCE' },
    ];

    const result = partitionShoppingCategories(
      {
        toBuy: [apple],
        checked: [banana],
      },
      categoryOrder,
      rawList
    );

    // PRODUCE is active again
    assert.equal(result.activeCategorySet.has('PRODUCE'), true);
    assert.equal(result.activeGroups.length, 1);
    assert.equal(result.activeGroups[0].category, 'PRODUCE');
    assert.equal(result.activeGroups[0].items.length, 2);
    // Apfel stays at index 0, Banane stays at index 1
    assert.equal(result.activeGroups[0].items[0].name, 'Apfel');
    assert.equal(result.activeGroups[0].items[0].checked, false);
    assert.equal(result.activeGroups[0].items[1].name, 'Banane');
    assert.equal(result.activeGroups[0].items[1].checked, true);

    // Completed drawer is empty because Banana is back in the active PRODUCE group
    assert.equal(result.drawerCheckedItems.length, 0);
  });
});
