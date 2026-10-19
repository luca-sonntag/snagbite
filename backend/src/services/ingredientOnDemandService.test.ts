import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { resolveOrGenerateIngredientIcon } from './ingredientOnDemandService.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';

describe('resolveOrGenerateIngredientIcon', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ondemand-icons-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const dummyKnownItem: CanonicalIngredient = {
    id: 'black_garlic',
    product_code: 'black_garlic',
    name_de: 'Schwarzer Knoblauch',
    name_en: 'black garlic',
    category: 'FRUITS_VEGETABLES',
    nutrients_per_100g: { calories: 140, protein: 6, carbs: 28, fat: 0.5, fiber: 2 },
    aliases: ['black garlic'],
  };

  test('returns existing local file immediately without calling S3 or generator (L1 hit)', async () => {
    fs.writeFileSync(path.join(tmpDir, 'black_garlic.webp'), 'cached-webp');
    let genCalled = 0;

    const res = await resolveOrGenerateIngredientIcon('black_garlic', undefined, tmpDir, {
      lookupKnownIngredient: async () => dummyKnownItem,
      generateIcon: async () => {
        genCalled++;
        throw new Error('Should not generate');
      },
    });

    assert.equal(res, 'black_garlic.webp');
    assert.equal(genCalled, 0);
  });

  test('rejects unknown ingredients without generating (cost protection)', async () => {
    let genCalled = 0;

    const res = await resolveOrGenerateIngredientIcon('random_nonsense_xyz', undefined, tmpDir, {
      lookupKnownIngredient: async () => null,
      fetchFromS3: async () => null,
      hasGeneratorKey: () => true,
      checkBudgetExhausted: () => false,
      generateIcon: async () => {
        genCalled++;
        throw new Error('Should not generate');
      },
    });

    assert.equal(res, null);
    assert.equal(genCalled, 0);
  });

  test('deduplicates concurrent on-demand requests for the same ingredient', async () => {
    let genCount = 0;

    const deps = {
      lookupKnownIngredient: async () => dummyKnownItem,
      fetchFromS3: async () => null,
      hasGeneratorKey: () => true,
      checkBudgetExhausted: () => false,
      generateIcon: async (item: CanonicalIngredient) => {
        genCount++;
        await new Promise((r) => setTimeout(r, 40));
        const filename = `${item.id}.webp`;
        const filePath = path.join(tmpDir, filename);
        fs.writeFileSync(filePath, 'generated-webp');
        return {
          ingredientId: item.id,
          filename,
          filePath,
          prompt: 'test prompt',
          durationMs: 40,
          sizeKb: 12,
          uploadedToS3: true,
          costs: {
            gemini: { model: 'gemini', promptTokens: 10, candidatesTokens: 10, totalTokens: 20, costUsd: 0.0001 },
            flux: { model: 'flux-1/schnell', steps: 4, size: 'square_hd', costUsd: 0.0035 },
            bgbusterCostUsd: 0.0035,
            totalCostUsd: 0.0071,
          },
        };
      },
    };

    const [r1, r2, r3] = await Promise.all([
      resolveOrGenerateIngredientIcon('black_garlic', undefined, tmpDir, deps),
      resolveOrGenerateIngredientIcon('black_garlic', undefined, tmpDir, deps),
      resolveOrGenerateIngredientIcon('black_garlic', undefined, tmpDir, deps),
    ]);

    assert.equal(r1, 'black_garlic.webp');
    assert.equal(r2, 'black_garlic.webp');
    assert.equal(r3, 'black_garlic.webp');
    assert.equal(genCount, 1);
  });

  test('skips generation when daily budget is exhausted', async () => {
    let genCount = 0;

    const res = await resolveOrGenerateIngredientIcon('black_garlic', undefined, tmpDir, {
      lookupKnownIngredient: async () => dummyKnownItem,
      fetchFromS3: async () => null,
      hasGeneratorKey: () => true,
      checkBudgetExhausted: () => true,
      generateIcon: async () => {
        genCount++;
        throw new Error('Should not generate');
      },
    });

    assert.equal(res, null);
    assert.equal(genCount, 0);
  });
});
