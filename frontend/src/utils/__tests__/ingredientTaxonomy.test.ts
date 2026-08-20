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

describe('ingredientTaxonomy', () => {
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
      assert.equal(normalizeIngredientName('Zwiebel (weiß, fein gewürfelt)'), 'zwiebel');
      assert.equal(normalizeIngredientName('Zwiebel, gewürfelt'), 'zwiebel');
      assert.equal(normalizeIngredientName('Mozzarella (light)'), 'mozzarella');
      assert.equal(normalizeIngredientName('Gouda, gerieben, leicht'), 'gouda');
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
    it('resolves derived parts to raw parent items', () => {
      assert.deepEqual(getParentIngredient({ name: 'Eigelb', baseName: 'egg yolk' }), {
        name: 'Ei',
        baseName: 'egg',
        unit: 'Stück',
      });
      assert.deepEqual(getParentIngredient({ name: 'Eiweiß', baseName: 'egg white' }), {
        name: 'Ei',
        baseName: 'egg',
        unit: 'Stück',
      });
      assert.deepEqual(getParentIngredient({ name: 'Zitronensaft', baseName: 'lemon juice' }), {
        name: 'Zitrone',
        baseName: 'lemon',
        unit: 'Stück',
      });
      assert.deepEqual(getParentIngredient({ name: 'Knoblauchzehe', baseName: 'garlic clove' }), {
        name: 'Knoblauch',
        baseName: 'garlic',
        unit: 'Zehe',
      });
    });

    it('returns null for primary standalone grocery foods', () => {
      assert.equal(getParentIngredient({ name: 'Ei', baseName: 'egg' }), null);
      assert.equal(getParentIngredient({ name: 'Eier', baseName: 'egg' }), null);
      assert.equal(getParentIngredient({ name: 'Zwiebel', baseName: 'onion' }), null);
      assert.equal(getParentIngredient({ name: 'Butter', baseName: 'butter' }), null);
      assert.equal(getParentIngredient({ name: 'Mozzarella light', baseName: 'mozzarella' }), null);
    });
  });

  describe('normalizeFoodBaseKey', () => {
    it('unifies Ei, Eier, Eigelb and English egg variations to "egg"', () => {
      assert.equal(normalizeFoodBaseKey({ name: '6 Stück Eier', baseName: 'egg' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: '1 Stück Ei', baseName: 'egg' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'Eigelb', baseName: 'egg yolk' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'Eier' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'Ei' }), 'egg');
      assert.equal(normalizeFoodBaseKey({ name: 'Eggs', baseName: 'eggs' }), 'egg');
    });

    it('unifies Zwiebel, Zwiebeln, Schalotten and onions to "onion"', () => {
      assert.equal(normalizeFoodBaseKey({ name: 'Zwiebel', baseName: 'onion' }), 'onion');
      assert.equal(normalizeFoodBaseKey({ name: 'Zwiebeln', baseName: 'onions' }), 'onion');
      assert.equal(normalizeFoodBaseKey({ name: 'Zwiebeln' }), 'onion');
      assert.equal(normalizeFoodBaseKey({ name: 'Schalotten' }), 'onion');
    });

    it('handles dairy and produce cleanly', () => {
      assert.equal(normalizeFoodBaseKey({ name: 'Mozzarella light', baseName: 'mozzarella' }), 'mozzarella');
      assert.equal(normalizeFoodBaseKey({ name: 'Gouda gerieben, leicht', baseName: 'gouda' }), 'gouda');
      assert.equal(normalizeFoodBaseKey({ name: 'Hafermilch', baseName: 'oat milk' }), 'oat milk');
      assert.equal(normalizeFoodBaseKey({ name: 'Frischkäse', baseName: 'cream cheese' }), 'cream cheese');
    });
  });

  describe('getIngredientDisplayName', () => {
    it('displays singular or plural depending on quantity for countable grocery items', () => {
      assert.equal(getIngredientDisplayName({ name: 'Ei', baseName: 'egg' }, 1), 'Ei');
      assert.equal(getIngredientDisplayName({ name: 'Ei', baseName: 'egg' }, 7), 'Eier');
      assert.equal(getIngredientDisplayName({ name: 'Eier', baseName: 'egg' }, 6), 'Eier');
      assert.equal(getIngredientDisplayName({ name: 'Zwiebel', baseName: 'onion' }, 1), 'Zwiebel');
      assert.equal(getIngredientDisplayName({ name: 'Zwiebel', baseName: 'onion' }, 3), 'Zwiebeln');
    });

    it('preserves clean names for non-countable or specialized items', () => {
      assert.equal(getIngredientDisplayName({ name: 'Mozzarella light', baseName: 'mozzarella' }, 1), 'Mozzarella light');
      assert.equal(getIngredientDisplayName({ name: 'Gouda gerieben, leicht', baseName: 'gouda' }, 1), 'Gouda gerieben');
      assert.equal(getIngredientDisplayName({ name: 'Hafermilch', baseName: 'oat milk' }, 1), 'Hafermilch');
      assert.equal(getIngredientDisplayName({ name: 'Frischkäse', baseName: 'cream cheese' }, 1), 'Frischkäse');
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
          existing.name = getIngredientDisplayName(existing, existing.amount);

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

          const displayName = getIngredientDisplayName(item, item.amount);

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

    it('aggregates "6 Stück Eier (verquirlt)" and "1 Stück Ei" into a single "7 Stück Eier" item', () => {
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

    it('aggregates "2 Eigelb" and "3 Eier" into a single "5 Stück Eier" item', () => {
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
      assert.equal(aggregated[0].name, 'Eier');
      assert.equal(aggregated[0].amount, 5);
      assert.equal(aggregated[0].unit, 'Stück');
      assert.equal(aggregated[0].subItems?.length, 2);
    });

    it('aggregates "1 Zwiebel" and "2 Zwiebeln" into "3 Stück Zwiebeln"', () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: 'item-1',
          name: 'Zwiebel',
          baseName: 'onion',
          amount: 1,
          unit: 'Stück',
          recipeId: 'rec-1',
          recipeTitle: 'Suppe',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'PRODUCE'
        },
        {
          id: 'item-2',
          name: 'Zwiebeln',
          baseName: 'onions',
          amount: 2,
          unit: 'Stück',
          recipeId: 'rec-2',
          recipeTitle: 'Gulasch',
          checked: false,
          createdAt: new Date().toISOString(),
          category: 'PRODUCE'
        }
      ];

      const aggregated = aggregateItems(shoppingList);
      assert.equal(aggregated.length, 1);
      assert.equal(aggregated[0].name, 'Zwiebeln');
      assert.equal(aggregated[0].amount, 3);
      assert.equal(aggregated[0].unit, 'Stück');
    });
  });
});
