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
});
