import {
  type ShoppingListItem,
  type CreateShoppingListItemDto,
  type UpdateShoppingListItemDto,
  type ParentIngredientInfo,
  getDefaultShelfLifeDays,
} from '@cookbook/shared';
import { getClient, wrapError, isNoRowsError, num } from './client.js';
import type { ShoppingListRow } from './types/shoppingList.js';
import { createPantryItem } from './pantryDb.js';
import { buildMappingKeys } from '../matching/baseNameCanonical.js';
import { lookupMapping } from '../matching/mappingStore.js';

export function rowToShoppingListItem(row: ShoppingListRow): ShoppingListItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    baseName: row.base_name ?? undefined,
    parentIngredient: (row.parent_ingredient as ParentIngredientInfo) ?? undefined,
    modifier: row.modifier ?? undefined,
    brand: row.brand ?? undefined,
    amount: num(row.amount) ?? 0,
    unit: row.unit,
    recipeId: row.recipe_id ?? undefined,
    recipeTitle: row.recipe_title ?? undefined,
    checked: row.checked,
    category: row.category ?? undefined,
    canonicalId: row.canonical_id ?? null,
    notes: row.notes ?? undefined,
    inPantryWarning: row.in_pantry_warning ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const { data, error } = await getClient()
    .from('shopping_list')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw wrapError('listShoppingList', error);
  return (data as unknown as ShoppingListRow[] || []).map(rowToShoppingListItem);
}

export async function createShoppingListItem(
  userId: string,
  dto: CreateShoppingListItemDto
): Promise<ShoppingListItem> {
  const { data, error } = await getClient()
    .from('shopping_list')
    .insert({
      user_id: userId,
      name: dto.name,
      base_name: dto.baseName ?? null,
      parent_ingredient: dto.parentIngredient ?? null,
      modifier: dto.modifier ?? null,
      brand: dto.brand ?? null,
      amount: Math.max(0, dto.amount || 0),
      unit: dto.unit,
      recipe_id: dto.recipeId ?? null,
      recipe_title: dto.recipeTitle ?? null,
      checked: dto.checked ?? false,
      category: dto.category ?? null,
      canonical_id: dto.canonicalId ?? null,
      notes: dto.notes ?? null,
      in_pantry_warning: dto.inPantryWarning ?? false,
    })
    .select('*')
    .single();

  if (error) throw wrapError('createShoppingListItem', error);
  return rowToShoppingListItem(data as unknown as ShoppingListRow);
}

export async function batchAddShoppingListItems(
  userId: string,
  items: CreateShoppingListItemDto[]
): Promise<ShoppingListItem[]> {
  if (items.length === 0) return [];

  const rows = items.map((dto) => ({
    user_id: userId,
    name: dto.name,
    base_name: dto.baseName ?? null,
    parent_ingredient: dto.parentIngredient ?? null,
    modifier: dto.modifier ?? null,
    brand: dto.brand ?? null,
    amount: Math.max(0, dto.amount || 0),
    unit: dto.unit,
    recipe_id: dto.recipeId ?? null,
    recipe_title: dto.recipeTitle ?? null,
    checked: dto.checked ?? false,
    category: dto.category ?? null,
    canonical_id: dto.canonicalId ?? null,
    notes: dto.notes ?? null,
    in_pantry_warning: dto.inPantryWarning ?? false,
  }));

  const { data, error } = await getClient()
    .from('shopping_list')
    .insert(rows)
    .select('*');

  if (error) throw wrapError('batchAddShoppingListItems', error);
  return (data as unknown as ShoppingListRow[] || []).map(rowToShoppingListItem);
}

export async function updateShoppingListItem(
  id: string,
  userId: string,
  dto: UpdateShoppingListItemDto
): Promise<ShoppingListItem> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.baseName !== undefined) updates.base_name = dto.baseName;
  if (dto.amount !== undefined) updates.amount = Math.max(0, dto.amount);
  if (dto.unit !== undefined) updates.unit = dto.unit;
  if (dto.checked !== undefined) updates.checked = dto.checked;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.modifier !== undefined) updates.modifier = dto.modifier;
  if (dto.brand !== undefined) updates.brand = dto.brand;
  if (dto.category !== undefined) updates.category = dto.category;
  if (dto.inPantryWarning !== undefined) updates.in_pantry_warning = dto.inPantryWarning;

  const { data, error } = await getClient()
    .from('shopping_list')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new Error(`Shopping list item not found or unauthorized: ${id}`);
    }
    throw wrapError('updateShoppingListItem', error);
  }

  return rowToShoppingListItem(data as unknown as ShoppingListRow);
}

/**
 * Toggle checked status and optionally auto-transfer checked item into user's pantry.
 */
export async function toggleShoppingListItem(
  id: string,
  userId: string,
  checked: boolean,
  autoAddToPantry = true
): Promise<ShoppingListItem> {
  const { data: existingRow, error: fetchErr } = await getClient()
    .from('shopping_list')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchErr) throw wrapError('toggleShoppingListItem.fetch', fetchErr);
  const current = existingRow as unknown as ShoppingListRow;

  const { data, error } = await getClient()
    .from('shopping_list')
    .update({
      checked,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw wrapError('toggleShoppingListItem.update', error);

  // Auto-transfer to pantry when checked
  if (checked && !current.checked && autoAddToPantry) {
    try {
      await autoTransferToPantry(userId, current);
    } catch (pantryErr) {
      console.warn('Failed to auto-transfer shopping item to pantry:', pantryErr);
    }
  }

  return rowToShoppingListItem(data as unknown as ShoppingListRow);
}

export async function batchToggleShoppingListItems(
  userId: string,
  ids: string[],
  checked: boolean,
  autoAddToPantry = true
): Promise<ShoppingListItem[]> {
  if (ids.length === 0) return [];

  const { data: currentRows } = await getClient()
    .from('shopping_list')
    .select('*')
    .eq('user_id', userId)
    .in('id', ids);

  const { data, error } = await getClient()
    .from('shopping_list')
    .update({
      checked,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .in('id', ids)
    .select('*');

  if (error) throw wrapError('batchToggleShoppingListItems', error);

  if (checked && autoAddToPantry && currentRows) {
    for (const row of currentRows as unknown as ShoppingListRow[]) {
      if (!row.checked) {
        await autoTransferToPantry(userId, row).catch((err) =>
          console.warn('Failed auto-transfer on batch toggle:', err)
        );
      }
    }
  }

  return (data as unknown as ShoppingListRow[] || []).map(rowToShoppingListItem);
}

export async function deleteShoppingListItem(id: string, userId: string): Promise<void> {
  const { error } = await getClient()
    .from('shopping_list')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw wrapError('deleteShoppingListItem', error);
}

export async function deleteShoppingListItems(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getClient()
    .from('shopping_list')
    .delete()
    .eq('user_id', userId)
    .in('id', ids);

  if (error) throw wrapError('deleteShoppingListItems', error);
}

export async function clearShoppingList(userId: string, onlyChecked = false): Promise<void> {
  let query = getClient().from('shopping_list').delete().eq('user_id', userId);
  if (onlyChecked) {
    query = query.eq('checked', true);
  }
  const { error } = await query;
  if (error) throw wrapError('clearShoppingList', error);
}

export async function removeRecipeFromShoppingList(userId: string, recipeId: string): Promise<void> {
  const { error } = await getClient()
    .from('shopping_list')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId);

  if (error) throw wrapError('removeRecipeFromShoppingList', error);
}

async function autoTransferToPantry(userId: string, item: ShoppingListRow): Promise<void> {
  let packageAmount = num(item.amount) || 1;
  let packageUnit = item.unit;
  let shelfLifeDays = getDefaultShelfLifeDays(item.category, item.base_name || item.name);

  // 1. Check canonical ingredient mappings using alias discovery (e.g. Gewürzgurken <-> pickle)
  const keys = buildMappingKeys(item.base_name ?? undefined, item.name);
  if (keys.length > 0) {
    const mapping = await lookupMapping(keys, item.category || '');
    if (mapping) {
      if (mapping.typicalPackageAmount && Number(mapping.typicalPackageAmount) > 0) {
        const pkgAmt = Number(mapping.typicalPackageAmount);
        const pkgUnit = mapping.typicalPackageUnit || item.unit;
        if (pkgUnit.toLowerCase() === item.unit.toLowerCase()) {
          packageAmount = Math.max(packageAmount, pkgAmt);
        } else {
          packageAmount = pkgAmt;
        }
        packageUnit = pkgUnit;
      }
      if (mapping.shelfLifeDays) {
        shelfLifeDays = mapping.shelfLifeDays;
      }
    } else if (item.recipe_id) {
      // 2. Fallback: check linked recipe ingredients
      try {
        const { data: recData } = await getClient()
          .from('recipes')
          .select('ingredients')
          .eq('id', item.recipe_id)
          .limit(1)
          .maybeSingle();

        if (recData?.ingredients && Array.isArray(recData.ingredients)) {
          const keySet = new Set(keys);
          for (const group of recData.ingredients as any[]) {
            if (!group?.items || !Array.isArray(group.items)) continue;
            for (const ing of group.items) {
              const ingKeys = buildMappingKeys(ing.baseName, ing.name);
              const isMatch = ingKeys.some((k) => keySet.has(k));
              if (isMatch) {
                if (ing.typicalPackageAmount && Number(ing.typicalPackageAmount) > 0) {
                  const pkgAmt = Number(ing.typicalPackageAmount);
                  const pkgUnit = ing.typicalPackageUnit || item.unit;
                  if (pkgUnit.toLowerCase() === item.unit.toLowerCase()) {
                    packageAmount = Math.max(packageAmount, pkgAmt);
                  } else {
                    packageAmount = pkgAmt;
                  }
                  packageUnit = pkgUnit;
                }
                if (ing.shelfLifeDays) {
                  shelfLifeDays = ing.shelfLifeDays;
                }
                break;
              }
            }
          }
        }
      } catch {
        // Non-fatal fallback
      }
    }
  }

  await createPantryItem(userId, {
    name: item.name,
    baseName: item.base_name ?? undefined,
    category: item.category ?? undefined,
    amount: packageAmount,
    unit: packageUnit,
    canonicalId: item.canonical_id ?? undefined,
    shelfLifeDays,
  });
}
