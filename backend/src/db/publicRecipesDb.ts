import type { Recipe } from '@cookbook/shared';
import { getClient, wrapError, RecipeRow } from './client.js';
import { rowToRecipe } from './recipesDb.js';

/**
 * Deterministically picks 2 recipes out of the available pool based on day seed.
 */
export function getDailyRotatedRecipes(recipes: Recipe[], date: Date = new Date(), count = 2): Recipe[] {
  if (recipes.length <= count) {
    return recipes;
  }

  // Calculate day number since Unix Epoch (UTC calendar day)
  const dayNumber = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  
  // Deterministic offset
  const startIndex = Math.abs(dayNumber) % recipes.length;
  const selected: Recipe[] = [];

  for (let i = 0; i < count; i++) {
    selected.push(recipes[(startIndex + i) % recipes.length]);
  }

  return selected;
}

/**
 * Fetches public recipes marked as is_demo.
 * If more than 2 exist, rotates 2 daily based on current date.
 */
export async function getPublicDemoRecipes(date: Date = new Date()): Promise<Recipe[]> {
  const { data, error } = await getClient()
    .from('recipes')
    .select('*')
    .eq('visibility', 'public')
    .eq('is_demo', true)
    .order('created_at', { ascending: true })
    .returns<RecipeRow[]>();

  if (error) throw wrapError('Failed to get public demo recipes', error);
  const recipes = (data || []).map(rowToRecipe);

  return getDailyRotatedRecipes(recipes, date, 2);
}

/**
 * Fetches public recipe recommendations for a user.
 * - If user has no recipes: Returns popular / recent public recipes.
 * - If user has recipes: Recommends public recipes based on user's preferred tags and categories,
 *   excluding recipes already saved in the user's cookbook.
 */
export async function getPublicRecipeRecommendations(userId: string, limit = 6): Promise<Recipe[]> {
  // 1. Fetch user's saved recipe IDs and categories/tags
  const { data: userRecipes, error: userError } = await getClient()
    .from('user_recipes')
    .select('recipe_id, is_favorite, recipes(*)')
    .eq('user_id', userId);

  if (userError) throw wrapError('Failed to fetch user recipes for recommendations', userError);

  const savedRecipeIds = new Set<string>();
  const categoryFreq = new Map<string, number>();
  const tagFreq = new Map<string, number>();

  if (userRecipes && userRecipes.length > 0) {
    for (const ur of userRecipes as unknown as Array<{ recipe_id: string; is_favorite: boolean; recipes: RecipeRow | null }>) {
      savedRecipeIds.add(ur.recipe_id);
      if (ur.recipes) {
        const weight = ur.is_favorite ? 3 : 1;
        if (ur.recipes.category) {
          categoryFreq.set(ur.recipes.category, (categoryFreq.get(ur.recipes.category) ?? 0) + weight);
        }
        if (Array.isArray(ur.recipes.tags)) {
          for (const t of ur.recipes.tags) {
            const clean = t.trim().toLowerCase();
            if (clean) tagFreq.set(clean, (tagFreq.get(clean) ?? 0) + weight);
          }
        }
      }
    }
  }

  // 2. Query candidates from public recipes
  const { data: publicRows, error: pubError } = await getClient()
    .from('recipes')
    .select('*')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(60)
    .returns<RecipeRow[]>();

  if (pubError) throw wrapError('Failed to fetch public recipes for recommendations', pubError);

  const candidates = (publicRows || [])
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
