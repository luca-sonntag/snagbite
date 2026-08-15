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

describe('Ingredient Matcher & Normalizer', () => {
  describe('normalizeSearchTerm', () => {
    test('cleans parentheses and extra modifiers', () => {
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
    test('matches German staples to Swiss laboratory database', () => {
      const garlic = findCanonicalIngredient('Knoblauchzehen', 'garlic');
      assert.ok(garlic);
      assert.equal(garlic.name_de, 'Knoblauch, roh');

      const chicken = findCanonicalIngredient('Hähnchenbrustfilet', 'chicken breast');
      assert.ok(chicken);
      assert.ok(chicken.name_de.includes('Poulet, Brust'));

      const onion = findCanonicalIngredient('rote Zwiebel', 'onion');
      assert.ok(onion);
      assert.ok(onion.name_de.includes('Zwiebel'));

      const oats = findCanonicalIngredient('Haferflocken', 'rolled oats');
      assert.ok(oats);
      assert.equal(oats.name_de, 'Haferflocken');

      const egg = findCanonicalIngredient('Eier', 'egg');
      assert.ok(egg);
      assert.ok(egg.name_de.includes('Hühnerei'));
    });

    test('prefers lean variant when mager/lean is requested', () => {
      const leanQuark = findCanonicalIngredient('Magerquark', 'quark');
      assert.ok(leanQuark);
      assert.ok(leanQuark.name_de.toLowerCase().includes('mager'));
      assert.ok(leanQuark.nutrients_per_100g.fat < 1.0);
    });

    test('returns null for unlisted exotic ingredients without false positives', () => {
      const exotic = findCanonicalIngredient('Unbekannte Geheimsauce', 'secret exotic sauce');
      assert.equal(exotic, null);
    });

    test('prevents false positives using head noun and category scoping', () => {
      // 1. Cherry tomato in VEGETABLES should never match Cherry liqueur (Kirsch) in BEVERAGES
      const cherryTomato = findCanonicalIngredient('Kirschtomaten', 'cherry tomato', 'VEGETABLES');
      if (cherryTomato) {
        assert.notEqual(cherryTomato.category, 'BEVERAGES');
        assert.ok(!cherryTomato.name_de.toLowerCase().includes('kirsch '));
      }

      // 2. Spring onion in VEGETABLES should never match Spring roll (Frühlingsrolle) in PREPARED_DISHES
      const springOnion = findCanonicalIngredient('Frühlingszwiebeln', 'spring onion', 'VEGETABLES');
      if (springOnion) {
        assert.notEqual(springOnion.category, 'PREPARED_DISHES');
        assert.ok(!springOnion.name_de.toLowerCase().includes('rolle'));
      }

      // 3. Protein powder in PANTRY_BAKING should never match a prepared burger/dish
      const proteinPowder = findCanonicalIngredient('Proteinpulver', 'protein powder', 'PANTRY_BAKING');
      if (proteinPowder) {
        assert.notEqual(proteinPowder.category, 'PREPARED_DISHES');
      }

      // 4. Sweetener in SWEETS_SNACKS should never match Energy Drink in BEVERAGES
      const sweetener = findCanonicalIngredient('Flüssigsüßstoff', 'liquid sweetener', 'SWEETS_SNACKS');
      if (sweetener) {
        assert.notEqual(sweetener.category, 'BEVERAGES');
      }
    });
  });

  describe('calculateWeightGrams', () => {
    test('calculates grams from piece/clove standard weights', () => {
      const garlic = findCanonicalIngredient('Knoblauch', 'garlic');
      assert.ok(garlic);
      const weight = calculateWeightGrams(2, 'clove', garlic);
      assert.equal(weight, 8); // 2 cloves * 4g = 8g
    });

    test('calculates grams from volume with density', () => {
      const oil = findCanonicalIngredient('Olivenöl', 'olive oil');
      assert.ok(oil);
      const weight = calculateWeightGrams(2, 'tablespoon', oil);
      assert.equal(weight, 28); // 2 * 14g = 28g
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
              { name: 'Magerquark', baseName: 'quark', amount: 200, unit: 'g' },
              { name: 'Haferflocken', baseName: 'rolled oats', amount: 100, unit: 'g' },
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
      assert.equal(items[0].canonicalId, 'curds_with_at_most_10_fidm');
      assert.ok((items[0].calories ?? 0) > 100);

      assert.equal(items[1].isVerified, true);
      assert.equal(items[1].canonicalId, 'oat_flakes');
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
