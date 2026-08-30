import {
  type PantryItem,
  type CreatePantryItemDto,
  type UpdatePantryItemDto,
  type PantrySuggestion,
  type Recipe,
  getDefaultShelfLifeDays,
} from '@cookbook/shared';
import { getClient, wrapError, isNoRowsError, num } from './client.js';
import type { PantryItemRow } from './types/pantry.js';
import { rowToRecipe } from './recipesDb.js';
import type { RecipeRow } from './client.js';
import { calculatePantryDeduction } from '../matching/pantryDeduction.js';
import { buildMappingKeys } from '../matching/baseNameCanonical.js';

export function rowToPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    baseName: row.base_name ?? undefined,
    mappingKey: row.mapping_key ?? undefined,
    category: row.category ?? undefined,
    amount: num(row.amount) ?? 0,
    unit: row.unit,
    canonicalId: row.canonical_id ?? null,
    notes: row.notes ?? undefined,
    expiresAt: row.expires_at ?? null,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

export async function listPantryItems(userId: string): Promise<PantryItem[]> {
  const { data, error } = await getClient()
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('added_at', { ascending: false });

  if (error) throw wrapError('listPantryItems', error);
  return (data as unknown as PantryItemRow[] || []).map(rowToPantryItem);
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
    const d = new Date();
    d.setDate(d.getDate() + shelfDays);
    expiresAt = d.toISOString().split('T')[0];
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
    // If existing item is empty (amount <= 0), replenish it directly.
    // If existing item has the same unit, add the new amount to stock.
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

  const { data, error } = await getClient()
    .from('pantry_items')
    .insert({
      user_id: userId,
      name: dto.name,
      base_name: dto.baseName ?? null,
      mapping_key: dto.mappingKey ?? null,
      category: dto.category ?? null,
      amount: Math.max(0, dto.amount || 0),
      unit: dto.unit,
      canonical_id: dto.canonicalId ?? null,
      notes: dto.notes ?? null,
      expires_at: expiresAt ?? null,
    })
    .select('*')
    .single();

  if (error) throw wrapError('createPantryItem', error);
  return rowToPantryItem(data as unknown as PantryItemRow);
}

export async function updatePantryItem(
  id: string,
  userId: string,
  dto: UpdatePantryItemDto
): Promise<PantryItem> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.baseName !== undefined) updates.base_name = dto.baseName;
  if (dto.mappingKey !== undefined) updates.mapping_key = dto.mappingKey;
  if (dto.category !== undefined) updates.category = dto.category;
  if (dto.amount !== undefined) updates.amount = Math.max(0, dto.amount);
  if (dto.unit !== undefined) updates.unit = dto.unit;
  if (dto.canonicalId !== undefined) updates.canonical_id = dto.canonicalId;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.expiresAt !== undefined) updates.expires_at = dto.expiresAt;

  const { data, error } = await getClient()
    .from('pantry_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new Error(`Pantry item not found or unauthorized: ${id}`);
    }
    throw wrapError('updatePantryItem', error);
  }

  return rowToPantryItem(data as unknown as PantryItemRow);
}

export async function deletePantryItem(id: string, userId: string): Promise<boolean> {
  const { error } = await getClient()
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw wrapError('deletePantryItem', error);
  return true;
}

/**
 * Deducts ingredients of a cooked recipe from user's pantry.
 * Floors amounts at 0 rather than deleting items.
 */
export async function deductRecipeIngredientsFromPantry(
  recipe: Recipe,
  userId: string
): Promise<{ consumedCount: number }> {
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return { consumedCount: 0 };
  }

  const pantryItems = await listPantryItems(userId);
  if (pantryItems.length === 0) {
    return { consumedCount: 0 };
  }

  let consumedCount = 0;

  for (const group of recipe.ingredients) {
    if (!group.items) continue;
    for (const ing of group.items) {
      const ingKeys = new Set(buildMappingKeys(ing.baseName, ing.name, ing.synonyms, ing.parentIngredient));

      const match = pantryItems.find((p) => {
        if (p.amount <= 0) return false;
        if (ing.canonicalId && p.canonicalId && ing.canonicalId === p.canonicalId) return true;
        const pKeys = buildMappingKeys(p.baseName, p.name);
        return pKeys.some((k) => ingKeys.has(k));
      });

      if (match && match.amount > 0) {
        // Calculate intelligent reduction with multi-unit normalization (piece <-> grams, volume, containers)
        const deduction = calculatePantryDeduction(match, ing);
        const newAmount = Math.max(0, Math.round((match.amount - deduction) * 100) / 100);
        match.amount = newAmount;

        await getClient()
          .from('pantry_items')
          .update({
            amount: newAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.id)
          .eq('user_id', userId);

        consumedCount++;
      }
    }
  }

  return { consumedCount };
}

/**
 * Deduct ingredients consumed by cooking a recipe from user's pantry, floored at 0.
 */
export async function consumePantryForRecipe(
  userId: string,
  recipe: Recipe
): Promise<{ consumedCount: number }> {
  return deductRecipeIngredientsFromPantry(recipe, userId);
}

/**
 * Suggestions based on expiring and available pantry ingredients.
 */
export async function getPantryRecipeSuggestions(
  userId: string,
  limit = 10
): Promise<PantrySuggestion[]> {
  const pantry = await listPantryItems(userId);
  if (pantry.length === 0) return [];

  const now = new Date();
  const fiveDaysOut = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const activePantry = pantry.filter((p) => p.amount > 0);
  const expiringPantry = activePantry.filter((p) => p.expiresAt && p.expiresAt <= fiveDaysOut);

  const pantryNames = new Set(
    activePantry.flatMap((p) => [
      (p.name || '').toLowerCase().trim(),
      (p.baseName || '').toLowerCase().trim(),
    ]).filter(Boolean)
  );

  const expiringNames = new Set(
    expiringPantry.flatMap((p) => [
      (p.name || '').toLowerCase().trim(),
      (p.baseName || '').toLowerCase().trim(),
    ]).filter(Boolean)
  );

  // Query user's own recipes + public recipes
  const { data: userRecipeRows } = await getClient()
    .from('user_recipes')
    .select('recipe_id, recipes (*)')
    .eq('user_id', userId);

  const { data: publicRecipeRows } = await getClient()
    .from('recipes')
    .select('*')
    .eq('visibility', 'public')
    .limit(50);

  const candidates = new Map<string, { recipe: Recipe; isPublic: boolean }>();

  if (userRecipeRows) {
    for (const ur of (userRecipeRows as unknown as Array<{ recipe_id: string; recipes: RecipeRow }>)) {
      if (ur.recipes) {
        candidates.set(ur.recipes.id, { recipe: rowToRecipe(ur.recipes), isPublic: false });
      }
    }
  }

  if (publicRecipeRows) {
    for (const pr of publicRecipeRows as RecipeRow[]) {
      if (!candidates.has(pr.id)) {
        candidates.set(pr.id, { recipe: rowToRecipe(pr), isPublic: true });
      }
    }
  }

  const suggestions: PantrySuggestion[] = [];

  for (const [recipeId, { recipe, isPublic }] of candidates.entries()) {
    const flatIngredients = (recipe.ingredients || []).flatMap((g) => g.items || []);
    if (flatIngredients.length === 0) continue;

    const matching: string[] = [];
    const expiring: string[] = [];

    for (const ing of flatIngredients) {
      const name = (ing.name || '').toLowerCase().trim();
      const base = (ing.baseName || '').toLowerCase().trim();

      const isPantryMatch = pantryNames.has(name) || (base && pantryNames.has(base));
      const isExpiringMatch = expiringNames.has(name) || (base && expiringNames.has(base));

      if (isExpiringMatch) {
        expiring.push(ing.name);
      }
      if (isPantryMatch) {
        matching.push(ing.name);
      }
    }

    if (matching.length === 0) continue;

    // Score calculation: Expiring ingredients get 3x weight
    const matchScore = expiring.length * 3 + matching.length;
    const missingCount = Math.max(0, flatIngredients.length - matching.length);

    suggestions.push({
      recipeId,
      recipe,
      matchScore,
      matchingIngredients: matching,
      expiringIngredients: expiring,
      missingIngredientsCount: missingCount,
      isPublic,
    });
  }

  suggestions.sort((a, b) => b.matchScore - a.matchScore || a.missingIngredientsCount - b.missingIngredientsCount);

  return suggestions.slice(0, limit);
}
