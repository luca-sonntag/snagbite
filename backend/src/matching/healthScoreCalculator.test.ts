import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecipeHealthScore } from './healthScoreCalculator.js';
import type { Recipe } from '@cookbook/shared';

describe('healthScoreCalculator', () => {
  it('calculates a high health score for a vegetable and fiber rich bowl', () => {
    const recipe: Recipe = {
      title: 'Mediterranean Veggie & Chickpea Bowl',
      description: 'Fresh vegetables with chickpeas and olive oil',
      servings: 2,
      ingredients: [
        {
          name: 'VEGETABLES',
          items: [
            { name: 'Brokkoli', amount: 300, unit: 'g', calories: 100, protein: 9, carbs: 12, fat: 1, fiber: 9, novaGroup: 1 },
            { name: 'Tomaten', amount: 200, unit: 'g', calories: 36, protein: 2, carbs: 8, fat: 0.4, fiber: 3, novaGroup: 1 },
            { name: 'Gurke', amount: 150, unit: 'g', calories: 22, protein: 1, carbs: 4, fat: 0.2, fiber: 1.5, novaGroup: 1 },
            { name: 'Rote Zwiebel', amount: 50, unit: 'g', calories: 20, protein: 0.5, carbs: 4, fat: 0.1, fiber: 1, novaGroup: 1 },
          ],
        },
        {
          name: 'GRAINS_PASTA',
          items: [
            { name: 'Kichererbsen', amount: 200, unit: 'g', calories: 260, protein: 14, carbs: 36, fat: 5, fiber: 12, novaGroup: 1 },
          ],
        },
        {
          name: 'OILS_CONDIMENTS',
          items: [
            { name: 'Olivenöl', amount: 15, unit: 'ml', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0, novaGroup: 2 },
          ],
        },
      ],
      nutritionalValues: {
        calories: 279,
        protein: 13.3,
        carbs: 32,
        fat: 10.3,
        fiber: 13.2,
        sugar: 4.5,
      },
      instructions: [],
      equipment: [],
      prepTime: 15,
      cookTime: 10,
    };

    const { score, breakdown } = computeRecipeHealthScore(recipe);

    assert.ok(score >= 80, `Expected score >= 80, got ${score}`);
    assert.equal(breakdown.grade, score >= 85 ? 'EXCELLENT' : 'BALANCED');
    assert.ok(breakdown.metrics.vegetableGramsPerServing! >= 200, 'Expected >= 200g veg per serving');
    assert.ok(breakdown.metrics.fiberGramsPerServing! >= 10, 'Expected high fiber');
    assert.ok(breakdown.metrics.plantIngredientsCount! >= 4, 'Expected multiple plant ingredients');
    assert.ok(breakdown.highlights.length > 0, 'Should have positive highlights');
  });

  it('calculates a lower health score for high-sugar, low-fiber, ultra-processed dish', () => {
    const recipe: Recipe = {
      title: 'Ultra Chocolate Glazed Donuts',
      description: 'Fried donuts with sweet frosting',
      servings: 2,
      ingredients: [
        {
          name: 'PANTRY_BAKING',
          items: [
            { name: 'Weißmehl', amount: 200, unit: 'g', calories: 700, protein: 20, carbs: 144, fat: 2, fiber: 4, novaGroup: 2 },
            { name: 'Raffinierter Zucker', amount: 100, unit: 'g', calories: 400, protein: 0, carbs: 100, fat: 0, fiber: 0, novaGroup: 2 },
          ],
        },
        {
          name: 'SWEETS_SNACKS',
          items: [
            { name: 'Schokoglasur', amount: 80, unit: 'g', calories: 440, protein: 4, carbs: 50, fat: 26, fiber: 2, novaGroup: 4 },
          ],
        },
        {
          name: 'OILS_CONDIMENTS',
          items: [
            { name: 'Frittierfett', amount: 60, unit: 'g', calories: 540, protein: 0, carbs: 0, fat: 60, fiber: 0, novaGroup: 4 },
          ],
        },
      ],
      nutritionalValues: {
        calories: 1040,
        protein: 12,
        carbs: 147,
        fat: 44,
        fiber: 3,
        sugar: 65,
      },
      instructions: [],
      equipment: [],
      prepTime: 20,
      cookTime: 15,
    };

    const { score, breakdown } = computeRecipeHealthScore(recipe);

    assert.ok(score <= 45, `Expected score <= 45 for deep-fried sugary donuts, got ${score}`);
    assert.ok(breakdown.cautions.length > 0, 'Should have warnings for sugar or processing');
    assert.ok(breakdown.smartSwapTip !== null, 'Should suggest healthier adjustments');
  });

  it('safely handles empty or missing ingredients without throwing', () => {
    const emptyRecipe: Recipe = {
      title: 'Minimal Placeholder Recipe',
      description: '',
      servings: 1,
      ingredients: [],
      instructions: [],
      equipment: [],
      prepTime: null,
      cookTime: null,
    };

    const result = computeRecipeHealthScore(emptyRecipe);
    assert.ok(typeof result.score === 'number');
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(result.breakdown.pillars.macroBalance.score >= 0);
  });
});
