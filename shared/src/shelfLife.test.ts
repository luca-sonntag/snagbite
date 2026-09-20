import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultShelfLifeDays, CATEGORY_SHELF_LIFE_DAYS, calculateExpiresAtDate, getDaysRemaining } from './shelfLife.js';

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

test('calculateExpiresAtDate and getDaysRemaining handle calendar days accurately across timezones', () => {
  const from = new Date('2026-08-31T01:30:00+02:00');
  const exp365 = calculateExpiresAtDate(365, from);
  assert.equal(exp365, '2027-08-31');
  assert.equal(getDaysRemaining(exp365, from), 365);

  const exp30 = calculateExpiresAtDate(30, from);
  assert.equal(exp30, '2026-09-30');
  assert.equal(getDaysRemaining(exp30, from), 30);

  const exp4 = calculateExpiresAtDate(4, from);
  assert.equal(exp4, '2026-09-04');
  assert.equal(getDaysRemaining(exp4, from), 4);

  // Expired / Today / Tomorrow
  assert.equal(getDaysRemaining('2026-08-31', from), 0);
  assert.equal(getDaysRemaining('2026-08-30', from), -1);
  assert.equal(getDaysRemaining('2026-09-01', from), 1);
  assert.equal(getDaysRemaining(null, from), null);
});
