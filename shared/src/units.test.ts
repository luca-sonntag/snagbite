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

  it('accurately categorizes pantry stock into 3 tiers', () => {
    // Sufficient (>= 100%) -> sufficient (Emerald)
    assert.equal(getPantryStockStatus(500, 'g', 250, 'g'), 'sufficient');
    assert.equal(getPantryStockStatus(250, 'g', 250, 'g'), 'sufficient');
    assert.equal(getPantryStockStatus(1, 'kg', 250, 'g'), 'sufficient');

    // Low / Review (50% - 99%) -> low (Orange)
    assert.equal(getPantryStockStatus(60, 'g', 80, 'g'), 'low');
    assert.equal(getPantryStockStatus(150, 'g', 250, 'g'), 'low');
    assert.equal(getPantryStockStatus(1, 'Stück', 2, 'Stück'), 'low');

    // Deficit (< 50%) -> deficit (Red)
    assert.equal(getPantryStockStatus(20, 'g', 80, 'g'), 'deficit');
    assert.equal(getPantryStockStatus(50, 'g', 250, 'g'), 'deficit');
    assert.equal(getPantryStockStatus(1, 'Stück', 4, 'Stück'), 'deficit');
  });
});
