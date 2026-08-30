import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultShelfLifeDays, CATEGORY_SHELF_LIFE_DAYS } from './shelfLife.js';

test('getDefaultShelfLifeDays returns correct category defaults', () => {
  assert.equal(getDefaultShelfLifeDays('SPICES_HERBS'), 365);
  assert.equal(getDefaultShelfLifeDays('OILS_CONDIMENTS'), 180);
  assert.equal(getDefaultShelfLifeDays('GRAINS_PASTA'), 180);
  assert.equal(getDefaultShelfLifeDays('DAIRY_EGGS'), 14);
  assert.equal(getDefaultShelfLifeDays('MEAT_POULTRY'), 4);
  assert.equal(getDefaultShelfLifeDays('SEAFOOD'), 3);
  assert.equal(getDefaultShelfLifeDays('VEGETABLES'), 7);
  assert.equal(getDefaultShelfLifeDays('FRUITS'), 7);
  assert.equal(getDefaultShelfLifeDays('FROZEN'), 180);
});

test('getDefaultShelfLifeDays handles bread overrides in grains category', () => {
  assert.equal(getDefaultShelfLifeDays('GRAINS_PASTA', 'Brot'), 6);
  assert.equal(getDefaultShelfLifeDays('GRAINS_PASTA', 'Toastbrot'), 6);
  assert.equal(getDefaultShelfLifeDays('GRAINS_PASTA', 'Spaghetti'), 180);
});

test('getDefaultShelfLifeDays returns fallback for unknown category', () => {
  assert.equal(getDefaultShelfLifeDays(null), 14);
  assert.equal(getDefaultShelfLifeDays('UNKNOWN_XYZ'), 14);
});
