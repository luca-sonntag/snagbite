import { randomUUID } from 'node:crypto';
import type { Collection } from '../types.js';
import { db } from './drizzle.js';
import { collections, recipeCollections } from './schema/collections.js';
import { userRecipes } from './schema/recipes.js';
import { eq, and, asc } from 'drizzle-orm';

export async function listCollections(userId: string): Promise<Collection[]> {
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(asc(collections.position), asc(collections.createdAt));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    emoji: row.emoji ?? undefined,
    position: row.position,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }));
}

export async function createCollection(
  userId: string,
  col: Partial<Collection>
): Promise<Collection> {
  const id = col.id || randomUUID();
  const position = col.position ?? 0;

  const [row] = await db
    .insert(collections)
    .values({
      id,
      userId,
      name: col.name!,
      emoji: col.emoji || null,
      position,
    })
    .returning();

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    emoji: row.emoji ?? undefined,
    position: row.position,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function updateCollection(
  id: string,
  userId: string,
  col: Partial<Collection>
): Promise<Collection> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (col.name !== undefined) updates.name = col.name;
  if (col.emoji !== undefined) updates.emoji = col.emoji;
  if (col.position !== undefined) updates.position = col.position;

  const [row] = await db
    .update(collections)
    .set(updates)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning();

  if (!row) throw new Error(`Failed to update collection ${id}: not found`);

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    emoji: row.emoji ?? undefined,
    position: row.position,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function deleteCollection(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning({ id: collections.id });

  return deleted.length > 0;
}

export async function getCollectionMembership(
  userId: string
): Promise<Record<string, string[]>> {
  const rows = await db
    .select({
      collectionId: recipeCollections.collectionId,
      recipeId: userRecipes.recipeId,
    })
    .from(recipeCollections)
    .innerJoin(userRecipes, eq(recipeCollections.userRecipeId, userRecipes.id))
    .where(eq(recipeCollections.userId, userId));

  const mapping: Record<string, string[]> = {};
  for (const row of rows) {
    if (!row.recipeId) continue;
    mapping[row.recipeId] ??= [];
    mapping[row.recipeId].push(row.collectionId);
  }
  return mapping;
}

export async function setRecipeCollections(
  recipeId: string,
  userId: string,
  collectionIds: string[]
): Promise<void> {
  const [entry] = await db
    .select({ id: userRecipes.id })
    .from(userRecipes)
    .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)))
    .limit(1);

  if (!entry) throw new Error(`Failed to resolve library entry for collections: recipe ${recipeId}`);
  const entryId = entry.id;

  await db
    .delete(recipeCollections)
    .where(and(
      eq(recipeCollections.userRecipeId, entryId),
      eq(recipeCollections.userId, userId)
    ));

  if (collectionIds.length > 0) {
    await db
      .insert(recipeCollections)
      .values(collectionIds.map((cid) => ({
        collectionId: cid,
        userRecipeId: entryId,
        userId,
      })));
  }
}
