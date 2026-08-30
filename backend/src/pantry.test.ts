import test from 'node:test';
import assert from 'node:assert/strict';
import type { Recipe } from '@cookbook/shared';

test('Pantry deduction floored at zero logic', () => {
  const pantryItem = {
    id: 'item-1',
    name: 'Milch',
    baseName: 'milk',
    amount: 500,
    unit: 'ml',
  };

  // Recipe uses 200ml
  const recipeDeduction1 = 200;
  const remaining1 = Math.max(0, pantryItem.amount - recipeDeduction1);
  assert.equal(remaining1, 300);

  // Recipe uses 600ml (more than available)
  const recipeDeduction2 = 600;
  const remaining2 = Math.max(0, pantryItem.amount - recipeDeduction2);
  assert.equal(remaining2, 0, 'Should floor at 0 rather than negative');
});

test('Pantry unit conversions (g to kg, ml to l)', () => {
  function calculateReduction(ingAmount: number, ingUnit: string, pantryUnit: string): number {
    let deduction = ingAmount;
    const iUnit = ingUnit.toLowerCase().trim();
    const pUnit = pantryUnit.toLowerCase().trim();

    if (iUnit === 'kg' && pUnit === 'g') deduction *= 1000;
    else if (iUnit === 'g' && pUnit === 'kg') deduction /= 1000;
    else if (iUnit === 'l' && (pUnit === 'ml' || pUnit === 'milliliter')) deduction *= 1000;
    else if ((iUnit === 'ml' || iUnit === 'milliliter') && pUnit === 'l') deduction /= 1000;

    return deduction;
  }

  // 200g recipe ingredient against 1kg pantry item -> 0.2kg deduction
  assert.equal(calculateReduction(200, 'g', 'kg'), 0.2);

  // 1kg recipe ingredient against 500g pantry item -> 1000g deduction
  assert.equal(calculateReduction(1, 'kg', 'g'), 1000);

  // 250ml recipe ingredient against 1l pantry item -> 0.25l deduction
  assert.equal(calculateReduction(250, 'ml', 'l'), 0.25);
});
