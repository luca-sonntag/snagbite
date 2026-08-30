import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePantryDeduction } from './pantryDeduction.js';

test('calculatePantryDeduction: identical units', () => {
  // 2 pieces from 10 pieces -> 2 pieces
  const deduction = calculatePantryDeduction(
    { amount: 10, unit: 'Stück', name: 'Ei' },
    { amount: 2, unit: 'Stück', name: 'Ei' }
  );
  assert.equal(deduction, 2);
});

test('calculatePantryDeduction: piece to grams using gramsPerUnit (Gewürzgurken)', () => {
  // 3 pieces of pickles with gramsPerUnit = 30g against 670g jar in pantry -> 90g deduction
  const deduction = calculatePantryDeduction(
    { amount: 670, unit: 'g', name: 'Gewürzgurken' },
    { amount: 3, unit: 'Stück', name: 'Gewürzgurken', gramsPerUnit: 30 }
  );
  assert.equal(deduction, 90);
});

test('calculatePantryDeduction: grams to slices using gramsPerUnit (Scheibenkäse)', () => {
  // 100g cheese against 8 slices with gramsPerUnit = 25g -> 4 slices deduction
  const deduction = calculatePantryDeduction(
    { amount: 8, unit: 'Scheiben', name: 'Cheddar' },
    { amount: 100, unit: 'g', name: 'Cheddar', gramsPerUnit: 25 }
  );
  assert.equal(deduction, 4);
});

test('calculatePantryDeduction: metric weight conversions (g vs kg)', () => {
  // 250g recipe against 1kg in pantry -> 0.25kg deduction
  const deductionKg = calculatePantryDeduction(
    { amount: 1, unit: 'kg', name: 'Mehl' },
    { amount: 250, unit: 'g', name: 'Mehl' }
  );
  assert.equal(deductionKg, 0.25);

  // 1kg recipe against 500g in pantry -> 1000g deduction
  const deductionG = calculatePantryDeduction(
    { amount: 500, unit: 'g', name: 'Mehl' },
    { amount: 1, unit: 'kg', name: 'Mehl' }
  );
  assert.equal(deductionG, 1000);
});

test('calculatePantryDeduction: metric volume conversions (ml vs l)', () => {
  // 250ml recipe against 1l in pantry -> 0.25l deduction
  const deduction = calculatePantryDeduction(
    { amount: 1, unit: 'l', name: 'Milch' },
    { amount: 250, unit: 'ml', name: 'Milch' }
  );
  assert.equal(deduction, 0.25);
});

test('calculatePantryDeduction: container deduction (jar to grams)', () => {
  // 90g pickles against 1 jar (350g standard) in pantry -> ~0.26 jar deduction
  const deduction = calculatePantryDeduction(
    { amount: 1, unit: 'Glas', name: 'Gewürzgurken' },
    { amount: 3, unit: 'Stück', name: 'Gewürzgurken', gramsPerUnit: 30 }
  );
  assert.equal(deduction, 0.26);
});
