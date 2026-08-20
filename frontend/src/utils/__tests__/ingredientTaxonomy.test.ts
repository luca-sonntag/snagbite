import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toEnglishSingular,
  normalizeIngredientName,
  normalizeUnit,
  getParentIngredient,
  normalizeFoodBaseKey,
  getIngredientDisplayName,
} from '../ingredientTaxonomy.js';
import type { ShoppingListItem, AggregatedShoppingItem } from '../../types.js';

describe('ingredientTaxonomy (Language-Agnostic Generic Engine)', () => {
  describe('toEnglishSingular', () => {
    it('safely converts regular and irregular food plurals to singular', () => {
      assert.equal(toEnglishSingular('eggs'), 'egg');
      assert.equal(toEnglishSingular('egg'), 'egg');
      assert.equal(toEnglishSingular('onions'), 'onion');
      assert.equal(toEnglishSingular('carrots'), 'carrot');
      assert.equal(toEnglishSingular('tomatoes'), 'tomato');
      assert.equal(toEnglishSingular('potatoes'), 'potato');
      assert.equal(toEnglishSingular('strawberries'), 'strawberry');
      assert.equal(toEnglishSingular('raspberries'), 'raspberry');
      assert.equal(toEnglishSingular('leaves'), 'leaf');
      assert.equal(toEnglishSingular('shrimps'), 'shrimp');
    });

    it('preserves words ending in -ss, -us, -is, -se, -cous', () => {
      assert.equal(toEnglishSingular('cheese'), 'cheese');
      assert.equal(toEnglishSingular('hummus'), 'hummus');
      assert.equal(toEnglishSingular('asparagus'), 'asparagus');
      assert.equal(toEnglishSingular('couscous'), 'couscous');
    });
  });

  describe('normalizeIngredientName', () => {
    it('cleans parenthetical and comma modifiers', () => {
      assert.equal(normalizeIngredientName('Zwiebel (weiß, fein gewürfelt)'), 'Zwiebel');
      assert.equal(normalizeIngredientName('Zwiebel, gewürfelt'), 'Zwiebel');
      assert.equal(normalizeIngredientName('Mozzarella (light)'), 'Mozzarella');
      assert.equal(normalizeIngredientName('Gouda, gerieben, leicht'), 'Gouda');
    });
  });

  describe('normalizeUnit', () => {
    it('standardizes piece and measurement unit aliases', () => {
      assert.equal(normalizeUnit(''), 'Stück');
      assert.equal(normalizeUnit('Stück'), 'Stück');
      assert.equal(normalizeUnit('stk'), 'Stück');
      assert.equal(normalizeUnit('stk.'), 'Stück');
      assert.equal(normalizeUnit('pcs'), 'Stück');
      assert.equal(normalizeUnit('g'), 'g');
      assert.equal(normalizeUnit('gramm'), 'g');
      assert.equal(normalizeUnit('kg'), 'kg');
      assert.equal(normalizeUnit('ml'), 'ml');
      assert.equal(normalizeUnit('l'), 'l');
      assert.equal(normalizeUnit('EL'), 'EL');
      assert.equal(normalizeUnit('TL'), 'TL');
      assert.equal(normalizeUnit('Zehe'), 'Zehe');
      assert.equal(normalizeUnit('Zehen'), 'Zehe');
      assert.equal(normalizeUnit('Dose'), 'Dose');
    });
  });

  describe('getParentIngredient', () => {
    it('returns explicit parentIngredient when provided', () => {
      const parent = { name: 'Ei', baseName: 'egg', unit: 'Stück' };
      assert.deepEqual(getParentIngredient({ parentIngredient: parent }), parent);
    });

    it('returns null when parentIngredient is absent', () => {
      assert.equal(getParentIngredient({}), null);
    });
  });

  describe('normalizeFoodBaseKey', () => {
    it('unifies Ei, Eier, Eigelb, uova, oeufs and eggs across languages to "egg"', () => {
      assert.equal(normalizeFoodBaseKey({ name: '6 Stück Eier', baseName: 'egg' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: '1 Stück Ei', baseName: 'egg' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'Eigelb', baseName: 'egg yolk', parentIngredient: { name: 'Ei', baseName: 'egg', unit: 'Stück' } }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'uova', baseName: 'egg' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'oeufs', baseName: 'eggs' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'huevos', baseName: 'egg' }), 'egg');
    });

    it('unifies Zwiebel, Zwiebeln and onions across languages to "onion"', () => {
      assert.equal(normalizeFoodBaseKey({ name: 'Zwiebel', baseName: 'onion' }), 'onion');
      assert.equal(normalizeFoodBaseKey({ name: 'Zwiebeln', baseName: 'onions' }), 'onion');
      assert.equal(normalizeFoodBaseKey({ name: 'Cipolle', baseName: 'onions' }), 'onion');
    });

    it('handles dairy and produce cleanly', () => {
      assert.equal(normalizeFoodBaseKey({ name: 'Mozzarella light', baseName: 'mozzarella' }), 'mozzarella');
      assert.equal(normalizeFoodBaseKey({ name: 'Gouda gerieben, leicht', baseName: 'gouda' }), 'gouda');
      assert.equal(normalizeFoodBaseKey({ name: 'Hafermilch', baseName: 'oat milk' }), 'oat milk');
      assert.equal(normalizeFoodBaseKey({ name: 'Frischkäse', baseName: 'cream cheese' }), 'cream cheese');
    });
  });

  describe('getIngredientDisplayName', () => {
    it('returns parent name if parentIngredient is present', () => {
      assert.equal(getIngredientDisplayName({ name: 'Eigelb', parentIngredient: { name: 'Ei', baseName: 'egg', unit: 'Stück' } }), 'Ei');
      assert.equal(getIngredientDisplayName({ name: 'Zitronensaft', parentIngredient: { name: 'Zitrone', baseName: 'lemon', unit: 'Stück' } }), 'Zitrone');
    });

    it('returns clean ingredient name if no parent', () => {
      assert.equal(getIngredientDisplayName({ name: 'Eier', baseName: 'egg' }), 'Eier');
      assert.equal(getIngredientDisplayName({ name: 'Ei', baseName: 'egg' }), 'Ei');
      assert.equal(getIngredientDisplayName({ name: 'Zwiebel (gewürfelt)', baseName: 'onion' }), 'Zwiebel');
      assert.equal(getIngredientDisplayName({ name: 'Mozzarella light', baseName: 'mozzarella' }), 'Mozzarella light');
    });
  });

  describe('Shopping list aggregation end-to-end', () => {
    function aggregateItems(items: ShoppingListItem[]): AggregatedShoppingItem[] {
      const map = new Map<string, AggregatedShoppingItem>();

      items.forEach(item => {
        const parent = getParentIngredient(item);
        const groupKeyName = normalizeFoodBaseKey(item);
        const displayUnit = normalizeUnit(parent ? (parent.unit || item.unit) : item.unit);

        const key = `${groupKeyName.toLowerCase().trim()}|${displayUnit.toLowerCase().trim()}`;
        const currentSubName = item.modifier ? `${item.name} (${item.modifier})` : item.name;

        const existing = map.get(key);
        if (existing) {
          existing.amount += item.amount;
          if (!existing.itemIds.includes(item.id)) {
            existing.itemIds.push(item.id);
          }

          if (!existing.subItems && (existing.modifier !== item.modifier || existing.name !== item.name || existing.baseName !== item.baseName)) {
            const firstSubName = existing.modifier ? `${existing.name} (${existing.modifier})` : existing.name;
            const firstItemSource = existing.sources[0];
            existing.subItems = [{
              name: firstSubName,
              rawName: existing.name,
              baseName: existing.baseName || existing.name,
              modifier: existing.modifier,
              amount: existing.amount - item.amount,
              unit: existing.unit,
              recipeTitle: firstItemSource?.recipeTitle || ''
            }];
            existing.modifier = undefined;
          }

          if (existing.subItems) {
            existing.subItems.push({
              name: currentSubName,
              rawName: item.name,
              baseName: item.baseName || item.name,
              modifier: item.modifier,
              amount: item.amount,
              unit: item.unit,
              recipeTitle: item.recipeTitle
            });
          }

          existing.sources.push({
            recipeId: item.recipeId,
            recipeTitle: item.recipeTitle,
            amount: item.amount,
            unit: item.unit
          });
        } else {
          const initialSubItems = parent ? [{
            name: currentSubName,
            rawName: item.name,
            baseName: item.baseName || item.name,
            modifier: item.modifier,
            amount: item.amount,
            unit: item.unit,
            recipeTitle: item.recipeTitle
          }] : undefined;

          const displayName = getIngredientDisplayName(item);

          map.set(key, {
            name: displayName,
            baseName: groupKeyName,
            parentIngredient: parent || undefined,
            modifier: parent ? undefined : item.modifier,
            unit: displayUnit,
            amount: item.amount,
            checked: item.checked,
            category: item.category,
            itemIds: [item.id],
            sources: [{
              recipeId: item.recipeId,
              recipeTitle: item.recipeTitle,
              amount: item.amount,
              unit: item.unit
            }],
            subItems: initialSubItems
          });
        }
      });

      return Array.from(map.values());
    }

    it('aggregates "6 Stück Eier (verquirlt)" and "1 Stück Ei" into a single 7-item group', () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: 'item-1',
          name: 'Eier',
          baseName: 'egg',
          amount: 6,
          unit: 'Stück',
          modifier: 'verquirlt',
          recipeId: 'rec-1',
          recipeTitle: 'Omelett',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'DAIRY_EGGS'
        },
        {
          id: 'item-2',
          name: 'Ei',
          baseName: 'egg',
          amount: 1,
          unit: 'Stück',
          recipeId: 'rec-2',
          recipeTitle: 'Kuchen',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'DAIRY_EGGS'
        }
      ];

      const aggregated = aggregateItems(shoppingList);
      assert.equal(aggregated.length, 1);
      assert.equal(aggregated[0].name, 'Eier');
      assert.equal(aggregated[0].amount, 7);
      assert.equal(aggregated[0].unit, 'Stück');
      assert.equal(aggregated[0].itemIds.length, 2);
      assert.equal(aggregated[0].sources.length, 2);
      assert.equal(aggregated[0].subItems?.length, 2);
      assert.equal(aggregated[0].subItems?.[0].name, 'Eier (verquirlt)');
      assert.equal(aggregated[0].subItems?.[0].amount, 6);
      assert.equal(aggregated[0].subItems?.[1].name, 'Ei');
      assert.equal(aggregated[0].subItems?.[1].amount, 1);
    });

    it('aggregates "2 Eigelb" and "3 Eier" into a single 5-item group', () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: 'item-1',
          name: 'Eigelb',
          baseName: 'egg yolk',
          parentIngredient: { name: 'Ei', baseName: 'egg', unit: 'Stück' },
          amount: 2,
          unit: 'Stück',
          recipeId: 'rec-1',
          recipeTitle: 'Carbonara',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'DAIRY_EGGS'
        },
        {
          id: 'item-2',
          name: 'Eier',
          baseName: 'egg',
          amount: 3,
          unit: 'Stück',
          recipeId: 'rec-2',
          recipeTitle: 'Pancakes',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'DAIRY_EGGS'
        }
      ];

      const aggregated = aggregateItems(shoppingList);
      assert.equal(aggregated.length, 1);
      assert.equal(aggregated[0].name, 'Ei');
      assert.equal(aggregated[0].amount, 5);
      assert.equal(aggregated[0].unit, 'Stück');
      assert.equal(aggregated[0].subItems?.length, 2);
    });

    it('aggregates multilingual ingredients with matching baseName', () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: 'item-1',
          name: 'Zwiebeln',
          baseName: 'onions',
          amount: 2,
          unit: 'Stück',
          recipeId: 'rec-1',
          recipeTitle: 'Gulasch',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'PRODUCE'
        },
        {
          id: 'item-2',
          name: 'Cipolla',
          baseName: 'onion',
          amount: 1,
          unit: 'Stück',
          recipeId: 'rec-2',
          recipeTitle: 'Risotto',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'PRODUCE'
        }
      ];

      const aggregated = aggregateItems(shoppingList);
      assert.equal(aggregated.length, 1);
      assert.equal(aggregated[0].amount, 3);
      assert.equal(aggregated[0].unit, 'Stück');
    });
  });
});
