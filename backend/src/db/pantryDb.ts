import {
  type PantryItem,
  type CreatePantryItemDto,
  type UpdatePantryItemDto,
  getDefaultShelfLifeDays,
  calculateExpiresAtDate,
} from '@cookbook/shared';
import { num } from './client.js';
import { db } from './drizzle.js';
import { pantryItems } from './schema/pantryAndShopping.js';
import { eq, and, asc, desc } from 'drizzle-orm';
import { buildMappingKeys } from '../matching/baseNameCanonical.js';

export {
  deductRecipeIngredientsFromPantry,
  consumePantryForRecipe,
  getPantryRecipeSuggestions,
} from './pantryOperations.js';

export function rowToPantryItem(row: any): PantryItem {
  const rawCreatedAt = row.createdAt ?? row.created_at;
  const rawUpdatedAt = row.updatedAt ?? row.updated_at;
  const rawExpiresAt = row.expiresAt ?? row.expires_at;

  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    name: row.name,
    baseName: (row.baseName ?? row.base_name) ?? undefined,
    mappingKey: (row.mappingKey ?? row.mapping_key) ?? undefined,
    category: (row.category ?? undefined),
    amount: num(row.amount) ?? 0,
    unit: row.unit,
    canonicalId: (row.canonicalId ?? row.canonical_id) ?? null,
    notes: row.notes ?? undefined,
    expiresAt: rawExpiresAt ?? null,
    addedAt: rawCreatedAt instanceof Date ? rawCreatedAt.toISOString() : String(rawCreatedAt),
    updatedAt: rawUpdatedAt instanceof Date ? rawUpdatedAt.toISOString() : String(rawUpdatedAt),
  };
}

export async function listPantryItems(userId: string): Promise<PantryItem[]> {
  const rows = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .orderBy(asc(pantryItems.expiresAt), desc(pantryItems.addedAt));

  return rows.map(rowToPantryItem);
}

export async function createPantryItem(
  userId: string,
  dto: CreatePantryItemDto
): Promise<PantryItem> {
  let expiresAt = dto.expiresAt;
  if (!expiresAt) {
    const shelfDays =
      typeof dto.shelfLifeDays === 'number' && dto.shelfLifeDays > 0
        ? dto.shelfLifeDays
        : getDefaultShelfLifeDays(dto.category, dto.baseName || dto.name);
    expiresAt = calculateExpiresAtDate(shelfDays);
  }

  // Check if an existing pantry item with matching canonical key already exists
  const existingItems = await listPantryItems(userId);
  const newKeys = new Set(buildMappingKeys(dto.baseName, dto.name));
  const existing = existingItems.find((p) => {
    if (dto.canonicalId && p.canonicalId && dto.canonicalId === p.canonicalId) return true;
    const pKeys = buildMappingKeys(p.baseName, p.name);
    return pKeys.some((k) => newKeys.has(k));
  });

  if (existing) {
    let updatedAmount = dto.amount || 0;
    if (existing.amount > 0 && existing.unit.toLowerCase().trim() === dto.unit.toLowerCase().trim()) {
      updatedAmount = existing.amount + (dto.amount || 0);
    }

    return updatePantryItem(existing.id, userId, {
      name: existing.amount > 0 ? existing.name : dto.name,
      baseName: existing.baseName ?? dto.baseName,
      category: dto.category ?? existing.category,
      amount: updatedAmount,
      unit: existing.amount > 0 ? existing.unit : dto.unit,
      canonicalId: dto.canonicalId ?? existing.canonicalId ?? undefined,
      expiresAt: expiresAt ?? existing.expiresAt,
    });
  }

  const [inserted] = await db
    .insert(pantryItems)
    .values({
      userId,
      name: dto.name,
      baseName: dto.baseName ?? null,
      mappingKey: dto.mappingKey ?? null,
      category: dto.category ?? null,
      amount: String(Math.max(0, dto.amount || 0)),
      unit: dto.unit,
      canonicalId: dto.canonicalId ?? null,
      notes: dto.notes ?? null,
      expiresAt: expiresAt ?? null,
    })
    .returning();

  return rowToPantryItem(inserted);
}

export async function updatePantryItem(
  id: string,
  userId: string,
  dto: UpdatePantryItemDto
): Promise<PantryItem> {
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.baseName !== undefined) updates.baseName = dto.baseName;
  if (dto.mappingKey !== undefined) updates.mappingKey = dto.mappingKey;
  if (dto.category !== undefined) updates.category = dto.category;
  if (dto.amount !== undefined) updates.amount = String(Math.max(0, dto.amount));
  if (dto.unit !== undefined) updates.unit = dto.unit;
  if (dto.canonicalId !== undefined) updates.canonicalId = dto.canonicalId;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.expiresAt !== undefined) updates.expiresAt = dto.expiresAt;

  const [updated] = await db
    .update(pantryItems)
    .set(updates)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error(`Pantry item not found or unauthorized: ${id}`);
  }

  return rowToPantryItem(updated);
}

export async function deletePantryItem(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    .returning({ id: pantryItems.id });

  return deleted.length > 0;
}
