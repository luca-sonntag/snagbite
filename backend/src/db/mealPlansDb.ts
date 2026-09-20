import type {
  MealPlanEntry,
  MealType,
  CreateMealPlanDto,
  UpdateMealPlanDto,
  IngredientGroup,
  NutritionalValues,
} from '@cookbook/shared';
import { getClient, wrapError, isNoRowsError, num } from './client.js';
import type { MealPlanRow } from './types/mealPlans.js';

const MEAL_PLAN_SELECT_FIELDS = `
  id,
  user_id,
  recipe_id,
  plan_date,
  meal_type,
  servings,
  is_cooked,
  notes,
  created_at,
  updated_at,
  recipes (
    id,
    title,
    image_url,
    emoji,
    health_score,
    prep_time,
    cook_time,
    servings,
    nutritional_values,
    ingredients
  )
`;

export function rowToMealPlanEntry(row: MealPlanRow): MealPlanEntry {
  const recipeData = row.recipes;
  const nv = (recipeData?.nutritional_values as NutritionalValues | undefined) ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    recipeId: row.recipe_id,
    planDate: row.plan_date,
    mealType: row.meal_type as MealType,
    servings: num(row.servings) ?? 2,
    isCooked: row.is_cooked,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recipe: recipeData
      ? {
          id: recipeData.id,
          title: recipeData.title,
          imageUrl: recipeData.image_url,
          emoji: recipeData.emoji,
          healthScore: num(recipeData.health_score),
          prepTime: recipeData.prep_time,
          cookTime: recipeData.cook_time,
          servings: num(recipeData.servings) ?? 2,
          calories: num(nv?.calories),
          protein: num(nv?.protein),
          carbs: num(nv?.carbs),
          fat: num(nv?.fat),
          ingredients: (recipeData.ingredients as IngredientGroup[]) ?? [],
        }
      : undefined,
  };
}

export async function listMealPlans(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<MealPlanEntry[]> {
  let query = getClient()
    .from('meal_plans')
    .select(MEAL_PLAN_SELECT_FIELDS)
    .eq('user_id', userId)
    .order('plan_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (startDate) {
    query = query.gte('plan_date', startDate);
  }
  if (endDate) {
    query = query.lte('plan_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw wrapError('listMealPlans', error);

  const rows = (data as unknown as MealPlanRow[]) || [];
  if (rows.length === 0) return [];

  // Cross-reference with cook_events to catch any cooks on matching plan dates
  try {
    let cookQuery = getClient()
      .from('cook_events')
      .select('recipe_id, cooked_at')
      .eq('user_id', userId);

    if (startDate) {
      const bufferStart = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000).toISOString();
      cookQuery = cookQuery.gte('cooked_at', bufferStart);
    }
    if (endDate) {
      const bufferEnd = new Date(new Date(endDate).getTime() + 48 * 60 * 60 * 1000).toISOString();
      cookQuery = cookQuery.lte('cooked_at', bufferEnd);
    }

    const { data: cookEvents } = await cookQuery;

    if (cookEvents && cookEvents.length > 0) {
      const pendingIdsToUpdate: string[] = [];

      for (const row of rows) {
        if (!row.is_cooked) {
          const hasMatchingCook = cookEvents.some((ce: { recipe_id: string; cooked_at: string }) => {
            if (ce.recipe_id !== row.recipe_id) return false;
            const cookDateIso = ce.cooked_at.split('T')[0];
            if (cookDateIso === row.plan_date) return true;
            const diffDays = Math.abs(
              (new Date(cookDateIso).getTime() - new Date(row.plan_date).getTime()) / (1000 * 60 * 60 * 24),
            );
            return diffDays <= 1;
          });

          if (hasMatchingCook) {
            row.is_cooked = true;
            pendingIdsToUpdate.push(row.id);
          }
        }
      }

      if (pendingIdsToUpdate.length > 0) {
        void (async () => {
          try {
            await getClient()
              .from('meal_plans')
              .update({ is_cooked: true, updated_at: new Date().toISOString() })
              .in('id', pendingIdsToUpdate);
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
    const bufferStart = new Date(new Date(dto.planDate).getTime() - 24 * 60 * 60 * 1000).toISOString();
    const bufferEnd = new Date(new Date(dto.planDate).getTime() + 48 * 60 * 60 * 1000).toISOString();
    const { data: existingCook } = await getClient()
      .from('cook_events')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', dto.recipeId)
      .gte('cooked_at', bufferStart)
      .lte('cooked_at', bufferEnd)
      .limit(1);

    if (existingCook && existingCook.length > 0) {
      initialIsCooked = true;
    }
  } catch (err) {
    console.warn('Failed to check existing cook_events on createMealPlan:', err);
  }

  const { data, error } = await getClient()
    .from('meal_plans')
    .insert({
      user_id: userId,
      recipe_id: dto.recipeId,
      plan_date: dto.planDate,
      meal_type: dto.mealType,
      servings: dto.servings ?? 2,
      is_cooked: initialIsCooked,
      notes: dto.notes ?? null,
    })
    .select(MEAL_PLAN_SELECT_FIELDS)
    .single();

  if (error) throw wrapError('createMealPlan', error);
  return rowToMealPlanEntry(data as unknown as MealPlanRow);
}

export async function updateMealPlan(
  id: string,
  userId: string,
  dto: UpdateMealPlanDto,
): Promise<MealPlanEntry> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.planDate !== undefined) updates.plan_date = dto.planDate;
  if (dto.mealType !== undefined) updates.meal_type = dto.mealType;
  if (dto.servings !== undefined) updates.servings = dto.servings;
  if (dto.isCooked !== undefined) updates.is_cooked = dto.isCooked;
  if (dto.notes !== undefined) updates.notes = dto.notes;

  const { data, error } = await getClient()
    .from('meal_plans')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select(MEAL_PLAN_SELECT_FIELDS)
    .single();

  if (error) {
    if (isNoRowsError(error)) {
      throw new Error(`Meal plan entry not found or unauthorized: ${id}`);
    }
    throw wrapError('updateMealPlan', error);
  }

  return rowToMealPlanEntry(data as unknown as MealPlanRow);
}

export async function deleteMealPlan(id: string, userId: string): Promise<void> {
  const { error } = await getClient()
    .from('meal_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw wrapError('deleteMealPlan', error);
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

  const { data, error } = await getClient()
    .from('meal_plans')
    .update({
      is_cooked: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .in('plan_date', candidateDates)
    .eq('is_cooked', false)
    .select('id');

  if (error) throw wrapError('markMealPlansCookedForRecipe', error);
  return (data as Array<{ id: string }> | null)?.length ?? 0;
}


