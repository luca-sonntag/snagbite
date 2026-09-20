import { randomUUID } from 'node:crypto';
import type { Collection } from '../types.js';
import { getClient, wrapError } from './client.js';
import type { CollectionRow } from './types.js';


export async function listCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await getClient()
    .from('collections')
    .select()
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<CollectionRow[]>();

  if (error) throw wrapError('Failed to list collections', error);

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    emoji: row.emoji,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createCollection(
  userId: string,
  col: Partial<Collection>
): Promise<Collection> {
  const now = new Date().toISOString();
  const id = col.id || randomUUID();
  const position = col.position ?? 0;

  const { data, error } = await getClient()
    .from('collections')
    .insert({
      id,
      user_id: userId,
      name: col.name!,
      emoji: col.emoji || null,
      position,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single<CollectionRow>();

  if (error) throw wrapError('Failed to create collection', error);

  const row = data!;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    emoji: row.emoji,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateCollection(
  id: string,
  userId: string,
  col: Partial<Collection>
): Promise<Collection> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };
  if (col.name !== undefined) updates.name = col.name;
  if (col.emoji !== undefined) updates.emoji = col.emoji;
  if (col.position !== undefined) updates.position = col.position;

  const { data, error } = await getClient()
    .from('collections')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single<CollectionRow>();

  if (error) throw wrapError(`Failed to update collection ${id}`, error);

  const row = data!;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    emoji: row.emoji,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


export async function deleteCollection(id: string, userId: string): Promise<boolean> {
  const { error, count } = await getClient()
    .from('collections')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw wrapError(`Failed to delete collection ${id}`, error);
  return (count ?? 0) > 0;
}

export async function getCollectionMembership(
  userId: string
): Promise<Record<string, string[]>> {
  const { data, error } = await getClient()
    .from('recipe_collections')
    .select('collection_id, user_recipes!inner(recipe_id)')
    .eq('user_id', userId);

  if (error) throw wrapError('Failed to get collection membership', error);

  const mapping: Record<string, string[]> = {};
  const rows = (data ?? []) as unknown as Array<{
    collection_id: string;
    user_recipes?: { recipe_id?: string } | null;
  }>;

  for (const row of rows) {
    const recipeId = row.user_recipes?.recipe_id;
    if (!recipeId) continue;
    mapping[recipeId] ??= [];
    mapping[recipeId].push(row.collection_id);
  }
  return mapping;
}

export async function setRecipeCollections(
  recipeId: string,
  userId: string,
  collectionIds: string[]
): Promise<void> {
  const { data: entry, error: lookupError } = await getClient()
    .from('user_recipes')
    .select('id')
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .single();

  if (lookupError) throw wrapError('Failed to resolve library entry for collections', lookupError);
  const entryId = (entry as { id: string }).id;

  const { error: deleteError } = await getClient()
    .from('recipe_collections')
    .delete()
    .eq('user_recipe_id', entryId)
    .eq('user_id', userId);

  if (deleteError) throw wrapError('Failed to clear old recipe collections', deleteError);

  if (collectionIds.length > 0) {
    const inserts = collectionIds.map((cid) => ({
      collection_id: cid,
      user_recipe_id: entryId,
      user_id: userId,
    }));
    const { error: insertError } = await getClient()
      .from('recipe_collections')
      .insert(inserts);

    if (insertError) throw wrapError('Failed to save new recipe collections', insertError);
  }
}
