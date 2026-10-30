import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUnit,
  convertToBaseMetric,
  isPantryStockSufficient,
  getPantryStockStatus,
  getUnitDimension,
  areUnitsDimensionallyCompatible,
  isPackageUnitAppropriate,
} from './units.js';

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
    // Sufficient (> 120%) -> sufficient (Emerald)
    assert.equal(getPantryStockStatus(500, 'g', 250, 'g'), 'sufficient');
    assert.equal(getPantryStockStatus(260, 'g', 200, 'g'), 'sufficient');
    assert.equal(getPantryStockStatus(1, 'kg', 250, 'g'), 'sufficient');

    // Low / Review (90% - 120%) -> low (Orange)
    assert.equal(getPantryStockStatus(220, 'g', 200, 'g'), 'low'); // 110% (almost depleted after cooking)
    assert.equal(getPantryStockStatus(200, 'g', 200, 'g'), 'low'); // 100% (completely empty after cooking)
    assert.equal(getPantryStockStatus(190, 'g', 200, 'g'), 'low'); // 95% (almost full amount)
    assert.equal(getPantryStockStatus(9, 'Stück', 10, 'Stück'), 'low'); // 90%

    // Deficit (< 90%) -> deficit (Red)
    assert.equal(getPantryStockStatus(60, 'g', 80, 'g'), 'deficit'); // 75%
    assert.equal(getPantryStockStatus(20, 'g', 80, 'g'), 'deficit'); // 25%
    assert.equal(getPantryStockStatus(50, 'g', 250, 'g'), 'deficit');
    assert.equal(getPantryStockStatus(1, 'Stück', 4, 'Stück'), 'deficit');
  });

  it('accurately resolves physical unit dimensions', () => {
    assert.equal(getUnitDimension('g'), 'mass');
    assert.equal(getUnitDimension('kg'), 'mass');
    assert.equal(getUnitDimension('oz'), 'mass');
    assert.equal(getUnitDimension('ml'), 'volume');
    assert.equal(getUnitDimension('l'), 'volume');
    assert.equal(getUnitDimension('EL'), 'volume');
    assert.equal(getUnitDimension('Stück'), 'count');
    assert.equal(getUnitDimension('Zehe'), 'count');
    assert.equal(getUnitDimension('Dose'), 'count');
    assert.equal(getUnitDimension(null), null);
    assert.equal(getUnitDimension('unknown_unit'), 'count'); // default normalizeUnit fallback
  });

  it('checks dimensional compatibility between culinary units', () => {
    assert.equal(areUnitsDimensionallyCompatible('g', 'kg'), true);
    assert.equal(areUnitsDimensionallyCompatible('ml', 'l'), true);
    assert.equal(areUnitsDimensionallyCompatible('g', 'ml'), true); // culinary density approx
    assert.equal(areUnitsDimensionallyCompatible('Stück', 'Zehe'), true);
  });

  it('strictly protects against inappropriate package units (Zitrone fix)', () => {
    // Piece / Count cannot have liquid volume package
    assert.equal(isPackageUnitAppropriate('Stück', 'ml'), false);
    assert.equal(isPackageUnitAppropriate('Stück', 'l'), false);
    assert.equal(isPackageUnitAppropriate('Zehe', 'ml'), false);
    assert.equal(isPackageUnitAppropriate('ml', 'Stück'), false);

    // Appropriate combinations
    assert.equal(isPackageUnitAppropriate('Stück', 'g'), true); // e.g. Apfel -> 1000g bag
    assert.equal(isPackageUnitAppropriate('g', 'g'), true);     // e.g. Skyr -> 500g cup
    assert.equal(isPackageUnitAppropriate('ml', 'l'), true);    // e.g. Milch -> 1l bottle
    assert.equal(isPackageUnitAppropriate('Stück', 'Stück'), true);
  });
});
