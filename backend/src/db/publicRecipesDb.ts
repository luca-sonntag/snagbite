import type { Recipe } from '@cookbook/shared';
import { db } from './drizzle.js';
import { recipes, userRecipes } from './schema/recipes.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { rowToRecipe } from './recipesMappers.js';

/**
 * Deterministically picks 2 recipes out of the available pool based on day seed.
 */
export function getDailyRotatedRecipes(recipeList: Recipe[], date: Date = new Date(), count = 2): Recipe[] {
  if (recipeList.length <= count) {
    return recipeList;
  }

  // Calculate day number since Unix Epoch (UTC calendar day)
  const dayNumber = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  
  // Deterministic offset
  const startIndex = Math.abs(dayNumber) % recipeList.length;
  const selected: Recipe[] = [];

  for (let i = 0; i < count; i++) {
    selected.push(recipeList[(startIndex + i) % recipeList.length]);
  }

  return selected;
}

/**
 * Fetches public recipes marked as is_demo.
 * If more than 2 exist, rotates 2 daily based on current date.
 */
export async function getPublicDemoRecipes(date: Date = new Date()): Promise<Recipe[]> {
  const rows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.visibility, 'public'), eq(recipes.isDemo, true)))
    .orderBy(asc(recipes.createdAt));

  const list = rows.map(rowToRecipe);
  return getDailyRotatedRecipes(list, date, 2);
}

/**
 * Fetches public recipe recommendations for a user.
 * - If user has no recipes: Returns popular / recent public recipes.
 * - If user has recipes: Recommends public recipes based on user's preferred tags and categories,
 *   excluding recipes already saved in the user's cookbook.
 */
export async function getPublicRecipeRecommendations(userId: string, limit = 6): Promise<Recipe[]> {
  // 1. Fetch user's saved recipe IDs and categories/tags
  const userRecipeRows = await db
    .select({
      recipeId: userRecipes.recipeId,
      isFavorite: userRecipes.isFavorite,
      category: recipes.category,
      tags: recipes.tags,
    })
    .from(userRecipes)
    .innerJoin(recipes, eq(userRecipes.recipeId, recipes.id))
    .where(eq(userRecipes.userId, userId));

  const savedRecipeIds = new Set<string>();
  const categoryFreq = new Map<string, number>();
  const tagFreq = new Map<string, number>();

  for (const ur of userRecipeRows) {
    savedRecipeIds.add(ur.recipeId);
    const weight = ur.isFavorite ? 3 : 1;
    if (ur.category) {
      categoryFreq.set(ur.category, (categoryFreq.get(ur.category) ?? 0) + weight);
    }
    if (Array.isArray(ur.tags)) {
      for (const t of ur.tags) {
        const clean = t.trim().toLowerCase();
        if (clean) tagFreq.set(clean, (tagFreq.get(clean) ?? 0) + weight);
      }
    }
  }

  // 2. Query candidates from public recipes
  const publicRows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.visibility, 'public'))
    .orderBy(desc(recipes.createdAt))
    .limit(60);

  const candidates = publicRows
    .filter((row) => !savedRecipeIds.has(row.id))
    .map(rowToRecipe);

  if (candidates.length <= limit) {
    return candidates;
  }

  // If user has no recipes, return newest candidates
  if (savedRecipeIds.size === 0) {
    return candidates.slice(0, limit);
  }

  // Score candidates according to category and tag match
  const scored = candidates.map((rec) => {
    let score = 0;
    if (rec.category && categoryFreq.has(rec.category)) {
      score += (categoryFreq.get(rec.category) ?? 0) * 2;
    }
    if (Array.isArray(rec.tags)) {
      for (const t of rec.tags) {
        const clean = t.trim().toLowerCase();
        if (tagFreq.has(clean)) {
          score += tagFreq.get(clean) ?? 0;
        }
      }
    }
    // slight novelty boost for is_demo
    if (rec.isDemo) {
      score += 1;
    }
    return { recipe: rec, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.recipe);
}
