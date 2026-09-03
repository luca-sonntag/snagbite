import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  lookupMapping,
  storeMapping,
  invalidateCache,
} from './mappingStore.js';

describe('mappingStore canonical 1-row lookup', () => {
  beforeEach(() => {
    invalidateCache();
  });

  test('resolves seamlessly across English key, German key, and aliases from cache', async () => {
    await storeMapping(
      {
        mappingKey: 'carrot',
        mappingKeyDe: 'karotte',
        aliases: ['möhre', 'wurzel', 'carrots'],
        category: 'PRODUCE',
      },
      {
        productCode: '4039057417598',
        resolution: 'matched',
        estimatedNutrients: null,
        typicalPackageAmount: 500,
        typicalPackageUnit: 'g',
        shelfLifeDays: 14,
        source: 'agent',
        confidence: 0.95,
        model: 'gemini-2.5-flash',
        reasoning: 'Standard Karotte',
      }
    );

    // 1. English primary key lookup
    const enHit = await lookupMapping(['carrot'], 'PRODUCE');
    assert.ok(enHit);
    assert.equal(enHit.mappingKey, 'carrot');
    assert.equal(enHit.mappingKeyDe, 'karotte');
    assert.equal(enHit.productCode, '4039057417598');

    // 2. German canonical key lookup
    const deHit = await lookupMapping(['karotte'], 'PRODUCE');
    assert.ok(deHit);
    assert.equal(deHit.mappingKey, 'carrot');
    assert.equal(deHit.mappingKeyDe, 'karotte');

    // 3. Synonym alias lookup
    const aliasHit = await lookupMapping(['möhre'], 'PRODUCE');
    assert.ok(aliasHit);
    assert.equal(aliasHit.mappingKey, 'carrot');

    // 4. Another alias
    const wurzelHit = await lookupMapping(['wurzel'], 'PRODUCE');
    assert.ok(wurzelHit);
    assert.equal(wurzelHit.mappingKey, 'carrot');

    // 5. Unknown key returns null
    const miss = await lookupMapping(['fantasy_berry'], 'PRODUCE');
    assert.equal(miss, null);
  });

  test('enforces category isolation between incompatible categories (SPICES vs PRODUCE)', async () => {
    // Store pepper under PRODUCE (e.g. bell pepper)
    await storeMapping(
      {
        mappingKey: 'pepper',
        mappingKeyDe: 'paprika',
        aliases: ['bell pepper', 'sweet pepper'],
        category: 'PRODUCE',
      },
      {
        productCode: '4388844031814',
        resolution: 'matched',
        estimatedNutrients: null,
        typicalPackageAmount: 1,
        typicalPackageUnit: 'Stück',
        shelfLifeDays: 7,
        source: 'agent',
        confidence: 0.9,
        model: 'gemini-2.5-flash',
        reasoning: 'Paprika Gemüse',
      }
    );

    // Store black pepper under SPICES_SEASONINGS
    await storeMapping(
      {
        mappingKey: 'black pepper',
        mappingKeyDe: 'pfeffer',
        aliases: ['schwarzer pfeffer', 'black peppercorn'],
        category: 'SPICES_SEASONINGS',
      },
      {
        productCode: '3379140028173',
        resolution: 'matched',
        estimatedNutrients: null,
        typicalPackageAmount: 50,
        typicalPackageUnit: 'g',
        shelfLifeDays: 365,
        source: 'agent',
        confidence: 0.95,
        model: 'gemini-2.5-flash',
        reasoning: 'Schwarzer Pfeffer Gewürz',
      }
    );

    // Looking up SPICES_SEASONINGS with key 'pfeffer' must NOT match PRODUCE pepper
    const spiceHit = await lookupMapping(['pfeffer', 'black pepper'], 'SPICES_SEASONINGS');
    assert.ok(spiceHit);
    assert.equal(spiceHit.mappingKey, 'black pepper');
    assert.equal(spiceHit.category, 'SPICES_SEASONINGS');

    // Looking up PRODUCE with key 'paprika' must NOT match SPICES black pepper
    const produceHit = await lookupMapping(['paprika', 'bell pepper'], 'PRODUCE');
    assert.ok(produceHit);
    assert.equal(produceHit.mappingKey, 'pepper');
    assert.equal(produceHit.category, 'PRODUCE');

    // Cross-category lookups with unmapped keys in different categories must return null
    const crossMiss = await lookupMapping(['pepper'], 'DAIRY');
    assert.equal(crossMiss, null);
  });
});
