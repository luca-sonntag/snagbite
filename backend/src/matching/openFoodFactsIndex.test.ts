import { test, describe } from 'node:test';
import assert from 'node:assert';
import { openFoodFactsAccess } from './openFoodFactsIndex.js';

describe('Open Food Facts Local SQLite Catalogue', () => {
  test('searches staples accurately with Purity-Boost ranking', () => {
    const hits = openFoodFactsAccess.search('Kartoffeln', undefined, 3);
    assert.ok(hits.length > 0, 'Should find hits for Kartoffeln');
    assert.ok(hits[0].name_de.toLowerCase().includes('kartoffel'), 'Top hit should be Kartoffel');
    assert.ok(hits[0].nutrients_per_100g.calories > 0, 'Should have positive calories');
    assert.ok(hits[0].nutrients_per_100g.calories < 120, 'Raw potato should be ~75 kcal, not chips');
  });

  test('finds branded trend items accurately', () => {
    const hits = openFoodFactsAccess.search('Eatlean', undefined, 3);
    assert.ok(hits.length > 0, 'Should find Eatlean');
    assert.ok(hits[0].name_de.toLowerCase().includes('eatlean'), 'Should contain brand Eatlean');
    assert.ok(hits[0].nutrients_per_100g.protein > 30, 'Eatlean should have >30g protein');
    assert.ok(hits[0].nutrients_per_100g.fat < 5, 'Eatlean should be low fat (<5g)');
  });

  test('finds Asian trend items like Reispapier', () => {
    const hits = openFoodFactsAccess.search('Reispapier', undefined, 3);
    assert.ok(hits.length > 0, 'Should find Reispapier');
    assert.ok(hits[0].nutrients_per_100g.carbs > 70, 'Reispapier should be carbohydrate dense');
  });

  test('finds German compound staples reliably (Butter, Quark, Hackfleisch, Mehl)', () => {
    // 1. Butter must return genuine dairy butter with ~82g fat, never peanut butter or buttermilk
    const butterHits = openFoodFactsAccess.search('Butter', undefined, 3);
    assert.ok(butterHits.length > 0, 'Should find Butter');
    assert.ok(butterHits[0].name_de.toLowerCase().includes('butter'), 'Should contain Butter');
    assert.ok(butterHits[0].nutrients_per_100g.fat > 75, 'Top butter hit must have >75g fat (pure dairy butter)');

    // 2. Quark
    const quarkHits = openFoodFactsAccess.search('Quark', undefined, 3);
    assert.ok(quarkHits.length > 0, 'Should find Quark');
    assert.ok(quarkHits[0].name_de.toLowerCase().includes('quark'), 'Should contain Quark');

    // 3. Hackfleisch
    const hackHits = openFoodFactsAccess.search('Hackfleisch', undefined, 3);
    assert.ok(hackHits.length > 0, 'Should find Hackfleisch');
    assert.ok(hackHits[0].name_de.toLowerCase().includes('hack'), 'Should contain Hack');
  });

  test('get resolves a product by its code/barcode', () => {
    const hits = openFoodFactsAccess.search('Butter', undefined, 1);
    assert.ok(hits.length > 0);
    const code = hits[0].product_code || hits[0].id;
    const direct = openFoodFactsAccess.get(code);
    assert.ok(direct !== null, 'Direct lookup by code should succeed');
    assert.strictEqual(direct?.id, code);
  });

  test('ranks pure staples higher than prepared dishes with prepositions or lengthy names', () => {
    const hits = openFoodFactsAccess.search('Hähnchenbrust', 'MEAT_FISH', 5);
    assert.ok(hits.length > 0, 'Should find Hähnchenbrust');
    assert.strictEqual(hits[0].name_de.toLowerCase().startsWith('hähnchenbrust'), true, 'Top hit must start with Hähnchenbrust');
    assert.strictEqual(hits[0].name_de.toLowerCase().includes(' mit '), false, 'Top hit must not be a combo dish with "mit"');
    assert.strictEqual(hits[0].name_de.toLowerCase().includes(' in '), false, 'Top hit must not be a combo dish with "in"');
    assert.ok(hits[0].nutrients_per_100g.protein >= 20, 'Raw chicken breast must be high protein (>=20g)');
    assert.ok(hits[0].nutrients_per_100g.fat <= 5, 'Raw chicken breast must be lean (<=5g fat)');
  });

  test('applies category soft boost when matching category is provided', () => {
    const hits = openFoodFactsAccess.search('Feta', 'DAIRY', 3);
    assert.ok(hits.length > 0, 'Should find Feta');
    assert.strictEqual(hits[0].category, 'DAIRY', 'Top hit should belong to DAIRY category');
  });

  test('returns empty array gracefully for complete fantasy terms', () => {
    const hits = openFoodFactsAccess.search('XylophoniumFantasyUnobtainium999', undefined, 3);
    assert.strictEqual(hits.length, 0);
  });
});

