import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDailyRotatedRecipes } from './publicRecipesDb.js';
import type { Recipe } from '@cookbook/shared';

describe('getDailyRotatedRecipes', () => {
  const dummyRecipes: Recipe[] = [
    { title: 'Recipe A', description: '', prepTime: 10, cookTime: 10, servings: 2, ingredients: [], instructions: [], equipment: [] },
    { title: 'Recipe B', description: '', prepTime: 10, cookTime: 10, servings: 2, ingredients: [], instructions: [], equipment: [] },
    { title: 'Recipe C', description: '', prepTime: 10, cookTime: 10, servings: 2, ingredients: [], instructions: [], equipment: [] },
    { title: 'Recipe D', description: '', prepTime: 10, cookTime: 10, servings: 2, ingredients: [], instructions: [], equipment: [] },
  ];

  it('returns all recipes if count <= 2', () => {
    const two = dummyRecipes.slice(0, 2);
    const result = getDailyRotatedRecipes(two, new Date('2026-09-06'), 2);
    assert.equal(result.length, 2);
    assert.deepEqual(result.map(r => r.title), ['Recipe A', 'Recipe B']);
  });

  it('rotates recipes deterministically according to day seed', () => {
    const day1 = new Date('2026-09-06T12:00:00Z');
    const day2 = new Date('2026-09-07T12:00:00Z');

    const result1 = getDailyRotatedRecipes(dummyRecipes, day1, 2);
    const result2 = getDailyRotatedRecipes(dummyRecipes, day2, 2);

    assert.equal(result1.length, 2);
    assert.equal(result2.length, 2);
    assert.notDeepEqual(result1.map(r => r.title), result2.map(r => r.title));

    // Same day should yield identical result
    const result1Repeat = getDailyRotatedRecipes(dummyRecipes, new Date('2026-09-06T23:59:59Z'), 2);
    assert.deepEqual(result1.map(r => r.title), result1Repeat.map(r => r.title));
  });
});
