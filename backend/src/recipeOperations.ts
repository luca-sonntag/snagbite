import type {
  Recipe,
  RecipeOperation,
  Ingredient,
  InstructionStep,
} from './types.js';

function matchesIngredientName(ing: Ingredient, targetName: string): boolean {
  if (!targetName) return false;
  const target = targetName.trim().toLowerCase();
  const name = (ing.name || '').trim().toLowerCase();
  const baseName = (ing.baseName || '').trim().toLowerCase();
  const matchedName = (ing.matchedName || '').trim().toLowerCase();

  return (
    name === target ||
    baseName === target ||
    matchedName === target ||
    name.includes(target) ||
    target.includes(name)
  );
}

/**
 * Pure, deterministic function to apply structured recipe operations to a base recipe.
 * Deep-clones the recipe so the original is never mutated.
 */
export function applyRecipeOperations(baseRecipe: Recipe, operations: RecipeOperation[]): Recipe {
  if (!operations || operations.length === 0) {
    return structuredClone(baseRecipe);
  }

  const recipe: Recipe = structuredClone(baseRecipe);
  recipe.origin = 'remix';
  recipe.parentRecipeId = baseRecipe.id ?? recipe.parentRecipeId ?? null;
  recipe.parentRecipeTitle = baseRecipe.title;

  for (const op of operations) {
    switch (op.type) {
      case 'REPLACE_INGREDIENT': {
        if (!op.newIngredient || !op.targetIngredientName) break;

        const newIng: Ingredient = {
          ...op.newIngredient,
          replacedOriginal: op.targetIngredientName,
        };

        const idx = recipe.ingredients.findIndex((item) =>
          matchesIngredientName(item, op.targetIngredientName!)
        );
        if (idx !== -1) {
          recipe.ingredients[idx] = newIng;
        } else {
          recipe.ingredients.push(newIng);
        }
        break;
      }

      case 'ADD_INGREDIENTS': {
        const toAdd = op.newIngredients || (op.newIngredient ? [op.newIngredient] : []);
        if (toAdd.length === 0) break;

        for (const newIng of toAdd) {
          const exists = recipe.ingredients.some(
            (i) => i.name.trim().toLowerCase() === newIng.name.trim().toLowerCase()
          );
          if (!exists) {
            recipe.ingredients.push({
              ...newIng,
              ...(op.groupName ? { section: op.groupName } : {}),
            });
          }
        }
        break;
      }

      case 'REMOVE_INGREDIENT': {
        if (!op.removeIngredientName) break;
        const target = op.removeIngredientName;
        recipe.ingredients = recipe.ingredients.filter((item) => !matchesIngredientName(item, target));
        break;
      }

      case 'SCALE_SERVINGS': {
        if (!op.newServings || op.newServings <= 0 || !recipe.servings || recipe.servings <= 0) break;
        const scaleFactor = op.newServings / recipe.servings;
        recipe.servings = op.newServings;

        for (const item of recipe.ingredients) {
          if (typeof item.amount === 'number' && item.amount > 0) {
            const scaled = item.amount * scaleFactor;
            item.amount = Math.round(scaled * 100) / 100;
          }
        }
        break;
      }

      case 'UPDATE_INSTRUCTION': {
        if (op.stepUpdates && op.stepUpdates.length > 0) {
          for (const update of op.stepUpdates) {
            const stepObj = recipe.instructions.find((s) => s.step === update.step);
            if (stepObj) {
              stepObj.description = update.description;
              if (update.parallelPrepHint !== undefined) {
                stepObj.parallelPrepHint = update.parallelPrepHint;
              }
            }
          }
        }
        break;
      }

      case 'ADD_INSTRUCTION_STEP': {
        const stepsToAdd = op.newSteps || [];
        for (const stepInfo of stepsToAdd) {
          const nextStepNum = recipe.instructions.length + 1;
          const newStep: InstructionStep = {
            step: nextStepNum,
            description: stepInfo.description,
            ...(stepInfo.parallelPrepHint ? { parallelPrepHint: stepInfo.parallelPrepHint } : {}),
          };
          recipe.instructions.push(newStep);
        }
        break;
      }

      case 'UPDATE_TITLE': {
        if (op.newTitle?.trim()) {
          recipe.title = op.newTitle.trim();
        }
        break;
      }

      default:
        break;
    }
  }

  return recipe;
}
