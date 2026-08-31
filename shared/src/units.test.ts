import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUnit, convertToBaseMetric, isPantryStockSufficient } from './units.js';

describe('Shared Units & Pantry Stock Sufficiency', () => {
  it('normalizes various unit spellings', () => {
    assert.equal(normalizeUnit('Gramm'), 'g');
    assert.equal(normalizeUnit('kg'), 'kg');
    assert.equal(normalizeUnit('EL'), 'tablespoon');
    assert.equal(normalizeUnit('Esslöffel'), 'tablespoon');
    assert.equal(normalizeUnit('tbsp'), 'tablespoon');
    assert.equal(normalizeUnit('TL'), 'teaspoon');
    assert.equal(normalizeUnit('Stück'), 'piece');
    assert.equal(normalizeUnit('Dose'), 'can');
    assert.equal(normalizeUnit('Glas'), 'jar');
  });

  it('accurately detects sufficient stock with same unit', () => {
    assert.equal(isPantryStockSufficient(500, 'g', 250, 'g'), true);
    assert.equal(isPantryStockSufficient(250, 'g', 250, 'g'), true);
    assert.equal(isPantryStockSufficient(50, 'g', 250, 'g'), false);
  });

  it('accurately detects sufficient stock across metric units', () => {
    assert.equal(isPantryStockSufficient(1, 'kg', 250, 'g'), true);
    assert.equal(isPantryStockSufficient(0.1, 'kg', 250, 'g'), false);
    assert.equal(isPantryStockSufficient(1, 'l', 250, 'ml'), true);
    assert.equal(isPantryStockSufficient(250, 'ml', 1, 'l'), false);
    assert.equal(isPantryStockSufficient(250, 'ml', 1, 'EL'), true);
    assert.equal(isPantryStockSufficient(1, 'TL', 250, 'ml'), false);
  });

  it('accurately handles piece and count comparisons', () => {
    assert.equal(isPantryStockSufficient(3, 'Stück', 2, 'Stk'), true);
    assert.equal(isPantryStockSufficient(1, 'Stück', 2, 'Stk'), false);
  });
});
