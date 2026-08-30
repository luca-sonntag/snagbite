import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePantryDeduction } from './matching/pantryDeduction.js';

test('Pantry deduction floored at zero logic', () => {
  const pantryItem = {
    id: 'item-1',
    name: 'Milch',
    baseName: 'milk',
    amount: 500,
    unit: 'ml',
  };

  // Recipe uses 200ml
  const recipeDeduction1 = calculatePantryDeduction(pantryItem, { amount: 200, unit: 'ml', name: 'Milch' });
  const remaining1 = Math.max(0, pantryItem.amount - recipeDeduction1);
  assert.equal(remaining1, 300);

  // Recipe uses 600ml (more than available)
  const recipeDeduction2 = calculatePantryDeduction(pantryItem, { amount: 600, unit: 'ml', name: 'Milch' });
  const remaining2 = Math.max(0, pantryItem.amount - recipeDeduction2);
  assert.equal(remaining2, 0, 'Should floor at 0 rather than negative');
});

test('Pantry unit conversions (g to kg, ml to l)', () => {
  // 200g recipe ingredient against 1kg pantry item -> 0.2kg deduction
  assert.equal(
    calculatePantryDeduction({ amount: 1, unit: 'kg', name: 'Mehl' }, { amount: 200, unit: 'g', name: 'Mehl' }),
    0.2
  );

  // 1kg recipe ingredient against 500g pantry item -> 1000g deduction
  assert.equal(
    calculatePantryDeduction({ amount: 500, unit: 'g', name: 'Mehl' }, { amount: 1, unit: 'kg', name: 'Mehl' }),
    1000
  );

  // 250ml recipe ingredient against 1l pantry item -> 0.25l deduction
  assert.equal(
    calculatePantryDeduction({ amount: 1, unit: 'l', name: 'Milch' }, { amount: 250, unit: 'ml', name: 'Milch' }),
    0.25
  );
});
