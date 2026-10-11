import {
  type ShoppingListItem,
  type CreateShoppingListItemDto,
  type ParentIngredientInfo,
  getDefaultShelfLifeDays,
} from '@cookbook/shared';
import { num } from './client.js';
import { db } from './drizzle.js';
import { recipes } from './schema/recipes.js';
import { eq } from 'drizzle-orm';
import { createPantryItem } from './pantryDb.js';
import { buildMappingKeys } from '../matching/baseNameCanonical.js';
import { lookupMapping } from '../matching/mappingStore.js';

export function rowToShoppingListItem(row: any): ShoppingListItem {
  const rawCreatedAt = row.createdAt ?? row.created_at;
  const rawUpdatedAt = row.updatedAt ?? row.updated_at;

  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    name: row.name,
    baseName: (row.baseName ?? row.base_name) ?? undefined,
    parentIngredient: ((row.parentIngredient ?? row.parent_ingredient) as ParentIngredientInfo) ?? undefined,
    modifier: row.modifier ?? undefined,
    brand: row.brand ?? undefined,
    amount: num(row.amount) ?? 0,
    unit: row.unit,
    recipeId: (row.recipeId ?? row.recipe_id) ?? undefined,
    recipeTitle: (row.recipeTitle ?? row.recipe_title) ?? undefined,
    checked: Boolean(row.checked),
    category: row.category ?? undefined,
    canonicalId: (row.canonicalId ?? row.canonical_id) ?? null,
    notes: row.notes ?? undefined,
    inPantryWarning: Boolean(row.inPantryWarning ?? row.in_pantry_warning),
    createdAt: rawCreatedAt instanceof Date ? rawCreatedAt.toISOString() : String(rawCreatedAt),
    updatedAt: rawUpdatedAt instanceof Date ? rawUpdatedAt.toISOString() : String(rawUpdatedAt),
  };
}

export async function enrichShoppingListItem(
  item: ShoppingListItem,
  fallbackDto?: CreateShoppingListItemDto
): Promise<ShoppingListItem> {
  if (fallbackDto?.typicalPackageAmount && Number(fallbackDto.typicalPackageAmount) > 0) {
    item.typicalPackageAmount = Number(fallbackDto.typicalPackageAmount);
    item.typicalPackageUnit = fallbackDto.typicalPackageUnit || undefined;
  }

  if (!item.typicalPackageAmount) {
    const keys = buildMappingKeys(item.baseName, item.name, undefined, item.parentIngredient);
    if (keys.length > 0) {
      try {
        const mapping = await lookupMapping(keys, item.category || '');
        if (mapping?.typicalPackageAmount && Number(mapping.typicalPackageAmount) > 0) {
          item.typicalPackageAmount = Number(mapping.typicalPackageAmount);
          item.typicalPackageUnit = mapping.typicalPackageUnit || undefined;
        }
      } catch {
        // Non-fatal
      }
    }
  }

  return item;
}

export async function enrichShoppingListItems(
  items: ShoppingListItem[],
  fallbackDtos?: CreateShoppingListItemDto[]
): Promise<ShoppingListItem[]> {
  return Promise.all(
    items.map((item, idx) => enrichShoppingListItem(item, fallbackDtos ? fallbackDtos[idx] : undefined))
  );
}

export async function autoTransferToPantry(userId: string, item: any): Promise<void> {
  const parent = (item.parentIngredient ?? item.parent_ingredient) as { name?: string; baseName?: string; unit?: string } | null;
  const pantryName = parent?.name || item.name;
  const pantryBaseName = parent?.baseName || (item.baseName ?? item.base_name);

  let packageAmount = num(item.amount) || 1;
  let packageUnit = parent?.unit || item.unit;
  let shelfLifeDays = getDefaultShelfLifeDays(item.category, pantryBaseName || pantryName);

  // 1. Check canonical ingredient mappings using alias discovery (e.g. Gewürzgurken <-> pickle)
  const keys = buildMappingKeys(pantryBaseName ?? undefined, pantryName, undefined, parent ?? undefined);
  const recipeId = item.recipeId ?? item.recipe_id;

  if (keys.length > 0) {
    const mapping = await lookupMapping(keys, item.category || '');
    if (mapping) {
      if (mapping.typicalPackageAmount && Number(mapping.typicalPackageAmount) > 0) {
        const pkgAmt = Number(mapping.typicalPackageAmount);
        const pkgUnit = mapping.typicalPackageUnit || packageUnit;
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
    } else if (recipeId) {
      // 2. Fallback: check linked recipe ingredients
      try {
        const [recData] = await db
          .select({ ingredients: recipes.ingredients })
          .from(recipes)
          .where(eq(recipes.id, recipeId))
          .limit(1);

        if (recData?.ingredients && Array.isArray(recData.ingredients)) {
          const keySet = new Set(keys);
          for (const ing of recData.ingredients as any[]) {
            if (!ing || !ing.name) continue;
            const ingKeys = buildMappingKeys(ing.baseName, ing.name, ing.synonyms, ing.parentIngredient);
            const isMatch = ingKeys.some((k) => keySet.has(k));
            if (isMatch) {
              if (ing.typicalPackageAmount && Number(ing.typicalPackageAmount) > 0) {
                const pkgAmt = Number(ing.typicalPackageAmount);
                const pkgUnit = ing.typicalPackageUnit || packageUnit;
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
      } catch {
        // Non-fatal fallback
      }
    }
  }

  await createPantryItem(userId, {
    name: pantryName,
    baseName: pantryBaseName ?? undefined,
    category: item.category ?? undefined,
    amount: packageAmount,
    unit: packageUnit,
    canonicalId: (item.canonicalId ?? item.canonical_id) ?? undefined,
    shelfLifeDays,
  });
}
