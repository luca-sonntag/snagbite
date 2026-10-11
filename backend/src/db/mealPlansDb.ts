import type {
  MealPlanEntry,
  MealType,
  CreateMealPlanDto,
  UpdateMealPlanDto,
  Ingredient,
  NutritionalValues,
} from '@cookbook/shared';
import { num } from './client.js';
import { db } from './drizzle.js';
import { mealPlans } from './schema/mealPlans.js';
import { recipes } from './schema/recipes.js';
import { cookEvents } from './schema/gamification.js';
import { eq, and, gte, lte, asc, inArray } from 'drizzle-orm';

export function rowToMealPlanEntry(row: any): MealPlanEntry {
  const mp = row.mealPlan ?? row;
  const rec = row.recipe ?? row.recipes;
  const rawNv = rec?.nutritionalValues ?? rec?.nutritional_values;
  const nv = (rawNv as NutritionalValues | undefined) ?? null;

  const rawCreatedAt = mp.createdAt ?? mp.created_at;
  const rawUpdatedAt = mp.updatedAt ?? mp.updated_at;

  return {
    id: mp.id,
    userId: mp.userId ?? mp.user_id,
    recipeId: mp.recipeId ?? mp.recipe_id,
    planDate: mp.planDate ?? mp.plan_date,
    mealType: (mp.mealType ?? mp.meal_type) as MealType,
    servings: num(mp.servings) ?? 2,
    isCooked: Boolean(mp.isCooked ?? mp.is_cooked),
    notes: mp.notes ?? null,
    createdAt: rawCreatedAt instanceof Date ? rawCreatedAt.toISOString() : String(rawCreatedAt),
    updatedAt: rawUpdatedAt instanceof Date ? rawUpdatedAt.toISOString() : String(rawUpdatedAt),
    recipe: rec
      ? {
          id: rec.id,
          title: rec.title,
          imageUrl: rec.imageUrl ?? rec.image_url,
          emoji: rec.emoji,
          healthScore: num(rec.healthScore ?? rec.health_score),
          prepTime: rec.prepTime ?? rec.prep_time,
          cookTime: rec.cookTime ?? rec.cook_time,
          servings: num(rec.servings) ?? 2,
          calories: num(nv?.calories),
          protein: num(nv?.protein),
          carbs: num(nv?.carbs),
          fat: num(nv?.fat),
          ingredients: (rec.ingredients as Ingredient[]) ?? [],
        }
      : undefined,
  };
}

export async function listMealPlans(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<MealPlanEntry[]> {
  const conditions = [eq(mealPlans.userId, userId)];
  if (startDate) {
    conditions.push(gte(mealPlans.planDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(mealPlans.planDate, endDate));
  }

  const rows = await db
    .select({
      mealPlan: mealPlans,
      recipe: recipes,
    })
    .from(mealPlans)
    .leftJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .where(and(...conditions))
    .orderBy(asc(mealPlans.planDate), asc(mealPlans.createdAt));

  if (rows.length === 0) return [];

  // Cross-reference with cook_events to catch any cooks on matching plan dates
  try {
    const cookConditions = [eq(cookEvents.userId, userId)];
    if (startDate) {
      const bufferStart = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000);
      cookConditions.push(gte(cookEvents.cookedAt, bufferStart));
    }
    if (endDate) {
      const bufferEnd = new Date(new Date(endDate).getTime() + 48 * 60 * 60 * 1000);
      cookConditions.push(lte(cookEvents.cookedAt, bufferEnd));
    }

    const matchedCookEvents = await db
      .select({
        recipeId: cookEvents.recipeId,
        cookedAt: cookEvents.cookedAt,
      })
      .from(cookEvents)
      .where(and(...cookConditions));

    if (matchedCookEvents.length > 0) {
      const pendingIdsToUpdate: string[] = [];

      for (const row of rows) {
        if (!row.mealPlan.isCooked) {
          const hasMatchingCook = matchedCookEvents.some((ce) => {
            if (ce.recipeId !== row.mealPlan.recipeId) return false;
            const cookDateIso = (ce.cookedAt instanceof Date ? ce.cookedAt.toISOString() : String(ce.cookedAt)).split('T')[0];
            if (cookDateIso === row.mealPlan.planDate) return true;
            const diffDays = Math.abs(
              (new Date(cookDateIso).getTime() - new Date(row.mealPlan.planDate).getTime()) / (1000 * 60 * 60 * 24),
            );
            return diffDays <= 1;
          });

          if (hasMatchingCook) {
            row.mealPlan.isCooked = true;
            pendingIdsToUpdate.push(row.mealPlan.id);
          }
        }
      }

      if (pendingIdsToUpdate.length > 0) {
        void (async () => {
          try {
            await db
              .update(mealPlans)
              .set({ isCooked: true, updatedAt: new Date() })
              .where(inArray(mealPlans.id, pendingIdsToUpdate));
          } catch (err: unknown) {
            console.warn('Failed to background-persist meal plan cooked status:', err);
          }
        })();
      }
    }
  } catch (err) {
    console.warn('Failed to cross-reference meal plans with cook_events:', err);
  }

  return rows.map(rowToMealPlanEntry);
}

export async function createMealPlan(
  userId: string,
  dto: CreateMealPlanDto,
): Promise<MealPlanEntry> {
  let initialIsCooked = false;
  try {
    const bufferStart = new Date(new Date(dto.planDate).getTime() - 24 * 60 * 60 * 1000);
    const bufferEnd = new Date(new Date(dto.planDate).getTime() + 48 * 60 * 60 * 1000);
    const [existingCook] = await db
      .select({ id: cookEvents.id })
      .from(cookEvents)
      .where(and(
        eq(cookEvents.userId, userId),
        eq(cookEvents.recipeId, dto.recipeId),
        gte(cookEvents.cookedAt, bufferStart),
        lte(cookEvents.cookedAt, bufferEnd)
      ))
      .limit(1);

    if (existingCook) {
      initialIsCooked = true;
    }
  } catch (err) {
    console.warn('Failed to check existing cook_events on createMealPlan:', err);
  }

  const [inserted] = await db
    .insert(mealPlans)
    .values({
      userId,
      recipeId: dto.recipeId,
      planDate: dto.planDate,
      mealType: dto.mealType,
      servings: String(dto.servings ?? 2),
      isCooked: initialIsCooked,
      notes: dto.notes ?? null,
    })
    .returning();

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, dto.recipeId))
    .limit(1);

  return rowToMealPlanEntry({ mealPlan: inserted, recipe: recipe ?? null });
}

export async function updateMealPlan(
  id: string,
  userId: string,
  dto: UpdateMealPlanDto,
): Promise<MealPlanEntry> {
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (dto.planDate !== undefined) updates.planDate = dto.planDate;
  if (dto.mealType !== undefined) updates.mealType = dto.mealType;
  if (dto.servings !== undefined) updates.servings = String(dto.servings);
  if (dto.isCooked !== undefined) updates.isCooked = dto.isCooked;
  if (dto.notes !== undefined) updates.notes = dto.notes;

  const [updated] = await db
    .update(mealPlans)
    .set(updates)
    .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error(`Meal plan entry not found or unauthorized: ${id}`);
  }

  const [recipe] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, updated.recipeId))
    .limit(1);

  return rowToMealPlanEntry({ mealPlan: updated, recipe: recipe ?? null });
}

export async function deleteMealPlan(id: string, userId: string): Promise<void> {
  await db
    .delete(mealPlans)
    .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
}

export async function markMealPlansCookedForRecipe(
  userId: string,
  recipeId: string,
  dateStr?: string,
): Promise<number> {
  const now = new Date();
  const utcToday = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const candidateDates = dateStr ? [dateStr] : [yesterday, utcToday, tomorrow];

  const rows = await db
    .update(mealPlans)
    .set({
      isCooked: true,
      updatedAt: new Date(),
    })
    .where(and(
      eq(mealPlans.userId, userId),
      eq(mealPlans.recipeId, recipeId),
      inArray(mealPlans.planDate, candidateDates),
      eq(mealPlans.isCooked, false)
    ))
    .returning({ id: mealPlans.id });

  return rows.length;
}
