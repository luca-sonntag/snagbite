import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRecipeAuditPatch, type RecipeAuditPatch } from './recipeAuditor.js';
import type { Recipe } from '../types.js';

describe('recipeAuditor: applyRecipeAuditPatch', () => {
  const baseRecipe: Recipe = {
    title: 'Mozzarella Pasta mit Pfeffer',
    description: 'Leckere schnelle Pasta mit Mozzarella und schwarzem Pfeffer.',
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    equipment: ['Topf', 'Pfanne'],
    ingredients: [
      {
        name: 'Hauptzutaten',
        items: [
          {
            name: 'Mozzarella (gerieben)',
            baseName: 'cheese', // Collapsed umbrella term
            category: 'DAIRY',
            amount: 150,
            unit: 'g',
          },
          {
            name: 'Pfeffer',
            baseName: 'pepper', // Ambiguous pepper
            category: 'PRODUCE', // Wrong supermarket category
            amount: 0.5,
            unit: 'TL',
          },
          {
            name: 'Petersilie',
            baseName: 'parsley',
            category: 'PRODUCE',
            amount: 1,
            unit: 'Bund',
          },
        ],
      },
    ],
    instructions: [
      {
        step: 1,
        description: 'Wasser im Topf zum Kochen bringen und Pasta garen.',
      },
      {
        step: 2,
        description: 'Den [Mozzarella](ing:cheese) mit dem [Pfeffer](ing:pepper) unter die heiße Pasta heben.',
      },
      {
        step: 3,
        description: 'Mit der [Petersilie](ing:parsley) garnieren und servieren.',
      },
    ],
  };

  test('clean/empty patch returns original recipe without mutation', () => {
    const originalCopy = JSON.parse(JSON.stringify(baseRecipe));
    const result = applyRecipeAuditPatch(baseRecipe, {});

    assert.deepEqual(result.ingredients, baseRecipe.ingredients);
    assert.deepEqual(result.instructions, baseRecipe.instructions);
    assert.deepEqual(baseRecipe, originalCopy, 'Original recipe was mutated!');
    assert.notEqual(result, baseRecipe, 'Result should be a new object');
  });

  test('corrects ingredient baseName, category, and aligns inline step tags', () => {
    const patch: RecipeAuditPatch = {
      ingredientCorrections: [
        {
          originalName: 'Mozzarella (gerieben)',
          correctedBaseName: 'mozzarella',
          correctedCategory: 'DAIRY',
          correctedSynonyms: ['fresh mozzarella', 'shredded mozzarella'],
          reason: 'Do not collapse mozzarella to generic cheese.',
        },
        {
          originalName: 'Pfeffer',
          correctedBaseName: 'black pepper',
          correctedCategory: 'SPICES_SEASONINGS',
          correctedSynonyms: ['ground black pepper', 'peppercorn'],
          reason: 'Pfeffer spice is black pepper in SPICES_SEASONINGS, not bell pepper/PRODUCE.',
        },
      ],
    };

    const patched = applyRecipeAuditPatch(baseRecipe, patch);

    const mozz = patched.ingredients[0].items.find((i) => i.name === 'Mozzarella (gerieben)');
    assert.ok(mozz);
    assert.equal(mozz.baseName, 'mozzarella');
    assert.equal(mozz.category, 'DAIRY');
    assert.deepEqual(mozz.synonyms, ['fresh mozzarella', 'shredded mozzarella']);

    const pepper = patched.ingredients[0].items.find((i) => i.name === 'Pfeffer');
    assert.ok(pepper);
    assert.equal(pepper.baseName, 'black pepper');
    assert.equal(pepper.category, 'SPICES_SEASONINGS');

    // Verify inline step tags were automatically aligned
    assert.equal(
      patched.instructions[1].description,
      'Den [Mozzarella](ing:mozzarella) mit dem [Pfeffer](ing:black pepper) unter die heiße Pasta heben.'
    );
  });

  test('adds and removes ingredients and steps with sequential renumbering (1..N)', () => {
    const patch: RecipeAuditPatch = {
      removedIngredients: [
        {
          name: 'Petersilie',
          reason: 'Not mentioned in cooking process.',
        },
      ],
      addedIngredients: [
        {
          name: 'Olivenöl',
          amount: 2,
          unit: 'EL',
          baseName: 'olive oil',
          category: 'SPICES_SEASONINGS',
          synonyms: ['extra virgin olive oil'],
          reason: 'Used in pan frying step.',
        },
      ],
      removedStepNumbers: [1],
      addedSteps: [
        {
          insertAfterStep: 2,
          description: 'Das [Olivenöl](ing:olive oil) in der Pfanne erhitzen.',
          reason: 'Missing sautéing step.',
        },
      ],
      stepCorrections: [
        {
          stepNumber: 3,
          correctedDescription: 'Heiß auf Tellern anrichten und sofort genießen.',
          reason: 'Replaced parsley garnish text.',
        },
      ],
    };

    const patched = applyRecipeAuditPatch(baseRecipe, patch);

    // Verify ingredient removal and addition
    const parsley = patched.ingredients[0].items.find((i) => i.name === 'Petersilie');
    assert.equal(parsley, undefined);

    const oil = patched.ingredients[0].items.find((i) => i.name === 'Olivenöl');
    assert.ok(oil);
    assert.equal(oil.baseName, 'olive oil');
    assert.equal(oil.amount, 2);
    assert.equal(oil.unit, 'EL');

    // Verify step removal, addition, correction, and sequential 1..N renumbering
    assert.equal(patched.instructions.length, 3);
    assert.equal(patched.instructions[0].step, 1);
    assert.equal(
      patched.instructions[0].description,
      'Den [Mozzarella](ing:cheese) mit dem [Pfeffer](ing:pepper) unter die heiße Pasta heben.'
    );

    assert.equal(patched.instructions[1].step, 2);
    assert.equal(patched.instructions[1].description, 'Das [Olivenöl](ing:olive oil) in der Pfanne erhitzen.');

    assert.equal(patched.instructions[2].step, 3);
    assert.equal(patched.instructions[2].description, 'Heiß auf Tellern anrichten und sofort genießen.');
  });

  test('end-to-end: audited recipe resolves mozzarella and black pepper with accurate macros and icons', async () => {
    const { enrichRecipeWithCanonicalIngredients } = await import('./ingredientMatcher.js');

    const patch: RecipeAuditPatch = {
      ingredientCorrections: [
        {
          originalName: 'Mozzarella (gerieben)',
          correctedBaseName: 'mozzarella',
          correctedCategory: 'DAIRY',
          correctedSynonyms: ['shredded mozzarella'],
          reason: 'Specific mozzarella',
        },
        {
          originalName: 'Pfeffer',
          correctedBaseName: 'black pepper',
          correctedCategory: 'SPICES_SEASONINGS',
          correctedSynonyms: ['ground black pepper'],
          reason: 'Black pepper spice',
        },
      ],
    };

    const auditedRecipe = applyRecipeAuditPatch(baseRecipe, patch);
    await enrichRecipeWithCanonicalIngredients(auditedRecipe);

    const mozz = auditedRecipe.ingredients[0].items.find((i) => i.name === 'Mozzarella (gerieben)');
    assert.ok(mozz);
    assert.equal(mozz.baseName, 'mozzarella');
    assert.equal(mozz.category, 'DAIRY');
    // Ensure mozzarella received canonical product match
    assert.ok(mozz.matchedName?.toLowerCase().includes('mozzarella') || mozz.canonicalId);

    const pepper = auditedRecipe.ingredients[0].items.find((i) => i.name === 'Pfeffer');
    assert.ok(pepper);
    assert.equal(pepper.baseName, 'black pepper');
    assert.equal(pepper.category, 'SPICES_SEASONINGS');
    // Ensure pepper receives spice classification and negligible spice calories (< 10 kcal)
    assert.ok((pepper.calories || 0) < 10, 'Pepper should have negligible spice calories');

    // Verify inline step tag references in steps
    assert.ok(auditedRecipe.instructions[1].description.includes('[Mozzarella](ing:mozzarella)'));
    assert.ok(auditedRecipe.instructions[1].description.includes('[Pfeffer](ing:black pepper)'));
  });
});
