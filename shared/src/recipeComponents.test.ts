import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSectionName } from './recipeComponents.js';

test('sanitizeSectionName', async (t) => {
  await t.test('strips generic container section labels', () => {
    assert.equal(sanitizeSectionName(''), undefined);
    assert.equal(sanitizeSectionName('   '), undefined);
    assert.equal(sanitizeSectionName('Zutaten'), undefined);
    assert.equal(sanitizeSectionName('hauptzutaten'), undefined);
    assert.equal(sanitizeSectionName('ingredients'), undefined);
    assert.equal(sanitizeSectionName('Main'), undefined);
    assert.equal(sanitizeSectionName('general'), undefined);
    assert.equal(sanitizeSectionName('Basis'), undefined);
    assert.equal(sanitizeSectionName('default'), undefined);
    assert.equal(sanitizeSectionName('Allgemein'), undefined);
  });

  await t.test('strips section when identical to ingredient category', () => {
    assert.equal(sanitizeSectionName('VEGETABLES', 'VEGETABLES'), undefined);
    assert.equal(sanitizeSectionName('Dairy & Eggs', 'dairy_eggs'), undefined);
    assert.equal(sanitizeSectionName('MEAT_POULTRY', 'meat-poultry'), undefined);
    assert.equal(sanitizeSectionName('Obst & Gemüse', 'obst_gemüse'), undefined);
  });

  await t.test('preserves genuine culinary sub-recipes and components', () => {
    assert.equal(sanitizeSectionName('Für das Brot'), 'Für das Brot');
    assert.equal(sanitizeSectionName('  Sauce  '), 'Sauce');
    assert.equal(sanitizeSectionName('Dressing'), 'Dressing');
    assert.equal(sanitizeSectionName('Patties'), 'Patties');
    assert.equal(sanitizeSectionName('Marinade'), 'Marinade');
    assert.equal(sanitizeSectionName('Teig'), 'Teig');
    assert.equal(sanitizeSectionName('Anrichten'), 'Anrichten');
    assert.equal(sanitizeSectionName('Gemüse', 'MEAT_POULTRY'), 'Gemüse');
  });
});
