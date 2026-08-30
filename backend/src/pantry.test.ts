import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePantryDeduction } from './matching/pantryDeduction.js';
import { buildMappingKeys } from './matching/baseNameCanonical.js';

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

test('Pantry alias matching: singular/plural matching (Röstzwiebeln vs Röstzwiebel)', () => {
  const ingKeys = new Set(buildMappingKeys(undefined, 'Röstzwiebeln'));
  const pKeys = buildMappingKeys(undefined, 'Röstzwiebel');
  const isMatch = pKeys.some((k) => ingKeys.has(k));
  assert.equal(isMatch, true, 'Singular Röstzwiebel must match plural Röstzwiebeln');

  // Deduction calculation: 80g recipe from 100g in pantry -> 80g deduction -> 20g remaining
  const pantryItem = { amount: 100, unit: 'g', name: 'Röstzwiebel' };
  const recipeIng = { amount: 80, unit: 'g', name: 'Röstzwiebeln' };
  const deduction = calculatePantryDeduction(pantryItem, recipeIng);
  assert.equal(deduction, 80);
  assert.equal(pantryItem.amount - deduction, 20);
});

test('Pantry matching ignores empty 0-amount rows and targets active stock', () => {
  const pantryItems = [
    { id: 'old-empty-row', name: 'Röstzwiebeln', baseName: 'fried onion', amount: 0, unit: 'EL' },
    { id: 'new-stock-row', name: 'Röstzwiebeln', baseName: 'fried onion', amount: 100, unit: 'g' },
  ];

  const recipeIng = { name: 'Röstzwiebeln', baseName: 'fried onion', synonyms: ['crispy onions'], amount: 80, unit: 'g' };
  const ingKeys = new Set(buildMappingKeys(recipeIng.baseName, recipeIng.name, recipeIng.synonyms));

  const match = pantryItems.find((p) => {
    if (p.amount <= 0) return false;
    const pKeys = buildMappingKeys(p.baseName, p.name);
    return pKeys.some((k) => ingKeys.has(k));
  });

  assert.ok(match, 'Must find a match');
  assert.equal(match.id, 'new-stock-row', 'Must match the row with stock > 0, ignoring the 0-amount row');
  const deduction = calculatePantryDeduction(match, recipeIng);
  assert.equal(deduction, 80);
  assert.equal(match.amount - deduction, 20);
});

test('Pantry matching with parentIngredient: Gurkenwasser matches Gewürzgurken pantry item', () => {
  const pantryItem = { id: 'jar-pickles', name: 'Gewürzgurken', baseName: 'pickle', amount: 670, unit: 'g' };
  const recipeIng = {
    name: 'Gurkenwasser',
    baseName: 'pickle juice',
    amount: 4,
    unit: 'EL',
    parentIngredient: { name: 'Gewürzgurken', baseName: 'pickle', unit: 'Glas' },
  };

  const ingKeys = new Set(buildMappingKeys(recipeIng.baseName, recipeIng.name, undefined, recipeIng.parentIngredient));
  const pKeys = buildMappingKeys(pantryItem.baseName, pantryItem.name);
  const isMatch = pKeys.some((k) => ingKeys.has(k));
  assert.equal(isMatch, true, 'Gurkenwasser with parentIngredient must match Gewürzgurken');

  // 4 EL = 60g deduction from 670g jar -> 610g remaining
  const deduction = calculatePantryDeduction(pantryItem, recipeIng);
  assert.equal(deduction, 60);
  assert.equal(pantryItem.amount - deduction, 610);
});
