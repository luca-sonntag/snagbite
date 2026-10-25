import { db } from './drizzle.js';
import { recipes, userRecipes, user as userTable } from './schema/index.js';
import { gte, desc, eq, inArray, and } from 'drizzle-orm';
import type {
  RecentExtractedRecipeItem,
  RecipeIngredientSummary,
  SourcePlatformKey,
} from './adminAnalyticsTypes.js';
import { classifyPlatform } from './adminAnalyticsHelpers.js';

interface RawIngredient {
  name?: string;
  amount?: string | number | null;
  unit?: string | null;
}

interface RawInstruction {
  description?: string;
  text?: string;
  instruction?: string;
}

interface RawNutrition {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

function parseIngredients(raw: unknown): RecipeIngredientSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).map((item: RawIngredient | string) => {
    if (typeof item === 'string') {
      return { name: item.trim() };
    }
    return {
      name: (item.name || '').trim(),
      amount: item.amount ?? null,
      unit: item.unit ? String(item.unit).trim() : null,
    };
  }).filter((i) => i.name.length > 0);
}

function parseInstructions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).map((item: RawInstruction | string) => {
    if (typeof item === 'string') return item.trim();
    return (item.description || item.text || item.instruction || '').trim();
  }).filter((text) => text.length > 0);
}

function parseNutrition(raw: unknown): {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
} {
  if (!raw || typeof raw !== 'object') {
    return { calories: null, proteinG: null, carbsG: null, fatG: null };
  }
  const n = raw as RawNutrition;
  const numOrNull = (v: unknown): number | null => {
    if (typeof v === 'number' && !Number.isNaN(v)) return Math.round(v);
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      if (!Number.isNaN(parsed)) return Math.round(parsed);
    }
    return null;
  };
  return {
    calories: numOrNull(n.calories),
    proteinG: numOrNull(n.protein),
    carbsG: numOrNull(n.carbs),
    fatG: numOrNull(n.fat),
  };
}

export async function getRecentExtractedRecipes(
  since: Date | null = null,
  limit = 50,
): Promise<RecentExtractedRecipeItem[]> {
  const conditions = [
    eq(recipes.isRecipe, true),
    eq(recipes.isDemo, false),
  ];
  if (since) {
    conditions.push(gte(recipes.createdAt, since));
  }

  const recipeRows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      emoji: recipes.emoji,
      imageUrl: recipes.imageUrl,
      sourceUrl: recipes.sourceUrl,
      sourceHandle: recipes.sourceHandle,
      origin: recipes.origin,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      servings: recipes.servings,
      nutritionalValues: recipes.nutritionalValues,
      ingredients: recipes.ingredients,
      instructions: recipes.instructions,
      createdAt: recipes.createdAt,
      createdBy: recipes.createdBy,
    })
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.createdAt))
    .limit(limit);

  if (recipeRows.length === 0) return [];

  const recipeIds = recipeRows.map((r) => r.id);
  const userIds = Array.from(
    new Set(recipeRows.map((r) => r.createdBy).filter((id): id is string => Boolean(id))),
  );

  const [savedRows, usersList] = await Promise.all([
    db
      .select({ recipeId: userRecipes.recipeId })
      .from(userRecipes)
      .where(inArray(userRecipes.recipeId, recipeIds)),
    userIds.length > 0
      ? db
          .select({
            id: userTable.id,
            email: userTable.email,
            name: userTable.name,
            tier: userTable.tier,
          })
          .from(userTable)
          .where(inArray(userTable.id, userIds))
      : Promise.resolve([]),
  ]);

  const savedCountMap = new Map<string, number>();
  for (const s of savedRows) {
    savedCountMap.set(s.recipeId, (savedCountMap.get(s.recipeId) || 0) + 1);
  }

  const userMap = new Map<
    string,
    { id: string; email: string | null; name: string | null; tier: string }
  >();
  for (const u of usersList) {
    userMap.set(u.id, {
      id: u.id,
      email: u.email ?? null,
      name: u.name ?? null,
      tier: u.tier || 'free',
    });
  }

  return recipeRows.map((row) => {
    const platform = classifyPlatform(row.origin, row.sourceUrl);
    const originKey = (row.origin || 'url') as SourcePlatformKey;
    const nutrition = parseNutrition(row.nutritionalValues);
    const ingredients = parseIngredients(row.ingredients);
    const instructions = parseInstructions(row.instructions);
    const user = row.createdBy ? userMap.get(row.createdBy) ?? null : null;

    return {
      id: row.id,
      title: row.title,
      emoji: row.emoji ?? null,
      imageUrl: row.imageUrl ?? null,
      sourceUrl: row.sourceUrl ?? null,
      sourceHandle: row.sourceHandle ?? null,
      origin: originKey,
      platform,
      prepTime: row.prepTime ?? null,
      cookTime: row.cookTime ?? null,
      servings: row.servings !== null && row.servings !== undefined ? Number(row.servings) : null,
      calories: nutrition.calories,
      proteinG: nutrition.proteinG,
      carbsG: nutrition.carbsG,
      fatG: nutrition.fatG,
      ingredientsCount: ingredients.length,
      instructionsCount: instructions.length,
      ingredients,
      instructions,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      user,
      savedCount: savedCountMap.get(row.id) ?? 1,
    };
  });
}
