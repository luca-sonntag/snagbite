import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateShoppingItems } from '../shoppingAggregation';
import type { ShoppingListItem } from '../../types';

test('Shopping aggregation splits items into toBuy, inPantry, and checked', () => {
  const items: ShoppingListItem[] = [
    {
      id: '1',
      name: 'Milch 3.5%',
      baseName: 'milk',
      amount: 1,
      unit: 'l',
      checked: false,
      inPantryWarning: false,
      createdAt: '2026-08-30T12:00:00Z',
    },
    {
      id: '2',
      name: 'Butter',
      baseName: 'butter',
      amount: 250,
      unit: 'g',
      checked: false,
      inPantryWarning: true,
      createdAt: '2026-08-30T12:00:00Z',
    },
    {
      id: '3',
      name: 'Eier',
      baseName: 'egg',
      amount: 6,
      unit: 'Stück',
      checked: true,
      inPantryWarning: false,
      createdAt: '2026-08-30T12:00:00Z',
    },
  ];

  const grouped = aggregateShoppingItems(items);

  assert.equal(grouped.toBuy.length, 1);
  assert.equal(grouped.toBuy[0].baseName, 'milk');

  assert.equal(grouped.inPantry.length, 1);
  assert.equal(grouped.inPantry[0].baseName, 'butter');
  assert.equal(grouped.inPantry[0].inPantryWarning, true);

  assert.equal(grouped.checked.length, 1);
  assert.equal(grouped.checked[0].baseName, 'egg');
  assert.equal(grouped.checked[0].checked, true);
});
