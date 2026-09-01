import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseManualIngredientList } from './aiIngredientGenerator.js';

describe('aiIngredientGenerator', () => {
  test('parseManualIngredientList parses comma-separated names into ResolverInput array', () => {
    const raw = 'Gouda, Rinderhackfleisch,  Schnittlauch ,  , Olivenöl';
    const parsed = parseManualIngredientList(raw);

    assert.equal(parsed.length, 4);
    assert.equal(parsed[0].name, 'Gouda');
    assert.equal(parsed[0].baseName, 'gouda');
    assert.equal(parsed[1].name, 'Rinderhackfleisch');
    assert.equal(parsed[2].name, 'Schnittlauch');
    assert.equal(parsed[3].name, 'Olivenöl');
  });

  test('parseManualIngredientList handles empty input gracefully', () => {
    const parsed = parseManualIngredientList('');
    assert.deepEqual(parsed, []);
  });
});
