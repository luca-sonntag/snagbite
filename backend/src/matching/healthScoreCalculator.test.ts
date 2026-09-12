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

  it('correctly recognizes vegetables with category FRUITS_VEGETABLES (e.g. Brokkoli in Gnocchi-Auflauf)', () => {
    const recipe: Recipe = {
      title: 'High Protein Gnocchi-Auflauf',
      description: 'Gnocchi bake with broccoli and protein sauce',
      servings: 3,
      ingredients: [
        {
          name: 'Zutaten',
          items: [
            {
              name: 'Brokkoli',
              amount: 230,
              unit: 'g',
              baseName: 'broccoli',
              category: 'FRUITS_VEGETABLES',
              calories: 60,
              protein: 6.2,
              carbs: 4.1,
              fat: 0.7,
              fiber: 6.7,
              gramsPerUnit: 1,
              novaGroup: 1,
            },
            {
              name: 'Gnocchi',
              amount: 400,
              unit: 'g',
              baseName: 'gnocchi',
              category: 'GRAINS_PASTA',
              calories: 540,
              protein: 12,
              carbs: 110,
              fat: 2,
              fiber: 4,
              novaGroup: 3,
            },
            {
              name: 'Hähnchenbrust',
              amount: 400,
              unit: 'g',
              baseName: 'chicken breast',
              category: 'MEAT_POULTRY',
              calories: 440,
              protein: 92,
              carbs: 0,
              fat: 8,
              fiber: 0,
              novaGroup: 1,
            },
            {
              name: 'Tomatensauce',
              amount: 400,
              unit: 'g',
              baseName: 'tomato sauce',
              category: 'FRUITS_VEGETABLES',
              calories: 120,
              protein: 4,
              carbs: 18,
              fat: 1,
              fiber: 6,
              novaGroup: 2,
            },
          ],
        },
      ],
      nutritionalValues: {
        calories: 618,
        protein: 60,
        carbs: 45,
        fat: 15,
        fiber: 3.7,
        sugar: 4.1,
      },
      instructions: [],
      equipment: [],
      prepTime: 15,
      cookTime: 22,
    };

    const { score, breakdown } = computeRecipeHealthScore(recipe);
    // (230g Brokkoli + 400g Tomatensauce) / 3 servings = 210g veg per serving
    assert.ok(breakdown.metrics.vegetableGramsPerServing! >= 200, `Expected >= 200g veg, got ${breakdown.metrics.vegetableGramsPerServing}`);
    assert.ok(breakdown.metrics.plantIngredientsCount! >= 3, `Expected >= 3 plants, got ${breakdown.metrics.plantIngredientsCount}`);
    assert.ok(
      !breakdown.cautions.includes('Geringer Gemüseanteil (< 40g)'),
      'Should not caution low vegetables when recipe has abundant broccoli and tomato sauce'
    );
    assert.ok(score >= 65, `Expected score >= 65 for balanced high protein bake, got ${score}`);
  });

  it('rates high-protein, clean whole-food meals (e.g. protein omelette) as solid Grade C rather than punishing with D', () => {
    const recipe: Recipe = {
      title: 'Protein-Pizza-Omelett',
      description: 'High protein fitness breakfast',
      servings: 1,
      ingredients: [
        {
          name: 'DAIRY_EGGS',
          items: [
            { name: 'Gratinkäse light', amount: 100, unit: 'g', gramsPerUnit: 1, novaGroup: 1 },
            { name: 'Skyr', amount: 200, unit: 'g', gramsPerUnit: 1, sugar: 8.8, novaGroup: 1 },
            { name: 'Ei', amount: 2, unit: 'Stück', gramsPerUnit: 60, novaGroup: 1 },
          ],
        },
        {
          name: 'MEAT_POULTRY',
          items: [
            { name: 'Salami light', amount: 1, unit: 'Portion', gramsPerUnit: 25, sugar: 0.3, novaGroup: 1 },
          ],
        },
        {
          name: 'SPICES_HERBS',
          items: [
            { name: 'Pizzagewürz', amount: 1, unit: 'TL', gramsPerUnit: 5, novaGroup: 1 },
          ],
        },
      ],
      nutritionalValues: {
        calories: 610,
        protein: 66.3,
        carbs: 11.1,
        fat: 31.4,
        sugar: 9.1,
        fiber: null,
      },
      instructions: [],
      equipment: [],
    };

    const { score, breakdown } = computeRecipeHealthScore(recipe);
    assert.equal(breakdown.grade, 'SOLID', `Expected Grade SOLID (C), got ${breakdown.grade} (score: ${score})`);
    assert.ok(score >= 50 && score <= 60, `Expected score in 50-60 range, got ${score}`);
    assert.ok(
      breakdown.highlights.some((h) => h.includes('Eiweiß')),
      'Should highlight high protein content'
    );
    assert.ok(
      breakdown.cautions.includes('Geringer Gemüseanteil (< 40g)'),
      'Should still honestly caution lack of vegetables'
    );
  });
});

