import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toEnglishSingular,
  normalizeIngredientName,
  normalizeUnit,
  getParentIngredient,
  normalizeFoodBaseKey,
  getIngredientDisplayName,
  toFoodCanonicalKey,
} from '../ingredientTaxonomy.js';
import type { ShoppingListItem, AggregatedShoppingItem } from '../../types.js';

describe('ingredientTaxonomy', () => {
  describe('toFoodCanonicalKey', () => {
    it('unifies German, English and plural variations to identical canonical keys', () => {
      assert.equal(toFoodCanonicalKey('Eier'), 'egg');
      assert.equal(toFoodCanonicalKey('Ei'), 'egg');
      assert.equal(toFoodCanonicalKey('egg'), 'egg');
      assert.equal(toFoodCanonicalKey('eggs'), 'egg');
      assert.equal(toFoodCanonicalKey('Eigelb'), 'egg');
      assert.equal(toFoodCanonicalKey('Eiweiß'), 'egg');

      assert.equal(toFoodCanonicalKey('Zwiebel'), 'onion');
      assert.equal(toFoodCanonicalKey('Zwiebeln'), 'onion');
      assert.equal(toFoodCanonicalKey('onions'), 'onion');
      assert.equal(toFoodCanonicalKey('onion'), 'onion');
      assert.equal(toFoodCanonicalKey('Schalotten'), 'onion');

      assert.equal(toFoodCanonicalKey('Mozzarella'), 'mozzarella');
      assert.equal(toFoodCanonicalKey('Mozzarella light'), 'mozzarella');
      assert.equal(toFoodCanonicalKey('Gouda gerieben, leicht'), 'gouda');
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
      assert.deepEqual(getParentIngredient({ name: 'Zitronensaft' }), {
        name: 'Zitrone',
        baseName: 'lemon',
        unit: 'Stück',
      });
      assert.deepEqual(getParentIngredient({ name: 'Knoblauchzehe' }), {
        name: 'Knoblauch',
        baseName: 'garlic',
        unit: 'Zehe',
      });
    });

    it('returns null for primary standalone grocery foods even with stale self-parent', () => {
      assert.equal(getParentIngredient({ name: 'Ei', baseName: 'egg' }), null);
      assert.equal(getParentIngredient({ name: 'Eier', baseName: 'egg' }), null);
      assert.equal(getParentIngredient({ name: 'Eier', parentIngredient: { name: 'Eier', baseName: 'eier' } }), null);
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

    it('aggregates "6 Stück Eier (verquirlt)" and "1 Stück Ei" regardless of baseName presence', () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: 'item-1',
          name: 'Eier',
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
      assert.equal(aggregated[0].amount, 7);
      assert.equal(aggregated[0].unit, 'Stück');
      assert.equal(aggregated[0].itemIds.length, 2);
      assert.equal(aggregated[0].sources.length, 2);
      assert.equal(aggregated[0].subItems?.length, 2);
    });

    it('aggregates items with stale localStorage parentIngredient structures', () => {
      const shoppingList: ShoppingListItem[] = [
        {
          id: 'item-1',
          name: 'Eier',
          parentIngredient: { name: 'Eier', baseName: 'eier', unit: 'Stück' },
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
          parentIngredient: { name: 'Ei', baseName: 'ei', unit: 'Stück' },
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
      assert.equal(aggregated[0].amount, 7);
      assert.equal(aggregated[0].unit, 'Stück');
    });
  });
});
