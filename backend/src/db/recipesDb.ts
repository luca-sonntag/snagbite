import type {
  Recipe,
  SavedRecipe,
  UserRecipeSource,
} from '../types.js';
import {
  getClient,
  wrapError,
  isNoRowsError,
  num,
  RecipeRow,
  UserRecipeRow,
} from './client.js';
import { getCollectionMembership } from './collectionsDb.js';

export function rowToRecipe(row: RecipeRow): Recipe {
  const nutritionalValues =
    row.nutritional_values && typeof row.nutritional_values === 'object'
      ? (row.nutritional_values as Recipe['nutritionalValues'])
      : undefined;

  return {
    id: row.id,
    createdBy: row.created_by,
    visibility: row.visibility as Recipe['visibility'],
    origin: row.origin as Recipe['origin'],
    sourceUrl: row.source_url,
    sourceHandle: row.source_handle,
    parentRecipeId: row.parent_recipe_id,
    remixPrompt: row.remix_prompt,
    title: row.title,
    description: row.description ?? '',
    emoji: row.emoji,
    category: (row.category as Recipe['category']) ?? null,
    isRecipe: row.is_recipe,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    servings: num(row.servings) ?? 1,
    tags: row.tags ?? [],
    equipment: row.equipment ?? [],
    tips: row.tips ?? [],
    imageUrl: row.image_url,
    imageUrls: row.image_urls ?? [],
    imagePrompt: row.image_prompt,
    isAiCover: row.is_ai_cover,
    transcript: row.transcript,
    ingredients: (row.ingredients as Recipe['ingredients']) ?? [],
    instructions: (row.instructions as Recipe['instructions']) ?? [],
    alternativeIngredients:
      (row.alternative_ingredients as Recipe['alternativeIngredients']) ?? undefined,
    ...(nutritionalValues ? { nutritionalValues } : {}),
    sourceNutritionalValues:
      (row.source_nutritional_values as Recipe['sourceNutritionalValues']) ?? null,
    healthScore: num(row.health_score) ?? null,
    healthScoreBreakdown:
      (row.health_score_breakdown as Recipe['healthScoreBreakdown']) ?? null,
    hasExplicitNutritionalValues: row.has_explicit_nutritional_values,
    hasIncompleteSourceInfo: Boolean(row.has_incomplete_source_info),
    isDemo: Boolean(row.is_demo),
    nutritionCoverage: num(row.nutrition_coverage) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function recipeToRow(recipe: Recipe): Record<string, unknown> {
  const n = recipe.nutritionalValues;
  return {
    visibility: recipe.visibility ?? 'private',
    source_url: recipe.sourceUrl ?? null,
    source_handle: recipe.sourceHandle ?? null,
    parent_recipe_id: recipe.parentRecipeId ?? null,
    remix_prompt: recipe.remixPrompt ?? null,
    title: recipe.title,
    description: recipe.description ?? null,
    emoji: recipe.emoji ?? null,
    category: recipe.category ?? null,
    is_recipe: recipe.isRecipe ?? true,
    prep_time: recipe.prepTime ?? null,
    cook_time: recipe.cookTime ?? null,
    servings: recipe.servings ?? null,
    tags: recipe.tags ?? [],
    equipment: recipe.equipment ?? [],
    tips: recipe.tips ?? [],
    image_url: recipe.imageUrl ?? null,
    image_urls: recipe.imageUrls ?? [],
    image_prompt: recipe.imagePrompt ?? null,
    is_ai_cover: recipe.isAiCover ?? false,
    transcript: recipe.transcript ?? null,
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    alternative_ingredients: recipe.alternativeIngredients ?? null,
    nutritional_values: n ?? null,
    source_nutritional_values: recipe.sourceNutritionalValues ?? null,
    health_score: recipe.healthScore ?? null,
    health_score_breakdown: recipe.healthScoreBreakdown ?? null,
    has_explicit_nutritional_values: recipe.hasExplicitNutritionalValues ?? false,
    has_incomplete_source_info: recipe.hasIncompleteSourceInfo ?? false,
    is_demo: recipe.isDemo ?? false,
    nutrition_coverage: recipe.nutritionCoverage ?? null,
  };
}

export function rowToSavedRecipe(row: UserRecipeRow): SavedRecipe {
  return {
    recipeId: row.recipe_id,
    recipe: rowToRecipe(row.recipes as RecipeRow),
    source: row.source as UserRecipeSource,
    isFavorite: row.is_favorite,
    flags: row.flags ?? [],
    collectionIds: [],
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

const SAVED_RECIPE_SELECT = '*, recipes(*)';

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await getClient()
    .from('recipes')
    .select()
    .eq('id', id)
    .returns<RecipeRow>()
    .single();

  if (error) {
    if (isNoRowsError(error)) return null;
    throw wrapError(`Failed to get recipe ${id}`, error);
  }
  return rowToRecipe(data);
}

export async function updateRecipe(id: string, recipe: Recipe): Promise<Recipe> {
  const { data, error } = await getClient()
    .from('recipes')
    .update({ ...recipeToRow(recipe), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .returns<RecipeRow>()
    .single();

  if (error) throw wrapError(`Failed to update recipe ${id}`, error);
  return rowToRecipe(data);
}

export async function createRecipeForUser(
  userId: string,
  recipe: Recipe,
  origin: Recipe['origin'],
  source: UserRecipeSource
): Promise<Recipe> {
  const { data, error } = await getClient()
    .from('recipes')
    .insert({ ...recipeToRow(recipe), created_by: userId, origin })
    .select()
    .returns<RecipeRow>()
    .single();

  if (error) throw wrapError('Failed to create recipe', error);

  const saved = rowToRecipe(data);
  await addToLibrary(userId, saved.id!, source);
  return saved;
}

export async function getRecipeTitles(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await getClient()
    .from('recipes')
    .select('id, title')
    .in('id', ids)
    .returns<{ id: string; title: string }[]>();

  if (error) throw wrapError('Failed to get recipe titles', error);
  return new Map(data.map((r) => [r.id, r.title]));
}

export async function addToLibrary(
  userId: string,
  recipeId: string,
  source: UserRecipeSource = 'extraction',
  jobId?: string | null
): Promise<void> {
  const { error } = await getClient()
    .from('user_recipes')
    .upsert(
      { user_id: userId, recipe_id: recipeId, source, source_job_id: jobId ?? null },
      { onConflict: 'user_id,recipe_id', ignoreDuplicates: true }
    );

  if (error) throw wrapError('Failed to add recipe to library', error);
}

export async function removeFromLibrary(userId: string, recipeId: string): Promise<boolean> {
  // If this recipe is a parent recipe with user remixes, remove those remixes as well
  const remixes = await getUserRecipeRemixes(userId, recipeId);
  for (const remix of remixes) {
    if (remix.id) {
      await getClient()
        .from('user_recipes')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', remix.id);
    }
  }

  const { data, error } = await getClient()
    .from('user_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .select('id');

  if (error) throw wrapError('Failed to remove recipe from library', error);

  // If this was a private remix created by the user, also clean up the recipes table
  try {
    await getClient()
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('created_by', userId)
      .eq('origin', 'remix');
  } catch (cleanupErr) {
    console.warn(`[removeFromLibrary] Could not clean up private remix ${recipeId} from recipes:`, cleanupErr);
  }

  return (data?.length ?? 0) > 0;
}

export async function isInLibrary(userId: string, recipeId: string): Promise<boolean> {
  const { count, error } = await getClient()
    .from('user_recipes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('recipe_id', recipeId);

  if (error) throw wrapError('Failed to check library membership', error);
  return (count ?? 0) > 0;
}

async function attachParentTitle(recipe: Recipe): Promise<void> {
  if (!recipe.parentRecipeId) return;
  try {
    const titles = await getRecipeTitles([recipe.parentRecipeId]);
    recipe.parentRecipeTitle = titles.get(recipe.parentRecipeId) ?? null;
  } catch (err) {
    console.warn('Failed to resolve parent recipe title:', err);
  }
}

export async function getSavedRecipe(userId: string, recipeId: string): Promise<SavedRecipe | null> {
  const { data, error } = await getClient()
    .from('user_recipes')
    .select(SAVED_RECIPE_SELECT)
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .single();

  if (error) {
    if (isNoRowsError(error)) return null;
    throw wrapError(`Failed to get saved recipe ${recipeId}`, error);
  }
  const row = data as unknown as UserRecipeRow;
  if (!row.recipes) return null;

  const saved = rowToSavedRecipe(row);
  const memberships = await getCollectionMembership(userId);
  saved.collectionIds = memberships[recipeId] ?? [];
  await attachParentTitle(saved.recipe);
  return saved;
}

export async function getLibrary(userId: string): Promise<SavedRecipe[]> {
  const { data, error } = await getClient()
    .from('user_recipes')
    .select(SAVED_RECIPE_SELECT)
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
    .returns<UserRecipeRow[]>();

  if (error) throw wrapError('Failed to get library', error);

  // Compute remix counts per parent recipe ID for this user
  const remixCounts = new Map<string, number>();
  for (const row of data) {
    const parentId = (row.recipes as RecipeRow)?.parent_recipe_id;
    if (parentId) {
      remixCounts.set(parentId, (remixCounts.get(parentId) ?? 0) + 1);
    }
  }

  // Filter out remix recipes so only top-level (original) recipes appear in the main library
  const topLevelRows = data.filter((row) => row.recipes && !(row.recipes as RecipeRow).parent_recipe_id);
  const saved = topLevelRows.map(rowToSavedRecipe);

  for (const entry of saved) {
    entry.remixCount = remixCounts.get(entry.recipeId) ?? 0;
    if (entry.recipe) {
      entry.recipe.remixCount = entry.remixCount;
    }
  }

  try {
    const memberships = await getCollectionMembership(userId);
    for (const entry of saved) {
      entry.collectionIds = memberships[entry.recipeId] ?? [];
    }
  } catch (err) {
    console.warn('Failed to load collection memberships for library:', err);
  }

  return saved;
}

export async function getUserRecipeRemixes(userId: string, parentRecipeId: string): Promise<Recipe[]> {
  const { data, error } = await getClient()
    .from('user_recipes')
    .select(SAVED_RECIPE_SELECT)
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
    .returns<UserRecipeRow[]>();

  if (error) throw wrapError(`Failed to get remixes for recipe ${parentRecipeId}`, error);

  return (data ?? [])
    .filter((row) => row.recipes && (row.recipes as RecipeRow).parent_recipe_id === parentRecipeId)
    .map((row) => rowToRecipe(row.recipes as RecipeRow));
}

export async function countLibraryEntries(userId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('user_recipes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw wrapError('Failed to count library entries', error);
  return count ?? 0;
}

export async function setFavorite(
  recipeId: string,
  userId: string,
  value: boolean
): Promise<void> {
  const { error } = await getClient()
    .from('user_recipes')
    .update({ is_favorite: value, updated_at: new Date().toISOString() })
    .eq('recipe_id', recipeId)
    .eq('user_id', userId);

  if (error) throw wrapError(`Failed to set favorite for recipe ${recipeId}`, error);
}

export async function setFlags(
  recipeId: string,
  userId: string,
  flags: string[]
): Promise<void> {
  const { error } = await getClient()
    .from('user_recipes')
    .update({ flags, updated_at: new Date().toISOString() })
    .eq('recipe_id', recipeId)
    .eq('user_id', userId);

  if (error) throw wrapError(`Failed to set flags for recipe ${recipeId}`, error);
}
