import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  findCanonicalIngredient,
  matchAndEnrichIngredient,
  enrichRecipeWithCanonicalIngredients,
  normalizeSearchTerm,
  normalizeUnit,
  calculateWeightGrams,
} from './ingredientMatcher.js';
import type { Recipe, Ingredient } from '../types.js';

describe('Ingredient Matcher & Normalizer (BLS 4.0 + Fuse.js)', () => {
  describe('normalizeSearchTerm', () => {
    test('cleans parentheses, comma suffixes and extra modifiers', () => {
      assert.equal(normalizeSearchTerm('Zwiebel (gewürfelt)'), 'zwiebel');
      assert.equal(normalizeSearchTerm('Knoblauch, fein gehackt'), 'knoblauch');
      assert.equal(normalizeSearchTerm('  Rote Paprika  '), 'rote paprika');
    });
  });

  describe('normalizeUnit', () => {
    test('normalizes German and English culinary units', () => {
      assert.equal(normalizeUnit('EL'), 'tablespoon');
      assert.equal(normalizeUnit('TL'), 'teaspoon');
      assert.equal(normalizeUnit('Zehen'), 'clove');
      assert.equal(normalizeUnit('Stück'), 'piece');
      assert.equal(normalizeUnit('g'), 'g');
      assert.equal(normalizeUnit('ml'), 'ml');
      assert.equal(normalizeUnit('Prise'), 'pinch');
    });
  });

  describe('findCanonicalIngredient', () => {
    test('matches German staples to BLS 4.0 database', () => {
      const garlic = findCanonicalIngredient('Knoblauchzehen', 'garlic', 'FRUITS_VEGETABLES', [], ['Knoblauch']);
      assert.ok(garlic);
      assert.ok(garlic.name_de.toLowerCase().includes('knoblauch'));

      const chicken = findCanonicalIngredient('Hähnchenbrustfilet', 'chicken breast', 'MEAT_FISH', [], ['Hähnchenbrustfilet', 'Hähnchen Brustfilet']);
      assert.ok(chicken);
      assert.ok(chicken.name_de.toLowerCase().includes('hähnchen'));

      const onion = findCanonicalIngredient('rote Zwiebel', 'onion', 'FRUITS_VEGETABLES', [], ['Zwiebel']);
      assert.ok(onion);
      assert.ok(onion.name_de.toLowerCase().includes('zwiebel'));

      const oats = findCanonicalIngredient('Haferflocken', 'rolled oats', 'GRAINS_PASTA', [], ['Haferflocken']);
      assert.ok(oats);
      assert.ok(oats.name_de.toLowerCase().includes('hafer'));

      const egg = findCanonicalIngredient('Eier', 'egg', 'DAIRY', [], ['Hühnerei', 'Ei']);
      assert.ok(egg);
      assert.ok(egg.name_de.toLowerCase().includes('ei'));
    });

    test('prefers lean variant when mager/lean is requested', () => {
      const leanQuark = findCanonicalIngredient('Magerquark', 'quark', 'DAIRY', ['Speisequark mager'], ['Magerquark', 'Speisequark mager']);
      assert.ok(leanQuark);
      assert.ok(leanQuark.name_de.toLowerCase().includes('mager') || leanQuark.name_de.toLowerCase().includes('quark'));
      assert.ok(leanQuark.nutrients_per_100g.fat <= 1.0);
    });

    test('matches cheeses like Gouda or Mozzarella', () => {
      const gouda = findCanonicalIngredient('Gouda gerieben', 'gouda', 'DAIRY', [], ['Gouda']);
      assert.ok(gouda);
      assert.ok(gouda.name_de.toLowerCase().includes('gouda'));
    });

    test('matches meat staples like Rinderhackfleisch', () => {
      const beef = findCanonicalIngredient('Rinderhack', 'ground beef', 'MEAT_FISH', [], ['Rinderhackfleisch', 'Rinderhack']);
      assert.ok(beef);
      assert.ok(beef.name_de.toLowerCase().includes('rind'));
    });

    test('returns null for unlisted exotic fantasy ingredients', () => {
      const exotic = findCanonicalIngredient('Unbekannte Fantasie-Geheimsauce XYZ 999', 'secret exotic fantasy sauce');
      assert.equal(exotic, null);
    });
  });

  describe('calculateWeightGrams', () => {
    test('calculates grams from piece/clove standard weights', () => {
      const garlic = findCanonicalIngredient('Knoblauch', 'garlic', 'FRUITS_VEGETABLES', [], ['Knoblauch']);
      assert.ok(garlic);
      const weight = calculateWeightGrams(2, 'clove', garlic);
      assert.equal(weight, 6); // 2 cloves * 3g = 6g
    });

    test('calculates grams from volume with density', () => {
      const oil = findCanonicalIngredient('Olivenöl', 'olive oil', 'SPICES_OILS', [], ['Olivenöl']);
      assert.ok(oil);
      const weight = calculateWeightGrams(2, 'tablespoon', oil);
      assert.equal(weight, 24); // 2 * 12g = 24g
    });
  });

  describe('enrichRecipeWithCanonicalIngredients', () => {
    test('enriches all recipe ingredients and aggregates per-serving macros', () => {
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

      enrichRecipeWithCanonicalIngredients(recipe);

      const items = recipe.ingredients[0].items;
      assert.equal(items[0].isVerified, true);
      assert.ok(items[0].canonicalId);
      assert.ok((items[0].calories ?? 0) > 100);

      assert.equal(items[1].isVerified, true);
      assert.ok(items[1].canonicalId);
      assert.ok((items[1].calories ?? 0) > 300);

      // AI fallback kept for unverified item
      assert.equal(items[2].isVerified, false);
      assert.equal(items[2].calories, 40);

      // Recipe total per serving calculated
      assert.ok(recipe.nutritionalValues);
      assert.ok((recipe.nutritionalValues.calories ?? 0) > 200);
      assert.ok((recipe.nutritionalValues.protein ?? 0) > 15);
    });
  });
});
