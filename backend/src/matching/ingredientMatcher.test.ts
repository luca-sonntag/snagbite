import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findCanonicalIngredient,
  normalizeSearchTerm,
  normalizeUnit,
  calculateWeightGrams,
  enrichRecipeWithCanonicalIngredients,
  toEnglishSingular,
} from './ingredientMatcher.js';
import type { Recipe } from '../types.js';

describe('Ingredient Matcher & Normalizer (BLS 4.0 + Hybrid Search)', () => {
  describe('toEnglishSingular', () => {
    test('safely converts regular and irregular plurals without breaking words ending in s/ss/us/se', () => {
      // Plural to singular conversions
      assert.equal(toEnglishSingular('eggs'), 'egg');
      assert.equal(toEnglishSingular('onions'), 'onion');
      assert.equal(toEnglishSingular('carrots'), 'carrot');
      assert.equal(toEnglishSingular('potatoes'), 'potato');
      assert.equal(toEnglishSingular('tomatoes'), 'tomato');
      assert.equal(toEnglishSingular('strawberries'), 'strawberry');
      assert.equal(toEnglishSingular('raspberries'), 'raspberry');
      assert.equal(toEnglishSingular('leaves'), 'leaf');
      assert.equal(toEnglishSingular('shrimps'), 'shrimp');

      // Words ending in s/ss/us/is/se that MUST NOT be truncated
      assert.equal(toEnglishSingular('cheese'), 'cheese');
      assert.equal(toEnglishSingular('hummus'), 'hummus');
      assert.equal(toEnglishSingular('asparagus'), 'asparagus');
      assert.equal(toEnglishSingular('couscous'), 'couscous');
      assert.equal(toEnglishSingular('watercress'), 'watercress');
    });
  });

  describe('normalizeSearchTerm', () => {
    test('cleans parentheses, comma suffixes and extra modifiers', () => {
      assert.equal(normalizeSearchTerm('Zwiebel (fein gewürfelt)'), 'zwiebel');
      assert.equal(normalizeSearchTerm('Knoblauchzehe, gepresst'), 'knoblauchzehe');
      assert.equal(normalizeSearchTerm('Hähnchenbrustfilet (Bio-Qualität)'), 'hähnchenbrustfilet');
      assert.equal(normalizeSearchTerm('Olivenöl extra vergine'), 'olivenöl extra vergine');
    });
  });

  describe('normalizeUnit', () => {
    test('normalizes German and English culinary units', () => {
      assert.equal(normalizeUnit('g'), 'g');
      assert.equal(normalizeUnit('Gramm'), 'g');
      assert.equal(normalizeUnit('EL'), 'tablespoon');
      assert.equal(normalizeUnit('TL'), 'teaspoon');
      assert.equal(normalizeUnit('Stück'), 'piece');
      assert.equal(normalizeUnit('Zehe'), 'clove');
      assert.equal(normalizeUnit('Prise'), 'pinch');
    });
  });

  describe('findCanonicalIngredient', () => {
    test('matches German staples to BLS 4.0 database', async () => {
      const garlic = await findCanonicalIngredient('Knoblauchzehen', 'garlic', 'FRUITS_VEGETABLES', [], ['Knoblauch']);
      assert.ok(garlic);
      assert.ok(garlic.name_de.toLowerCase().includes('knoblauch'));

      const chicken = await findCanonicalIngredient('Hähnchenbrustfilet', 'chicken breast', 'MEAT_FISH', [], ['Hähnchenbrustfilet', 'Hähnchen Brustfilet']);
      assert.ok(chicken);
      assert.ok(chicken.name_de.toLowerCase().includes('hähnchen'));

      const onion = await findCanonicalIngredient('rote Zwiebel', 'onion', 'FRUITS_VEGETABLES', [], ['Zwiebel']);
      assert.ok(onion);
      assert.ok(onion.name_de.toLowerCase().includes('zwiebel'));

      const oats = await findCanonicalIngredient('Haferflocken', 'rolled oats', 'GRAINS_PASTA', [], ['Haferflocken']);
      assert.ok(oats);
      assert.ok(oats.name_de.toLowerCase().includes('hafer'));

      const egg = await findCanonicalIngredient('Eier', 'egg', 'DAIRY', [], ['Hühnerei', 'Ei']);
      assert.ok(egg);
      assert.ok(egg.name_de.toLowerCase().includes('ei'));
    });

    test('prefers lean variant when mager/lean is requested', async () => {
      const leanQuark = await findCanonicalIngredient('Magerquark', 'quark', 'DAIRY', ['Speisequark mager'], ['Magerquark', 'Speisequark mager']);
      assert.ok(leanQuark);
      assert.ok(leanQuark.name_de.toLowerCase().includes('mager') || leanQuark.name_de.toLowerCase().includes('quark'));
      assert.ok(leanQuark.nutrients_per_100g.fat <= 1.0);
    });

    test('matches cheeses like Gouda or Mozzarella', async () => {
      const gouda = await findCanonicalIngredient('Gouda gerieben', 'gouda', 'DAIRY', [], ['Gouda']);
      assert.ok(gouda);
      assert.ok(gouda.name_de.toLowerCase().includes('gouda'));
    });

    test('matches meat staples like Rinderhackfleisch', async () => {
      const beef = await findCanonicalIngredient('Rinderhack', 'ground beef', 'MEAT_FISH', [], ['Rinderhackfleisch', 'Rinderhack']);
      assert.ok(beef);
      assert.ok(beef.name_de.toLowerCase().includes('rind'));
    });

    test('returns null for unlisted exotic fantasy ingredients', async () => {
      const exotic = await findCanonicalIngredient('Unbekannte Fantasie-Geheimsauce XYZ 999', 'secret exotic fantasy sauce');
      assert.equal(exotic, null);
    });
  });

  describe('calculateWeightGrams', () => {
    test('calculates grams from piece/clove standard weights', async () => {
      const garlic = await findCanonicalIngredient('Knoblauch', 'garlic', 'FRUITS_VEGETABLES', [], ['Knoblauch']);
      assert.ok(garlic);
      const weight = calculateWeightGrams(2, 'clove', garlic);
      assert.equal(weight, 6); // 2 cloves * 3g = 6g
    });

    test('calculates grams from volume with density', async () => {
      const oil = await findCanonicalIngredient('Olivenöl', 'olive oil', 'SPICES_OILS', [], ['Olivenöl']);
      assert.ok(oil);
      const weight = calculateWeightGrams(2, 'tablespoon', oil);
      assert.equal(weight, 24); // 2 * 12g = 24g
    });
  });

  describe('enrichRecipeWithCanonicalIngredients', () => {
    test('enriches all recipe ingredients and aggregates per-serving macros', async () => {
      const recipe: Recipe = {
        title: 'Protein-Snack',
        description: 'Test Recipe',
        prepTime: 5,
        cookTime: 0,
        servings: 2,
        ingredients: [
          {
            name: 'Zutaten',
            items: [
              { name: 'Magerquark', baseName: 'quark', amount: 200, unit: 'g', category: 'DAIRY', searchQueries: ['Magerquark', 'Speisequark mager'] },
              { name: 'Haferflocken', baseName: 'rolled oats', amount: 100, unit: 'g', category: 'GRAINS_PASTA', searchQueries: ['Haferflocken'] },
              { name: 'Geheimpulver', amount: 10, unit: 'g', calories: 40, protein: 5, carbs: 2, fat: 1 },
            ],
          },
        ],
        instructions: [{ step: 1, description: 'Mixen' }],
        equipment: ['Schüssel'],
      };

      await enrichRecipeWithCanonicalIngredients(recipe);

      const items = recipe.ingredients[0].items;
      assert.equal(items[0].isVerified, true);
      assert.ok(items[0].canonicalId);
      assert.ok((items[0].calories ?? 0) > 100);

      assert.equal(items[1].isVerified, true);
      assert.ok(items[1].canonicalId);
      assert.ok((items[1].calories ?? 0) > 300);

      assert.equal(items[2].isVerified, false);
      assert.equal(items[2].canonicalId, undefined);

      assert.ok(recipe.nutritionalValues);
      assert.ok(recipe.nutritionalValues.calories > 200);
      assert.ok(recipe.nutritionalValues.protein > 15);
    });
  });
});
