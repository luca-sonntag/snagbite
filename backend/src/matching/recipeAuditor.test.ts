import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRecipeAuditPatch, auditRecipe, type RecipeAuditPatch } from './recipeAuditor.js';
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

  test('prevents cross-tag collisions when multiple ingredients share a generic baseName', () => {
    const multiCheeseRecipe: Recipe = {
      title: 'Zwei-Käse Pasta',
      description: 'Pasta mit Mozzarella und Parmesan.',
      prepTime: 5,
      cookTime: 10,
      servings: 1,
      equipment: ['Topf', 'Reibe'],
      ingredients: [
        {
          name: 'DAIRY',
          items: [
            { name: 'Mozzarella', baseName: 'cheese', category: 'DAIRY', amount: 100, unit: 'g' },
            { name: 'Parmesan', baseName: 'cheese', category: 'DAIRY', amount: 30, unit: 'g' },
          ],
        },
      ],
      instructions: [
        {
          step: 1,
          description: 'Den [Mozzarella](ing:cheese) und den geriebenen [Parmesan](ing:cheese) über die Pasta streuen.',
        },
      ],
    };

    const patch: RecipeAuditPatch = {
      ingredientCorrections: [
        {
          originalName: 'Mozzarella',
          correctedBaseName: 'mozzarella',
          reason: 'Specific variety',
        },
      ],
    };

    const patched = applyRecipeAuditPatch(multiCheeseRecipe, patch);
    const mozz = patched.ingredients[0].items.find((i) => i.name === 'Mozzarella');
    const parm = patched.ingredients[0].items.find((i) => i.name === 'Parmesan');

    assert.equal(mozz?.baseName, 'mozzarella');
    assert.equal(parm?.baseName, 'cheese');

    // Crucial: [Parmesan](ing:cheese) MUST NOT be mutated to [Parmesan](ing:mozzarella)
    assert.equal(
      patched.instructions[0].description,
      'Den [Mozzarella](ing:mozzarella) und den geriebenen [Parmesan](ing:cheese) über die Pasta streuen.'
    );
  });

  test('prepends step at index 0 when insertAfterStep is 0 and preserves order on multiple additions', () => {
    const recipe: Recipe = {
      title: 'Ofengemüse',
      description: 'Gemüse im Ofen.',
      prepTime: 5,
      cookTime: 20,
      servings: 2,
      equipment: ['Backblech'],
      ingredients: [{ name: 'Gemüse', items: [{ name: 'Karotte', baseName: 'carrot', category: 'PRODUCE', amount: 2, unit: 'Stück' }] }],
      instructions: [
        { step: 1, description: 'Karotten schneiden.' },
        { step: 2, description: 'Im Ofen backen.' },
      ],
    };

    const patch: RecipeAuditPatch = {
      addedSteps: [
        {
          insertAfterStep: 0,
          description: 'Den Ofen auf 200°C Ober-/Unterhitze vorheizen.',
          reason: 'Preheat step 1',
        },
        {
          insertAfterStep: 0,
          description: 'Ein Backblech mit Backpapier auslegen.',
          reason: 'Preheat step 2',
        },
        {
          insertAfterStep: 1,
          description: 'Karotten mit Olivenöl und Salz marinieren.',
          reason: 'Substep 1a',
        },
        {
          insertAfterStep: 1,
          description: 'Auf dem Blech verteilen.',
          reason: 'Substep 1b',
        },
      ],
    };

    const patched = applyRecipeAuditPatch(recipe, patch);
    assert.equal(patched.instructions.length, 6);
    assert.equal(patched.instructions[0].step, 1);
    assert.equal(patched.instructions[0].description, 'Den Ofen auf 200°C Ober-/Unterhitze vorheizen.');
    assert.equal(patched.instructions[1].step, 2);
    assert.equal(patched.instructions[1].description, 'Ein Backblech mit Backpapier auslegen.');
    assert.equal(patched.instructions[2].step, 3);
    assert.equal(patched.instructions[2].description, 'Karotten schneiden.');
    assert.equal(patched.instructions[3].step, 4);
    assert.equal(patched.instructions[3].description, 'Karotten mit Olivenöl und Salz marinieren.');
    assert.equal(patched.instructions[4].step, 5);
    assert.equal(patched.instructions[4].description, 'Auf dem Blech verteilen.');
    assert.equal(patched.instructions[5].step, 6);
    assert.equal(patched.instructions[5].description, 'Im Ofen backen.');
  });

  test('handles punctuation variance in ingredient correction names and ingredient removals', () => {
    const punctRecipe: Recipe = {
      title: 'Punctuation Test',
      description: 'Test recipe with punctuation.',
      prepTime: 5,
      cookTime: 5,
      servings: 1,
      equipment: [],
      ingredients: [
        {
          name: 'Zutaten',
          items: [
            { name: 'Mozzarella, gerieben', baseName: 'cheese', category: 'DAIRY', amount: 100, unit: 'g' },
            { name: 'Frische Petersilie (gehackt)', baseName: 'parsley', category: 'PRODUCE', amount: 1, unit: 'EL' },
          ],
        },
      ],
      instructions: [
        { step: 1, description: 'Den [Mozzarella](ing:cheese) darüberstreuen.' },
      ],
    };

    const patch: RecipeAuditPatch = {
      ingredientCorrections: [
        {
          originalName: 'Mozzarella (gerieben)', // Note: parens vs comma in recipe
          correctedBaseName: 'mozzarella',
          reason: 'Specific variety',
        },
      ],
      removedIngredients: [
        {
          name: 'Frische Petersilie, gehackt', // Note: comma vs parens in recipe
          reason: 'Unneeded garnish',
        },
      ],
    };

    const patched = applyRecipeAuditPatch(punctRecipe, patch);
    const mozz = patched.ingredients[0].items.find((i) => i.name === 'Mozzarella, gerieben');
    assert.ok(mozz);
    assert.equal(mozz.baseName, 'mozzarella');
    assert.equal(patched.ingredients[0].items.some((i) => i.name.includes('Petersilie')), false);
    assert.equal(patched.instructions[0].description, 'Den [Mozzarella](ing:mozzarella) darüberstreuen.');
  });

  test('handles recipes with empty ingredients or instructions gracefully without crashing', () => {
    const emptyRecipe: Recipe = {
      title: 'Empty Recipe',
      description: 'Empty',
      prepTime: null,
      cookTime: null,
      servings: 1,
      equipment: [],
      ingredients: [],
      instructions: [],
    };

    const patch: RecipeAuditPatch = {
      addedIngredients: [
        { name: 'Wasser', amount: 200, unit: 'ml', baseName: 'water', category: 'BEVERAGES', reason: 'Base' },
      ],
      addedSteps: [
        { description: 'Wasser trinken.', reason: 'Hydrate' },
      ],
    };

    const patched = applyRecipeAuditPatch(emptyRecipe, patch);
    assert.equal(patched.ingredients.length, 1);
    assert.equal(patched.ingredients[0].items[0].name, 'Wasser');
    assert.equal(patched.instructions.length, 1);
    assert.equal(patched.instructions[0].step, 1);
    assert.equal(patched.instructions[0].description, 'Wasser trinken.');
  });

  test('places addedIngredients into matching supermarket category groups', () => {
    const categorizedRecipe: Recipe = {
      title: 'Salat mit Dressing',
      description: 'Frischer Salat.',
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      equipment: ['Schüssel'],
      ingredients: [
        { name: 'PRODUCE', items: [{ name: 'Tomate', baseName: 'tomato', category: 'PRODUCE', amount: 2, unit: 'Stück' }] },
        { name: 'SPICES_SEASONINGS', items: [{ name: 'Salz', baseName: 'salt', category: 'SPICES_SEASONINGS', amount: 1, unit: 'Prise' }] },
      ],
      instructions: [{ step: 1, description: 'Alles mischen.' }],
    };

    const patch: RecipeAuditPatch = {
      addedIngredients: [
        {
          name: 'Schwarzer Pfeffer',
          amount: 1,
          unit: 'Prise',
          baseName: 'black pepper',
          category: 'SPICES_SEASONINGS',
          reason: 'Seasoning',
        },
        {
          name: 'Gurke',
          amount: 0.5,
          unit: 'Stück',
          baseName: 'cucumber',
          category: 'PRODUCE',
          reason: 'Fresh vegetable',
        },
      ],
    };

    const patched = applyRecipeAuditPatch(categorizedRecipe, patch);
    const produceGroup = patched.ingredients.find((g) => g.name === 'PRODUCE');
    const spiceGroup = patched.ingredients.find((g) => g.name === 'SPICES_SEASONINGS');

    assert.ok(produceGroup?.items.some((i) => i.name === 'Gurke' && i.baseName === 'cucumber'));
    assert.ok(spiceGroup?.items.some((i) => i.name === 'Schwarzer Pfeffer' && i.baseName === 'black pepper'));
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
    const allIngredients = patched.ingredients.flatMap((g) => g.items);
    const parsley = allIngredients.find((i) => i.name === 'Petersilie');
    assert.equal(parsley, undefined);

    const oil = allIngredients.find((i) => i.name === 'Olivenöl');
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

  test('auditRecipe returns null patch gracefully when API key is unconfigured', async () => {
    const result = await auditRecipe(baseRecipe);
    assert.ok(result);
    assert.equal(typeof result, 'object');
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
