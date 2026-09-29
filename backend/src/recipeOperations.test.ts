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
      name: 'Burrata',
      baseName: 'burrata',
      amount: 1,
      unit: 'Stück',
      category: 'DAIRY_EGGS',
    },
    {
      name: 'Bacon',
      baseName: 'bacon',
      amount: 100,
      unit: 'g',
      category: 'MEAT_POULTRY',
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

    const remixed = applyRecipeOperations(mockBaseRecipe, ops);
    assert.strictEqual(JSON.stringify(mockBaseRecipe), originalJson);
    assert.notStrictEqual(remixed, mockBaseRecipe);
    assert.strictEqual(remixed.origin, 'remix');
    assert.strictEqual(remixed.parentRecipeId, 'recipe-123');
    assert.strictEqual(remixed.parentRecipeTitle, 'BBQ Burrata Brot');
  });

  it('correctly replaces an ingredient (e.g. Burrata -> Mozzarella)', () => {
    const ops: RecipeOperation[] = [
      {
        id: 'op-replace-burrata',
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
    const mozz = remixed.ingredients.find((i) => i.name === 'Mozzarella fettarm');
    assert.ok(mozz);
    assert.strictEqual(remixed.ingredients.length, 2);
    assert.strictEqual(mozz.replacedOriginal, 'Burrata');
  });

  it('correctly adds new ingredients and instruction steps (e.g. Beilage)', () => {
    const ops: RecipeOperation[] = [
      {
        id: 'op-add-salad',
        type: 'ADD_INGREDIENTS',
        summary: 'Tomaten-Gurken-Salat als Beilage hinzufügen',
        groupName: 'Beilage',
        newIngredients: [
          {
            name: 'Tomate',
            baseName: 'tomato',
            amount: 2,
            unit: 'Stück',
            category: 'VEGETABLES',
          },
          {
            name: 'Gurke',
            baseName: 'cucumber',
            amount: 0.5,
            unit: 'Stück',
            category: 'VEGETABLES',
          },
        ],
      },
      {
        id: 'op-add-step',
        type: 'ADD_INSTRUCTION_STEP',
        summary: 'Salat-Zubereitungsschritt anfügen',
        newSteps: [
          {
            description: 'Tomate und Gurke klein schneiden, anrichten und zum Brot servieren.',
          },
        ],
      },
    ];

    const remixed = applyRecipeOperations(mockBaseRecipe, ops);
    const tomato = remixed.ingredients.find((i) => i.name === 'Tomate');
    const cucumber = remixed.ingredients.find((i) => i.name === 'Gurke');
    assert.ok(tomato);
    assert.ok(cucumber);
    assert.strictEqual(tomato.section, 'Beilage');
    assert.strictEqual(remixed.ingredients.length, 4);

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

    const bacon = remixed.ingredients.find((i) => i.name === 'Bacon');
    assert.ok(bacon);
    assert.strictEqual(bacon.amount, 200); // 100g * 2 = 200g
  });

  it('correctly replaces ingredient, leaves title unchanged without UPDATE_TITLE, and sets title when UPDATE_TITLE is provided', () => {
    const appleRecipe: Recipe = {
      id: 'apple-recipe',
      title: 'Apfel-Zimt Spekulatius Tiramisu',
      description: 'Test recipe',
      prepTime: 10,
      cookTime: 20,
      servings: 2,
      equipment: [],
      ingredients: [
        {
          name: 'Äpfel (Boskoop)',
          baseName: 'apfel',
          amount: 2,
          unit: 'Stück',
          category: 'PRODUCE',
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
    assert.strictEqual(remixedNoTitle.ingredients[0].name, 'Birnen (Abate Fetel)');

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