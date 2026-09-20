import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRecommendedShelf, totalRecipeMinutes } from './recommendations.js';
import type { SharedSavedRecipe } from './types.js';

function makeRecipe(
  id: string,
  title: string,
  prepTime: number,
  cookTime: number,
  tags: string[] = [],
  ingredients: string[] = [],
  addedAt: string = new Date().toISOString(),
  isFavorite: boolean = false
): SharedSavedRecipe {
  return {
    recipeId: id,
    addedAt,
    isFavorite,
    recipe: {
      title,
      prepTime,
      cookTime,
      tags,
      ingredients: [
        {
          name: 'Zutaten',
          items: ingredients.map((name) => ({ name, baseName: name })),
        },
      ],
    },
  };
}

describe('Smart Recommendation Engine', () => {
  it('computes total recipe minutes correctly', () => {
    assert.equal(totalRecipeMinutes(null), 0);
    assert.equal(totalRecipeMinutes({ title: 'Test', prepTime: 10, cookTime: 15 }), 25);
    assert.equal(totalRecipeMinutes({ title: 'Test', prepTime: '10 Min.', cookTime: '20' }), 30);
    assert.equal(totalRecipeMinutes({ title: 'Test', prepTime: undefined, cookTime: null }), 0);
  });

  it('returns null if fewer than 2 valid recipes exist', () => {
    const singleRecipe = [makeRecipe('1', 'Pasta', 10, 10)];
    assert.equal(getRecommendedShelf(singleRecipe), null);
  });

  it('boosts Quick Dinners / Week-Ahead Prep on Monday', () => {
    const mondayNoon = new Date('2026-08-24T12:00:00Z'); // Monday in August (Summer)
    const recipes = [
      makeRecipe('1', 'Blitz-Nudeln', 5, 10, ['schnell'], ['pasta', 'tomaten']),
      makeRecipe('2', 'Schnelle Gemüsepfanne', 5, 15, ['schnell'], ['zucchini', 'paprika']),
      makeRecipe('3', 'Sommerlicher Salat', 10, 0, ['sommer'], ['gurke', 'tomate']),
      makeRecipe('4', 'Braten', 20, 60, ['festlich'], ['fleisch']),
    ];

    const result = getRecommendedShelf(recipes, { now: mondayNoon });
    assert.ok(result);
    assert.equal(result.themeId, 'quick_dinner');
    assert.equal(result.titleKey, 'catalog.recommendations.quickDinner');
  });

  it('boosts Seasonal Produce on Tuesday', () => {
    const tuesday = new Date('2026-08-25T14:00:00Z'); // Tuesday in August (Summer)
    const recipes = [
      makeRecipe('1', 'Sommerliche Tomatensuppe', 10, 15, ['sommer'], ['tomate', 'basilikum']),
      makeRecipe('2', 'Zucchini Puffer', 10, 15, ['gemüse'], ['zucchini', 'ei']),
      makeRecipe('3', 'Schnelle Nudeln', 5, 10, ['pasta'], ['pasta']),
      makeRecipe('4', 'Blitz Toast', 5, 5, ['snack'], ['brot', 'käse']),
    ];

    const result = getRecommendedShelf(recipes, { now: tuesday });
    assert.ok(result);
    assert.equal(result.themeId, 'seasonal_summer');
  });

  it('boosts Rediscovery on Wednesday for recipes saved > 21 days ago', () => {
    const wednesday = new Date('2026-08-26T18:00:00Z'); // Wednesday
    const sixtyDaysAgo = new Date('2026-06-25T12:00:00Z').toISOString();
    const recipes = [
      makeRecipe('1', 'Vergessener Auflauf', 15, 30, [], ['nudeln', 'käse'], sixtyDaysAgo, true),
      makeRecipe('2', 'Altes Curry', 15, 20, [], ['reis', 'curry'], sixtyDaysAgo, false),
      makeRecipe('3', 'Schneller Snack', 5, 5, [], ['brot']),
      makeRecipe('4', 'Blitz-Suppe', 5, 10, [], ['gemüse']),
    ];

    const result = getRecommendedShelf(recipes, { now: wednesday });
    assert.ok(result);
    assert.equal(result.themeId, 'rediscovery');
  });

  it('boosts Pasta Classics on Thursday', () => {
    const thursday = new Date('2026-08-27T17:00:00Z'); // Thursday
    const recipes = [
      makeRecipe('1', 'Spaghetti Carbonara', 10, 15, ['pasta'], ['spaghetti', 'ei', 'speck']),
      makeRecipe('2', 'Penne all Arrabbiata', 10, 15, ['pasta'], ['penne', 'tomaten', 'chili']),
      makeRecipe('3', 'Sommer-Salat', 10, 0, ['salat'], ['gurke', 'tomate']),
      makeRecipe('4', 'Gegrilltes Steak', 10, 15, ['grill'], ['steak']),
    ];

    const result = getRecommendedShelf(recipes, { now: thursday });
    assert.ok(result);
    assert.equal(result.themeId, 'pasta_classics');
  });

  it('boosts Comfort Food on Friday', () => {
    const friday = new Date('2026-08-28T19:00:00Z'); // Friday Evening
    const recipes = [
      makeRecipe('1', 'Smash Burger', 10, 10, ['comfort'], ['burger', 'käse', 'pommes']),
      makeRecipe('2', 'Crispy Pizza', 15, 15, ['comfort'], ['pizza', 'mozzarella']),
      makeRecipe('3', 'Sommer Tomatensalat', 10, 0, ['sommer'], ['tomate']),
      makeRecipe('4', 'Gedämpftes Gemüse', 10, 10, ['leicht'], ['brokkoli']),
    ];

    const result = getRecommendedShelf(recipes, { now: friday });
    assert.ok(result);
    assert.equal(result.themeId, 'friday_comfort');
  });

  it('boosts Weekend Brunch on Saturday Morning', () => {
    const saturdayMorning = new Date('2026-08-29T09:00:00Z'); // Saturday 9am
    const recipes = [
      makeRecipe('1', 'Fluffy Pancakes', 10, 10, ['brunch'], ['pancake', 'ahornsirup']),
      makeRecipe('2', 'Avocado Rührei Toast', 5, 5, ['brunch'], ['rührei', 'avocado', 'toast']),
      makeRecipe('3', 'Schnelle Nudeln', 5, 10, [], ['pasta']),
      makeRecipe('4', 'Blitz Snack', 5, 5, [], ['käse']),
    ];

    const result = getRecommendedShelf(recipes, { now: saturdayMorning });
    assert.ok(result);
    assert.equal(result.themeId, 'weekend_brunch');
  });

  it('boosts True Holidays to Top Priority over all weekdays', () => {
    const christmasEve = new Date('2026-12-24T18:00:00Z'); // Christmas Eve
    const recipes = [
      makeRecipe('1', 'Festlicher Gänsebraten', 30, 120, ['weihnachten'], ['gans', 'knödel', 'rotkohl']),
      makeRecipe('2', 'Vanillekipferl Plätzchen', 20, 15, ['weihnachten'], ['plätzchen', 'zimt', 'vanillekipferl']),
      makeRecipe('3', 'Schnelle Pasta', 5, 10, ['pasta'], ['pasta']),
      makeRecipe('4', 'Blitz Burger', 5, 10, ['burger'], ['burger']),
    ];

    const result = getRecommendedShelf(recipes, { now: christmasEve });
    assert.ok(result);
    assert.equal(result.themeId, 'holiday_christmas');
  });

  it('boosts Comfort Food on Saturday late night / Sunday early morning', () => {
    const saturdayLateNight = new Date('2026-08-30T00:15:00+02:00'); // Sunday 00:15 local time (Saturday late night)
    const recipes = [
      makeRecipe('1', 'Midnight Burger', 10, 10, ['comfort'], ['burger', 'käse', 'pommes']),
      makeRecipe('2', 'Crispy Pizza', 15, 15, ['comfort'], ['pizza', 'mozzarella']),
      makeRecipe('3', 'Schnelle Nudeln', 5, 10, [], ['pasta']),
      makeRecipe('4', 'Blitz Snack', 5, 5, [], ['brot']),
    ];

    const result = getRecommendedShelf(recipes, { now: saturdayLateNight });
    assert.ok(result);
    assert.equal(result.themeId, 'weekend_comfort');
    assert.equal(result.titleKey, 'catalog.recommendations.weekendComfort');
  });

  it('boosts Week Ahead ideas on Sunday late afternoon/evening', () => {
    const sundayEvening = new Date('2026-08-30T18:00:00+02:00'); // Sunday 18:00
    const recipes = [
      makeRecipe('1', 'Blitz-Nudeln', 5, 10, ['schnell'], ['pasta', 'tomaten']),
      makeRecipe('2', 'Schnelle Gemüsepfanne', 5, 15, ['schnell'], ['zucchini', 'paprika']),
      makeRecipe('3', 'Sommerlicher Salat', 10, 0, ['sommer'], ['gurke', 'tomate']),
      makeRecipe('4', 'Braten', 20, 60, ['festlich'], ['fleisch']),
    ];

    const result = getRecommendedShelf(recipes, { now: sundayEvening });
    assert.ok(result);
    assert.equal(result.themeId, 'week_ahead');
    assert.equal(result.titleKey, 'catalog.recommendations.weekAhead');
  });

  it('gracefully falls back when primary theme lacks matching recipes', () => {
    const thursday = new Date('2026-08-27T17:00:00Z'); // Thursday (Pasta Day)
    // No pasta recipes in the collection, only seasonal summer recipes
    const recipes = [
      makeRecipe('1', 'Gegrillte Zucchini', 10, 10, ['sommer'], ['zucchini', 'knoblauch']),
      makeRecipe('2', 'Frischer Tomaten-Wassermelonen Salat', 10, 0, ['sommer'], ['tomate', 'wassermelone']),
    ];

    const result = getRecommendedShelf(recipes, { now: thursday });
    assert.ok(result);
    assert.equal(result.themeId, 'seasonal_summer');
  });
});
