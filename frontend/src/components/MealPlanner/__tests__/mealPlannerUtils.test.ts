import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMonday,
  formatDateIso,
  addDays,
  scaleIngredientGroups,
  formatShoppingAmount,
  formatUpcomingDateSeparator,
  sortIngredientGroupsByCategory,
  formatDateHuman,
  buildWeekDaysInfo,
} from '../mealPlannerUtils.js';

describe('mealPlannerUtils', () => {
  describe('getMonday', () => {
    it('returns Monday for a midweek date', () => {
      // Wednesday, Aug 26, 2026
      const wednesday = new Date(2026, 7, 26);
      const monday = getMonday(wednesday);
      assert.equal(monday.getFullYear(), 2026);
      assert.equal(monday.getMonth(), 7);
      assert.equal(monday.getDate(), 24); // Aug 24 is Monday
      assert.equal(monday.getHours(), 0);
      assert.equal(monday.getMinutes(), 0);
    });

    it('returns the same day if already Monday', () => {
      const mondayInput = new Date(2026, 7, 24);
      const monday = getMonday(mondayInput);
      assert.equal(monday.getDate(), 24);
    });

    it('returns preceding Monday for Sunday', () => {
      // Sunday, Aug 30, 2026
      const sunday = new Date(2026, 7, 30);
      const monday = getMonday(sunday);
      assert.equal(monday.getDate(), 24);
    });
  });

  describe('formatDateIso', () => {
    it('formats date as YYYY-MM-DD with zero-padding', () => {
      const d = new Date(2026, 3, 5); // April 5, 2026
      assert.equal(formatDateIso(d), '2026-04-05');
    });
  });

  describe('addDays', () => {
    it('adds positive and negative days across month boundaries', () => {
      const start = new Date(2026, 7, 30); // Aug 30
      const plusTwo = addDays(start, 2); // Sept 1
      assert.equal(formatDateIso(plusTwo), '2026-09-01');

      const minusSeven = addDays(start, -7); // Aug 23
      assert.equal(formatDateIso(minusSeven), '2026-08-23');
    });
  });

  describe('scaleIngredientGroups', () => {
    it('scales amounts proportionally according to servings ratio', () => {
      const groups = [
        {
          name: 'Sauce',
          items: [
            { name: 'Tomaten', amount: 200, unit: 'g' },
            { name: 'Knoblauch', amount: 2, unit: 'Zehen' },
          ],
        },
      ];

      // Base 2 servings -> Target 4 servings (2x)
      const scaled = scaleIngredientGroups(groups, 4, 2);
      assert.equal(scaled.length, 2);
      assert.equal(scaled[0].amount, 400);
      assert.equal(scaled[1].amount, 4);
    });

    it('returns empty array when groups are undefined or empty', () => {
      assert.deepEqual(scaleIngredientGroups(undefined, 4, 2), []);
      assert.deepEqual(scaleIngredientGroups([], 4, 2), []);
    });
  });

  describe('formatShoppingAmount', () => {
    it('formats integer and decimal amounts properly', () => {
      assert.equal(formatShoppingAmount(undefined), '');
      assert.equal(formatShoppingAmount(0), '');
      assert.equal(formatShoppingAmount(2), '2');
      assert.equal(formatShoppingAmount(2.5), '2.5');
      assert.equal(formatShoppingAmount(2.54), '2.5');
    });
  });

  describe('formatUpcomingDateSeparator', () => {
    it('formats future date with relative label when available', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowIso = formatDateIso(tomorrow);

      const label = formatUpcomingDateSeparator(tomorrowIso, 'de', {
        tomorrow: 'Morgen',
      });
      assert.ok(label.startsWith('Morgen • '));
    });
  });

  describe('sortIngredientGroupsByCategory', () => {
    it('sorts groups by category order', () => {
      const groups = [
        { name: 'PANTRY_BAKING', items: [] },
        { name: 'VEGETABLES', items: [] },
      ];
      const sorted = sortIngredientGroupsByCategory(groups);
      assert.equal(sorted[0].group.name, 'VEGETABLES');
      assert.equal(sorted[1].group.name, 'PANTRY_BAKING');
    });
  });

  describe('formatDateHuman', () => {
    it('formats date correctly in German and English', () => {
      const de = formatDateHuman('2026-09-16', 'de');
      assert.ok(de.includes('16'));
      const en = formatDateHuman('2026-09-16', 'en');
      assert.ok(en.includes('16'));
      assert.equal(formatDateHuman(undefined, 'de'), '');
    });
  });

  describe('buildWeekDaysInfo', () => {
    it('builds 7 days info with correct counts', () => {
      const monday = new Date(2026, 8, 14); // 2026-09-14
      const mealPlans = [
        {
          id: 'p1',
          recipeId: 'r1',
          planDate: '2026-09-14',
          mealType: 'dinner' as const,
          servings: 2,
          isCooked: true,
          createdAt: '2026-09-14T10:00:00Z',
          updatedAt: '2026-09-14T10:00:00Z',
        },
      ];
      const days = buildWeekDaysInfo(monday, mealPlans, 'de', '2026-09-14');
      assert.equal(days.length, 7);
      assert.equal(days[0].dateStr, '2026-09-14');
      assert.equal(days[0].dayName, 'Mo');
      assert.equal(days[0].isToday, true);
      assert.equal(days[0].plannedCount, 1);
      assert.equal(days[0].cookedCount, 1);
      assert.equal(days[1].plannedCount, 0);
    });
  });
});

