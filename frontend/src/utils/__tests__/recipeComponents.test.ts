import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSectionName,
  hasRecipeComponents,
  groupIngredientsByComponent,
  groupInstructionsByComponent,
  consolidateIngredientsForShopping,
} from '../recipeComponents';
import type { Ingredient, InstructionStep, Recipe } from '../../types';

test('sanitizeSectionName', async (t) => {
  await t.test('strips generic and empty sections', () => {
    assert.equal(sanitizeSectionName(''), undefined);
    assert.equal(sanitizeSectionName('   '), undefined);
    assert.equal(sanitizeSectionName('Zutaten'), undefined);
    assert.equal(sanitizeSectionName('hauptzutaten'), undefined);
    assert.equal(sanitizeSectionName('ingredients'), undefined);
    assert.equal(sanitizeSectionName('Main'), undefined);
  });

  await t.test('preserves culinary component sections', () => {
    assert.equal(sanitizeSectionName('Für das Brot'), 'Für das Brot');
    assert.equal(sanitizeSectionName('  Sauce  '), 'Sauce');
    assert.equal(sanitizeSectionName('Dressing'), 'Dressing');
  });
});

test('hasRecipeComponents', async (t) => {
  await t.test('returns false for single-part or generic recipes', () => {
    const single: Pick<Recipe, 'ingredients' | 'instructions'> = {
      ingredients: [
        { name: 'Tomaten', amount: 500, unit: 'g', section: 'Zutaten' },
        { name: 'Basilikum', amount: 1, unit: 'Bund' },
      ],
      instructions: [
        { step: 1, description: 'Kochen.' },
      ],
    };
    assert.equal(hasRecipeComponents(single), false);
  });

  await t.test('returns true when >= 2 distinct components exist', () => {
    const multi: Pick<Recipe, 'ingredients' | 'instructions'> = {
      ingredients: [
        { name: 'Mehl', amount: 250, unit: 'g', section: 'Buns' },
        { name: 'Rinderhack', amount: 300, unit: 'g', section: 'Patties' },
      ],
      instructions: [
        { step: 1, description: 'Teig kneten', section: 'Buns' },
        { step: 2, description: 'Patties braten', section: 'Patties' },
      ],
    };
    assert.equal(hasRecipeComponents(multi), true);
  });
});

test('groupIngredientsByComponent', () => {
  const ingredients: Ingredient[] = [
    { name: 'Mehl', amount: 250, unit: 'g', section: 'Brot' },
    { name: 'Hefe', amount: 1, unit: 'Pck', section: 'Brot' },
    { name: 'Mayo', amount: 2, unit: 'EL', section: 'Sauce' },
    { name: 'Salz', amount: 1, unit: 'Prise' },
  ];

  const groups = groupIngredientsByComponent(ingredients);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].sectionName, 'Brot');
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[1].sectionName, 'Sauce');
  assert.equal(groups[1].items.length, 1);
  assert.equal(groups[2].sectionName, '');
  assert.equal(groups[2].items.length, 1);
});

test('groupInstructionsByComponent', () => {
  const steps: InstructionStep[] = [
    { step: 1, description: 'Hefe anrühren', section: 'Brot' },
    { step: 2, description: 'Teig gehen lassen', section: 'Brot' },
    { step: 3, description: 'Sauce anrühren', section: 'Sauce' },
    { step: 4, description: 'Burger zusammenbauen', section: 'Anrichten' },
  ];

  const groups = groupInstructionsByComponent(steps);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].sectionName, 'Brot');
  assert.equal(groups[0].steps.length, 2);
  assert.equal(groups[1].sectionName, 'Sauce');
  assert.equal(groups[1].steps.length, 1);
  assert.equal(groups[2].sectionName, 'Anrichten');
  assert.equal(groups[2].steps.length, 1);
});

test('consolidateIngredientsForShopping', () => {
  const ingredients: Ingredient[] = [
    { name: 'Butter', baseName: 'butter', amount: 50, unit: 'g', section: 'Brot' },
    { name: 'Butter', baseName: 'butter', amount: 20, unit: 'g', section: 'Sauce' },
    { name: 'Mehl', baseName: 'flour', amount: 250, unit: 'g', section: 'Brot' },
  ];

  const consolidated = consolidateIngredientsForShopping(ingredients);
  assert.equal(consolidated.length, 2);

  const butter = consolidated.find((i) => i.baseName === 'butter')!;
  assert.ok(butter);
  assert.equal(butter.amount, 70);
  assert.equal(butter.breakdown.length, 2);
  assert.equal(butter.breakdown[0].section, 'Brot');
  assert.equal(butter.breakdown[0].amount, 50);
  assert.equal(butter.breakdown[1].section, 'Sauce');
  assert.equal(butter.breakdown[1].amount, 20);
});
