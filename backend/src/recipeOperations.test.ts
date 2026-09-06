import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyRecipeOperations } from './recipeOperations.js';
import type { Recipe, RecipeOperation } from './types.js';

const mockBaseRecipe: Recipe = {
  id: 'recipe-123',
  title: 'BBQ Burrata Brot',
  description: 'Leckeres Brot mit Burrata',
  servings: 2,
  prepTime: 10,
  cookTime: 15,
  equipment: ['Backofen'],
  ingredients: [
    {
      name: 'DAIRY_EGGS',
      items: [
        {
          name: 'Burrata',
          baseName: 'burrata',
          amount: 1,
          unit: 'St�ck',
          category: 'DAIRY_EGGS',
        },
      ],
    },
    {
      name: 'MEAT_POULTRY',
      items: [
        {
          name: 'Bacon',
          baseName: 'bacon',
          amount: 100,
          unit: 'g',
          category: 'MEAT_POULTRY',
        },
      ],
    },
  ],
  instructions: [
    {
      step: 1,
      description: 'Brot toasten und Bacon anbraten.',
    },
    {
      step: 2,
      description: 'Burrata auf dem Brot verteilen.',
    },
  ],
};

describe('applyRecipeOperations', () => {
  it('does not mutate original recipe (immutability)', () => {
    const originalJson = JSON.stringify(mockBaseRecipe);
    const ops: RecipeOperation[] = [
      {
        id: 'op-1',
        type: 'REMOVE_INGREDIENT',
        summary: 'Bacon entfernen',
        removeIngredientName: 'Bacon',
      },
    ];

    const result = applyRecipeOperations(mockBaseRecipe, ops);
    assert.notStrictEqual(result, mockBaseRecipe);
    assert.strictEqual(JSON.stringify(mockBaseRecipe), originalJson);
    assert.strictEqual(result.parentRecipeId, 'recipe-123');
    assert.strictEqual(result.origin, 'remix');
  });

  it('correctly replaces ingredient and marks replacedOriginal', () => {
    const ops: RecipeOperation[] = [
      {
        id: 'op-replace',
        type: 'REPLACE_INGREDIENT',
        summary: 'Burrata durch Mozzarella ersetzen',
        targetIngredientName: 'Burrata',
        newIngredient: {
          name: 'Mozzarella fettarm',
          baseName: 'mozzarella',
          amount: 125,
          unit: 'g',
          category: 'DAIRY_EGGS',
        },
      },
    ];

    const remixed = applyRecipeOperations(mockBaseRecipe, ops);
    const dairyGroup = remixed.ingredients.find((g) => g.name === 'DAIRY_EGGS');
    assert.ok(dairyGroup);
    assert.strictEqual(dairyGroup.items.length, 1);
    assert.strictEqual(dairyGroup.items[0].name, 'Mozzarella fettarm');
    assert.strictEqual(dairyGroup.items[0].replacedOriginal, 'Burrata');
  });

  it('correctly adds new ingredients and instruction steps (e.g. Beilage)', () => {
    const ops: RecipeOperation[] = [
      {
        id: 'op-add-salad',
        type: 'ADD_INGREDIENTS',
        summary: 'Tomaten-Gurken-Salat als Beilage hinzuf�gen',
        groupName: 'VEGETABLES',
        newIngredients: [
          {
            name: 'Tomate',
            baseName: 'tomato',
            amount: 2,
            unit: 'St�ck',
            category: 'VEGETABLES',
          },
          {
            name: 'Gurke',
            baseName: 'cucumber',
            amount: 0.5,
            unit: 'St�ck',
            category: 'VEGETABLES',
          },
        ],
      },
      {
        id: 'op-add-step',
        type: 'ADD_INSTRUCTION_STEP',
        summary: 'Salat-Zubereitungsschritt anf�gen',
        newSteps: [
          {
            description: 'Tomate und Gurke klein schneiden, anrichten und zum Brot servieren.',
          },
        ],
      },
    ];

    const remixed = applyRecipeOperations(mockBaseRecipe, ops);
    const vegGroup = remixed.ingredients.find((g) => g.name === 'VEGETABLES');
    assert.ok(vegGroup);
    assert.strictEqual(vegGroup.items.length, 2);
    assert.strictEqual(vegGroup.items[0].name, 'Tomate');
    assert.strictEqual(vegGroup.items[1].name, 'Gurke');

    assert.strictEqual(remixed.instructions.length, 3);
    assert.strictEqual(remixed.instructions[2].step, 3);
    assert.strictEqual(
      remixed.instructions[2].description,
      'Tomate und Gurke klein schneiden, anrichten und zum Brot servieren.'
    );
  });

  it('correctly scales servings and ingredient amounts', () => {
    const ops: RecipeOperation[] = [
      {
        id: 'op-scale',
        type: 'SCALE_SERVINGS',
        summary: 'Auf 4 Portionen skalieren',
        newServings: 4,
      },
    ];

    const remixed = applyRecipeOperations(mockBaseRecipe, ops);
    assert.strictEqual(remixed.servings, 4);

    const bacon = remixed.ingredients
      .find((g) => g.name === 'MEAT_POULTRY')
      ?.items.find((i) => i.name === 'Bacon');
    assert.ok(bacon);
    assert.strictEqual(bacon.amount, 200); // 100g * 2 = 200g
  });
  it('correctly replaces ingredient, leaves title unchanged without UPDATE_TITLE, and sets title when UPDATE_TITLE is provided', () => {
    const appleRecipe: Recipe = {
      id: 'apple-recipe',
      title: 'Apfel-Zimt Spekulatius Tiramisu',
      servings: 2,
      equipment: [],
      ingredients: [
        {
          name: 'PRODUCE',
          items: [
            {
              name: 'Äpfel (Boskoop)',
              baseName: 'apfel',
              amount: 2,
              unit: 'Stück',
              category: 'PRODUCE',
            },
          ],
        },
      ],
      instructions: [
        {
          step: 1,
          description: 'Die Äpfel schälen, in Spalten schneiden und andünsten.',
        },
      ],
    };

    const replaceOpOnly: RecipeOperation[] = [
      {
        id: 'op-pear',
        type: 'REPLACE_INGREDIENT',
        summary: 'Äpfel durch Birnen ersetzen',
        targetIngredientName: 'Äpfel (Boskoop)',
        newIngredient: {
          name: 'Birnen (Abate Fetel)',
          baseName: 'birne',
          amount: 2,
          unit: 'Stück',
          category: 'PRODUCE',
        },
      },
    ];

    // 1. Without UPDATE_TITLE, title remains unchanged
    const remixedNoTitle = applyRecipeOperations(appleRecipe, replaceOpOnly);
    assert.strictEqual(remixedNoTitle.title, 'Apfel-Zimt Spekulatius Tiramisu');
    assert.strictEqual(remixedNoTitle.ingredients[0].items[0].name, 'Birnen (Abate Fetel)');

    // 2. With separate UPDATE_TITLE operation directly supplied by AI
    const opsWithTitle: RecipeOperation[] = [
      ...replaceOpOnly,
      {
        id: 'op-title',
        type: 'UPDATE_TITLE',
        summary: 'Titel anpassen: Birnen-Zimt Spekulatius Tiramisu',
        newTitle: 'Birnen-Zimt Spekulatius Tiramisu',
      },
    ];
    const remixedWithTitle = applyRecipeOperations(appleRecipe, opsWithTitle);
    assert.strictEqual(remixedWithTitle.title, 'Birnen-Zimt Spekulatius Tiramisu');
  });
});