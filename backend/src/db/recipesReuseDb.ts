import type { Recipe } from '../types.js';
import { db } from './drizzle.js';
import { recipes } from './schema/recipes.js';
import { jobs } from './schema/jobs.js';
import { eq, and, desc } from 'drizzle-orm';
import { rowToRecipe } from './recipesMappers.js';

/**
 * Searches for an existing public recipe that matches the normalized URL and language.
 * Checks the authoritative recipes table first, with a fallback to completed jobs
 * for legacy records that have not yet been backfilled.
 */
export async function findReusableRecipe(
  sourceUrlNormalized: string,
  language: string
): Promise<Recipe | null> {
  if (!sourceUrlNormalized) return null;

  // 1. Direct lookup in recipes table
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(
      eq(recipes.sourceUrlNormalized, sourceUrlNormalized),
      eq(recipes.language, language),
      eq(recipes.visibility, 'public'),
      eq(recipes.origin, 'url'),
      eq(recipes.isRecipe, true)
    ))
    .orderBy(desc(recipes.createdAt))
    .limit(1);

  if (row) {
    const recipe = rowToRecipe(row);
    if (recipe.ingredients?.length && recipe.instructions?.length) {
      return recipe;
    }
  }

  // 2. Fallback for legacy recipes: lookup via completed jobs
  const [jobRow] = await db
    .select({ recipe: recipes })
    .from(jobs)
    .innerJoin(recipes, eq(jobs.recipeId, recipes.id))
    .where(and(
      eq(jobs.sourceUrlNormalized, sourceUrlNormalized),
      eq(jobs.status, 'completed'),
      eq(recipes.language, language),
      eq(recipes.visibility, 'public'),
      eq(recipes.origin, 'url'),
      eq(recipes.isRecipe, true)
    ))
    .orderBy(desc(jobs.createdAt))
    .limit(1);

  if (jobRow?.recipe) {
    const recipe = rowToRecipe(jobRow.recipe);
    if (recipe.ingredients?.length && recipe.instructions?.length) {
      if (!recipe.sourceUrlNormalized && recipe.id) {
        db.update(recipes)
          .set({ sourceUrlNormalized })
          .where(eq(recipes.id, recipe.id))
          .catch((err) => console.warn(`[findReusableRecipe] Failed to backfill sourceUrlNormalized on ${recipe.id}:`, err));
      }
      return recipe;
    }
  }

  return null;
}
