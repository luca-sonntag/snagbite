import {
  type ShoppingListItem,
  type CreateShoppingListItemDto,
  type UpdateShoppingListItemDto,
} from '@cookbook/shared';
import { db } from './drizzle.js';
import { shoppingList } from './schema/pantryAndShopping.js';
import { eq, and, inArray, asc } from 'drizzle-orm';
import {
  rowToShoppingListItem,
  enrichShoppingListItem,
  enrichShoppingListItems,
  autoTransferToPantry,
} from './shoppingListEnricher.js';

export {
  rowToShoppingListItem,
  enrichShoppingListItem,
  enrichShoppingListItems,
};

export async function listShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const rows = await db
    .select()
    .from(shoppingList)
    .where(eq(shoppingList.userId, userId))
    .orderBy(asc(shoppingList.createdAt));

  const rawItems = rows.map(rowToShoppingListItem);
  return enrichShoppingListItems(rawItems);
}

export async function createShoppingListItem(
  userId: string,
  dto: CreateShoppingListItemDto
): Promise<ShoppingListItem> {
  const [inserted] = await db
    .insert(shoppingList)
    .values({
      userId,
      name: dto.name,
      baseName: dto.baseName ?? null,
      parentIngredient: dto.parentIngredient ?? null,
      modifier: dto.modifier ?? null,
      brand: dto.brand ?? null,
      amount: String(Math.max(0, dto.amount || 0)),
      unit: dto.unit,
      recipeId: dto.recipeId ?? null,
      recipeTitle: dto.recipeTitle ?? null,
      checked: dto.checked ?? false,
      category: dto.category ?? null,
      canonicalId: dto.canonicalId ?? null,
      notes: dto.notes ?? null,
      inPantryWarning: dto.inPantryWarning ?? false,
    })
    .returning();

  const rawItem = rowToShoppingListItem(inserted);
  return enrichShoppingListItem(rawItem, dto);
}

export async function batchAddShoppingListItems(
  userId: string,
  items: CreateShoppingListItemDto[]
): Promise<ShoppingListItem[]> {
  if (items.length === 0) return [];

  const values = items.map((dto) => ({
    userId,
    name: dto.name,
    baseName: dto.baseName ?? null,
    parentIngredient: dto.parentIngredient ?? null,
    modifier: dto.modifier ?? null,
    brand: dto.brand ?? null,
    amount: String(Math.max(0, dto.amount || 0)),
    unit: dto.unit,
    recipeId: dto.recipeId ?? null,
    recipeTitle: dto.recipeTitle ?? null,
    checked: dto.checked ?? false,
    category: dto.category ?? null,
    canonicalId: dto.canonicalId ?? null,
    notes: dto.notes ?? null,
    inPantryWarning: dto.inPantryWarning ?? false,
  }));

  const inserted = await db
    .insert(shoppingList)
    .values(values)
    .returning();

  const rawItems = inserted.map(rowToShoppingListItem);
  return enrichShoppingListItems(rawItems, items);
}

export async function updateShoppingListItem(
  id: string,
  userId: string,
  dto: UpdateShoppingListItemDto
): Promise<ShoppingListItem> {
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.baseName !== undefined) updates.baseName = dto.baseName;
  if (dto.amount !== undefined) updates.amount = String(Math.max(0, dto.amount));
  if (dto.unit !== undefined) updates.unit = dto.unit;
  if (dto.checked !== undefined) updates.checked = dto.checked;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.modifier !== undefined) updates.modifier = dto.modifier;
  if (dto.brand !== undefined) updates.brand = dto.brand;
  if (dto.category !== undefined) updates.category = dto.category;
  if (dto.inPantryWarning !== undefined) updates.inPantryWarning = dto.inPantryWarning;

  const [updated] = await db
    .update(shoppingList)
    .set(updates)
    .where(and(eq(shoppingList.id, id), eq(shoppingList.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error(`Shopping list item not found or unauthorized: ${id}`);
  }

  const rawItem = rowToShoppingListItem(updated);
  return enrichShoppingListItem(rawItem);
}

export async function toggleShoppingListItem(
  id: string,
  userId: string,
  checked: boolean,
  autoAddToPantry = true
): Promise<ShoppingListItem> {
  const [current] = await db
    .select()
    .from(shoppingList)
    .where(and(eq(shoppingList.id, id), eq(shoppingList.userId, userId)))
    .limit(1);

  if (!current) throw new Error(`Shopping list item not found: ${id}`);

  const [updated] = await db
    .update(shoppingList)
    .set({
      checked,
      updatedAt: new Date(),
    })
    .where(and(eq(shoppingList.id, id), eq(shoppingList.userId, userId)))
    .returning();

  if (checked && !current.checked && autoAddToPantry) {
    try {
      await autoTransferToPantry(userId, current);
    } catch (pantryErr) {
      console.warn('Failed to auto-transfer shopping item to pantry:', pantryErr);
    }
  }

  const rawItem = rowToShoppingListItem(updated);
  return enrichShoppingListItem(rawItem);
}

export async function batchToggleShoppingListItems(
  userId: string,
  ids: string[],
  checked: boolean,
  autoAddToPantry = true
): Promise<ShoppingListItem[]> {
  if (ids.length === 0) return [];

  const currentRows = await db
    .select()
    .from(shoppingList)
    .where(and(eq(shoppingList.userId, userId), inArray(shoppingList.id, ids)));

  const updatedRows = await db
    .update(shoppingList)
    .set({
      checked,
      updatedAt: new Date(),
    })
    .where(and(eq(shoppingList.userId, userId), inArray(shoppingList.id, ids)))
    .returning();

  if (checked && autoAddToPantry && currentRows.length > 0) {
    for (const row of currentRows) {
      if (!row.checked) {
        await autoTransferToPantry(userId, row).catch((err) =>
          console.warn('Failed auto-transfer on batch toggle:', err)
        );
      }
    }
  }

  const rawItems = updatedRows.map(rowToShoppingListItem);
  return enrichShoppingListItems(rawItems);
}

export async function deleteShoppingListItem(id: string, userId: string): Promise<void> {
  await db
    .delete(shoppingList)
    .where(and(eq(shoppingList.id, id), eq(shoppingList.userId, userId)));
}

export async function deleteShoppingListItems(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .delete(shoppingList)
    .where(and(eq(shoppingList.userId, userId), inArray(shoppingList.id, ids)));
}

export async function clearShoppingList(
  userId: string,
  onlyChecked = false,
  transferToPantry = false
): Promise<void> {
  if (transferToPantry && onlyChecked) {
    const checkedRows = await db
      .select()
      .from(shoppingList)
      .where(and(eq(shoppingList.userId, userId), eq(shoppingList.checked, true)));

    for (const row of checkedRows) {
      await autoTransferToPantry(userId, row).catch((err) =>
        console.warn('Failed to transfer shopping item to pantry on finish:', err)
      );
    }
  }

  const conditions = [eq(shoppingList.userId, userId)];
  if (onlyChecked) {
    conditions.push(eq(shoppingList.checked, true));
  }

  await db
    .delete(shoppingList)
    .where(and(...conditions));
}

export async function removeRecipeFromShoppingList(userId: string, recipeId: string): Promise<void> {
  await db
    .delete(shoppingList)
    .where(and(eq(shoppingList.userId, userId), eq(shoppingList.recipeId, recipeId)));
}
