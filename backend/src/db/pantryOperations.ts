import {
  type PantrySuggestion,
  type Recipe,
  type PantryItem,
} from '@cookbook/shared';
import { db } from './drizzle.js';
import { pantryItems } from './schema/pantryAndShopping.js';
import { recipes, userRecipes } from './schema/recipes.js';
import { eq, and } from 'drizzle-orm';
import { listPantryItems } from './pantryDb.js';
import { rowToRecipe } from './recipesMappers.js';
import { calculatePantryDeduction } from '../matching/pantryDeduction.js';
import { buildMappingKeys } from '../matching/baseNameCanonical.js';

/**
 * Deducts ingredients of a cooked recipe from user's pantry.
 * Floors amounts at 0 rather than deleting items.
 */
export async function deductRecipeIngredientsFromPantry(
  recipe: Recipe,
  userId: string
): Promise<{ consumedCount: number }> {
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return { consumedCount: 0 };
  }

  const items = await listPantryItems(userId);
  if (items.length === 0) {
    return { consumedCount: 0 };
  }

  let consumedCount = 0;

  for (const ing of recipe.ingredients) {
    const ingKeys = new Set(buildMappingKeys(ing.baseName, ing.name, ing.synonyms, ing.parentIngredient));

    const match = items.find((p) => {
      if (p.amount <= 0) return false;
      if (ing.canonicalId && p.canonicalId && ing.canonicalId === p.canonicalId) return true;
      const pKeys = buildMappingKeys(p.baseName, p.name);
      return pKeys.some((k) => ingKeys.has(k));
    });

    if (match && match.amount > 0) {
      const deduction = calculatePantryDeduction(match, ing);
      const newAmount = Math.max(0, Math.round((match.amount - deduction) * 100) / 100);
      match.amount = newAmount;

      await db
        .update(pantryItems)
        .set({
          amount: String(newAmount),
          updatedAt: new Date(),
        })
        .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, userId)));

      consumedCount++;
    }
  }

  return { consumedCount };
}

/**
 * Deduct ingredients consumed by cooking a recipe from user's pantry, floored at 0.
 */
export async function consumePantryForRecipe(
  userId: string,
  recipe: Recipe
): Promise<{ consumedCount: number }> {
  return deductRecipeIngredientsFromPantry(recipe, userId);
}

/**
 * Suggestions based on expiring and available pantry ingredients.
 */
export async function getPantryRecipeSuggestions(
  userId: string,
  limit = 10
): Promise<PantrySuggestion[]> {
  const pantry = await listPantryItems(userId);
  if (pantry.length === 0) return [];

  const now = new Date();
  const fiveDaysOut = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const activePantry = pantry.filter((p) => p.amount > 0);
  const expiringPantry = activePantry.filter((p) => p.expiresAt && p.expiresAt <= fiveDaysOut);

  const pantryNames = new Set(
    activePantry.flatMap((p) => [
      (p.name || '').toLowerCase().trim(),
      (p.baseName || '').toLowerCase().trim(),
    ]).filter(Boolean)
  );

  const expiringNames = new Set(
    expiringPantry.flatMap((p) => [
      (p.name || '').toLowerCase().trim(),
      (p.baseName || '').toLowerCase().trim(),
    ]).filter(Boolean)
  );

  // Query user's own recipes
  const userRecipeRows = await db
    .select({
      recipe: recipes,
    })
    .from(userRecipes)
    .innerJoin(recipes, eq(userRecipes.recipeId, recipes.id))
    .where(eq(userRecipes.userId, userId));

  // Query public recipes
  const publicRecipeRows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.visibility, 'public'))
    .limit(50);

  const candidates = new Map<string, { recipe: Recipe; isPublic: boolean }>();

  for (const ur of userRecipeRows) {
    if (ur.recipe) {
      candidates.set(ur.recipe.id, { recipe: rowToRecipe(ur.recipe), isPublic: false });
    }
  }

  for (const pr of publicRecipeRows) {
    if (!candidates.has(pr.id)) {
      candidates.set(pr.id, { recipe: rowToRecipe(pr), isPublic: true });
    }
  }

  const suggestions: PantrySuggestion[] = [];

  for (const [recipeId, { recipe, isPublic }] of candidates.entries()) {
    const flatIngredients = recipe.ingredients || [];
    if (flatIngredients.length === 0) continue;

    const matching: string[] = [];
    const expiring: string[] = [];

    for (const ing of flatIngredients) {
      const name = (ing.name || '').toLowerCase().trim();
      const base = (ing.baseName || '').toLowerCase().trim();

      const isPantryMatch = pantryNames.has(name) || Boolean(base && pantryNames.has(base));
      const isExpiringMatch = expiringNames.has(name) || Boolean(base && expiringNames.has(base));

      if (isExpiringMatch) {
        expiring.push(ing.name);
      }
      if (isPantryMatch) {
        matching.push(ing.name);
      }
    }

    if (matching.length === 0) continue;

    const matchScore = expiring.length * 3 + matching.length;
    const missingCount = Math.max(0, flatIngredients.length - matching.length);

    suggestions.push({
      recipeId,
      recipe,
      matchScore,
      matchingIngredients: matching,
      expiringIngredients: expiring,
      missingIngredientsCount: missingCount,
      isPublic,
    });
  }

  suggestions.sort((a, b) => b.matchScore - a.matchScore || a.missingIngredientsCount - b.missingIngredientsCount);

  return suggestions.slice(0, limit);
}
