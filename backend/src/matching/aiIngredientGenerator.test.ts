import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseManualIngredientList } from './aiIngredientGenerator.js';

describe('aiIngredientGenerator', () => {
  test('parseManualIngredientList parses comma-separated names into ResolverInput array', () => {
    const raw = 'Gouda, Rinderhackfleisch,  Schnittlauch ,  , Olivenöl';
    const { inputs, skippedCount } = parseManualIngredientList(raw);

    assert.equal(inputs.length, 4);
    assert.equal(skippedCount, 0);
    assert.equal(inputs[0].name, 'Gouda');
    assert.equal(inputs[0].baseName, 'gouda');
    assert.equal(inputs[1].name, 'Rinderhackfleisch');
    assert.equal(inputs[2].name, 'Schnittlauch');
    assert.equal(inputs[3].name, 'Olivenöl');
  });

  test('parseManualIngredientList filters out existing keys and duplicates', () => {
    const raw = 'Gouda, gouda, Rinderhackfleisch, Butter';
    const existing = new Set(['butter']);
    const { inputs, skippedCount } = parseManualIngredientList(raw, existing);

    assert.equal(inputs.length, 2);
    assert.equal(skippedCount, 2); // 1 duplicate gouda, 1 existing butter
    assert.equal(inputs[0].name, 'Gouda');
    assert.equal(inputs[1].name, 'Rinderhackfleisch');
  });

  test('parseManualIngredientList strips noise words like fresh from baseName', () => {
    const raw = 'Fresh Cilantro, Large Egg, Chopped Walnuts';
    const { inputs } = parseManualIngredientList(raw);

    assert.equal(inputs[0].baseName, 'cilantro');
    assert.equal(inputs[1].baseName, 'egg');
    assert.equal(inputs[2].baseName, 'walnut');
  });

  test('parseManualIngredientList handles empty input gracefully', () => {
    const { inputs, skippedCount } = parseManualIngredientList('');
    assert.deepEqual(inputs, []);
    assert.equal(skippedCount, 0);
  });
});
