import type {
  Recipe,
  SavedRecipe,
  UserRecipeSource,
} from '../types.js';
import { db } from './drizzle.js';
import { recipes, userRecipes } from './schema/recipes.js';
import { eq, and, desc, inArray, count } from 'drizzle-orm';
import { getCollectionMembership } from './collectionsDb.js';
import {
  rowToRecipe,
  recipeToRow,
  recipeToDrizzle,
  rowToSavedRecipe,
  normalizeRawIngredients,
} from './recipesMappers.js';

export {
  rowToRecipe,
  recipeToRow,
  recipeToDrizzle,
  rowToSavedRecipe,
  normalizeRawIngredients,
};

export async function getRecipe(id: string): Promise<Recipe | null> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, id))
    .limit(1);

  if (!row) return null;
  return rowToRecipe(row);
}

export async function updateRecipe(id: string, recipe: Recipe): Promise<Recipe> {
  const [updated] = await db
    .update(recipes)
    .set({
      ...recipeToDrizzle(recipe),
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id))
    .returning();

  if (!updated) throw new Error(`Failed to update recipe ${id}: recipe not found`);
  return rowToRecipe(updated);
}

export async function createRecipeForUser(
  userId: string,
  recipe: Recipe,
  origin: Recipe['origin'],
  source: UserRecipeSource
): Promise<Recipe> {
  const [inserted] = await db
    .insert(recipes)
    .values({
      ...recipeToDrizzle(recipe),
      createdBy: userId,
      origin: origin ?? 'url',
    })
    .returning();

  const saved = rowToRecipe(inserted);
  await addToLibrary(userId, saved.id!, source);
  return saved;
}

export async function getRecipeTitles(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: recipes.id, title: recipes.title })
    .from(recipes)
    .where(inArray(recipes.id, ids));

  return new Map(rows.map((r) => [r.id, r.title]));
}

export async function addToLibrary(
  userId: string,
  recipeId: string,
  source: UserRecipeSource = 'extraction',
  jobId?: string | null
): Promise<void> {
  await db
    .insert(userRecipes)
    .values({
      userId,
      recipeId,
      source,
      sourceJobId: jobId ?? null,
    })
    .onConflictDoNothing({
      target: [userRecipes.userId, userRecipes.recipeId],
    });
}

export async function removeFromLibrary(userId: string, recipeId: string): Promise<boolean> {
  const remixes = await getUserRecipeRemixes(userId, recipeId);
  for (const remix of remixes) {
    if (remix.id) {
      await db
        .delete(userRecipes)
        .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, remix.id)));
    }
  }

  const deleted = await db
    .delete(userRecipes)
    .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)))
    .returning({ id: userRecipes.id });

  try {
    await db
      .delete(recipes)
      .where(and(
        eq(recipes.id, recipeId),
        eq(recipes.createdBy, userId),
        eq(recipes.origin, 'remix')
      ));
  } catch (cleanupErr) {
    console.warn(`[removeFromLibrary] Could not clean up private remix ${recipeId} from recipes:`, cleanupErr);
  }

  return deleted.length > 0;
}

export async function isInLibrary(userId: string, recipeId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userRecipes.id })
    .from(userRecipes)
    .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)))
    .limit(1);

  return Boolean(row);
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
  const [row] = await db
    .select({
      userRecipe: userRecipes,
      recipe: recipes,
    })
    .from(userRecipes)
    .innerJoin(recipes, eq(userRecipes.recipeId, recipes.id))
    .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)))
    .limit(1);

  if (!row) return null;

  const saved = rowToSavedRecipe({ ...row.userRecipe, recipe: row.recipe });
  const memberships = await getCollectionMembership(userId);
  saved.collectionIds = memberships[recipeId] ?? [];
  await attachParentTitle(saved.recipe);
  return saved;
}

export async function getLibrary(userId: string): Promise<SavedRecipe[]> {
  const rows = await db
    .select({
      userRecipe: userRecipes,
      recipe: recipes,
    })
    .from(userRecipes)
    .innerJoin(recipes, eq(userRecipes.recipeId, recipes.id))
    .where(eq(userRecipes.userId, userId))
    .orderBy(desc(userRecipes.addedAt));

  const remixCounts = new Map<string, number>();
  for (const row of rows) {
    const parentId = row.recipe.parentRecipeId;
    if (parentId) {
      remixCounts.set(parentId, (remixCounts.get(parentId) ?? 0) + 1);
    }
  }

  const topLevelRows = rows.filter((r) => !r.recipe.parentRecipeId);
  const saved = topLevelRows.map((r) => rowToSavedRecipe({ ...r.userRecipe, recipe: r.recipe }));

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
  const rows = await db
    .select({
      recipe: recipes,
    })
    .from(userRecipes)
    .innerJoin(recipes, eq(userRecipes.recipeId, recipes.id))
    .where(and(
      eq(userRecipes.userId, userId),
      eq(recipes.parentRecipeId, parentRecipeId)
    ))
    .orderBy(desc(userRecipes.addedAt));

  return rows.map((r) => rowToRecipe(r.recipe));
}

export async function countLibraryEntries(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(userRecipes)
    .where(eq(userRecipes.userId, userId));

  return Number(row?.count ?? 0);
}

export async function setFavorite(
  recipeId: string,
  userId: string,
  value: boolean
): Promise<void> {
  await db
    .update(userRecipes)
    .set({ isFavorite: value, updatedAt: new Date() })
    .where(and(eq(userRecipes.recipeId, recipeId), eq(userRecipes.userId, userId)));
}

export async function setFlags(
  recipeId: string,
  userId: string,
  flags: string[]
): Promise<void> {
  await db
    .update(userRecipes)
    .set({ flags, updatedAt: new Date() })
    .where(and(eq(userRecipes.recipeId, recipeId), eq(userRecipes.userId, userId)));
}
