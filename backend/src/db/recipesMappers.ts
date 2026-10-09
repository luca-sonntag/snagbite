import type {
  Recipe,
  SavedRecipe,
  UserRecipeSource,
} from '../types.js';
import { formatAuthorHandle } from '@cookbook/shared';
import { num } from './client.js';
import { recipes } from './schema/recipes.js';
import { computeRecipeHealthScore, isVegetableOrFruitCategory } from '../matching/healthScoreCalculator.js';

export function normalizeRawIngredients(raw: unknown): Recipe['ingredients'] {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 0 && raw[0] && typeof raw[0] === 'object' && Array.isArray((raw[0] as any).items)) {
    return (raw as Array<{ name?: string; items?: any[] }>).flatMap((group) => {
      const section =
        group.name && !/^(ingredients|zutaten|hauptzutaten|default|allgemein)$/i.test(group.name.trim())
          ? group.name.trim()
          : undefined;
      return (group.items || []).map((item) => (section ? { ...item, section } : item));
    });
  }
  return raw as Recipe['ingredients'];
}

export function rowToRecipe(row: any): Recipe {
  const rawNv = row.nutritionalValues ?? row.nutritional_values;
  const nutritionalValues =
    rawNv && typeof rawNv === 'object'
      ? (rawNv as Recipe['nutritionalValues'])
      : undefined;

  const rawCreatedAt = row.createdAt ?? row.created_at;
  const rawUpdatedAt = row.updatedAt ?? row.updated_at;

  const recipe: Recipe = {
    id: row.id,
    createdBy: row.createdBy ?? row.created_by,
    visibility: (row.visibility ?? 'private') as Recipe['visibility'],
    origin: (row.origin ?? 'url') as Recipe['origin'],
    sourceUrl: row.sourceUrl ?? row.source_url,
    sourceHandle: formatAuthorHandle(row.sourceHandle ?? row.source_handle),
    parentRecipeId: row.parentRecipeId ?? row.parent_recipe_id,
    remixPrompt: row.remixPrompt ?? row.remix_prompt,
    title: row.title,
    description: row.description ?? '',
    emoji: row.emoji,
    category: ((row.category ?? null) as Recipe['category']) ?? null,
    isRecipe: row.isRecipe ?? row.is_recipe ?? true,
    prepTime: row.prepTime ?? row.prep_time,
    cookTime: row.cookTime ?? row.cook_time,
    servings: num(row.servings) ?? 1,
    tags: row.tags ?? [],
    equipment: row.equipment ?? [],
    tips: row.tips ?? [],
    imageUrl: row.imageUrl ?? row.image_url,
    imageUrls: row.imageUrls ?? row.image_urls ?? [],
    imagePrompt: row.imagePrompt ?? row.image_prompt,
    isAiCover: row.isAiCover ?? row.is_ai_cover ?? false,
    transcript: row.transcript,
    ingredients: normalizeRawIngredients(row.ingredients),
    instructions: (row.instructions as Recipe['instructions']) ?? [],
    alternativeIngredients:
      ((row.alternativeIngredients ?? row.alternative_ingredients) as Recipe['alternativeIngredients']) ?? undefined,
    ...(nutritionalValues ? { nutritionalValues } : {}),
    sourceNutritionalValues:
      ((row.sourceNutritionalValues ?? row.source_nutritional_values) as Recipe['sourceNutritionalValues']) ?? null,
    healthScore: num(row.healthScore ?? row.health_score) ?? null,
    healthScoreBreakdown:
      ((row.healthScoreBreakdown ?? row.health_score_breakdown) as Recipe['healthScoreBreakdown']) ?? null,
    hasExplicitNutritionalValues: row.hasExplicitNutritionalValues ?? row.has_explicit_nutritional_values ?? false,
    hasIncompleteSourceInfo: Boolean(row.hasIncompleteSourceInfo ?? row.has_incomplete_source_info),
    isDemo: Boolean(row.isDemo ?? row.is_demo),
    nutritionCoverage: num(row.nutritionCoverage ?? row.nutrition_coverage) ?? undefined,
    createdAt: rawCreatedAt instanceof Date ? rawCreatedAt.toISOString() : (rawCreatedAt ?? new Date().toISOString()),
    updatedAt: rawUpdatedAt instanceof Date ? rawUpdatedAt.toISOString() : (rawUpdatedAt ?? new Date().toISOString()),
  };

  // Auto-heal / dynamic sync: recompute if healthScore is missing or if breakdown has 0g veg despite having produce items
  if (
    recipe.ingredients?.length &&
    (!recipe.healthScore ||
      !recipe.healthScoreBreakdown ||
      (recipe.healthScoreBreakdown.metrics?.vegetableGramsPerServing === 0 &&
        recipe.ingredients.some((i) =>
          isVegetableOrFruitCategory(i.category)
        )))
  ) {
    const computed = computeRecipeHealthScore(recipe);
    recipe.healthScore = computed.score;
    recipe.healthScoreBreakdown = computed.breakdown;
    if (recipe.nutritionalValues) {
      recipe.nutritionalValues.vegetableGrams = computed.breakdown.metrics.vegetableGramsPerServing ?? null;
      recipe.nutritionalValues.plantCount = computed.breakdown.metrics.plantIngredientsCount ?? null;
    }
  }

  return recipe;
}

export function recipeToRow(recipe: Recipe): Record<string, unknown> {
  const n = recipe.nutritionalValues;
  return {
    visibility: recipe.visibility ?? 'private',
    source_url: recipe.sourceUrl ?? null,
    source_handle: formatAuthorHandle(recipe.sourceHandle) ?? null,
    parent_recipe_id: recipe.parentRecipeId ?? null,
    remix_prompt: recipe.remixPrompt ?? null,
    title: recipe.title,
    description: recipe.description ?? null,
    emoji: recipe.emoji ?? null,
    category: recipe.category ?? null,
    is_recipe: recipe.isRecipe ?? true,
    prep_time: recipe.prepTime ?? null,
    cook_time: recipe.cookTime ?? null,
    servings: recipe.servings ?? null,
    tags: recipe.tags ?? [],
    equipment: recipe.equipment ?? [],
    tips: recipe.tips ?? [],
    image_url: recipe.imageUrl ?? null,
    image_urls: recipe.imageUrls ?? [],
    image_prompt: recipe.imagePrompt ?? null,
    is_ai_cover: recipe.isAiCover ?? false,
    transcript: recipe.transcript ?? null,
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    alternative_ingredients: recipe.alternativeIngredients ?? null,
    nutritional_values: n ?? null,
    source_nutritional_values: recipe.sourceNutritionalValues ?? null,
    health_score: recipe.healthScore ?? null,
    health_score_breakdown: recipe.healthScoreBreakdown ?? null,
    has_explicit_nutritional_values: recipe.hasExplicitNutritionalValues ?? false,
    has_incomplete_source_info: recipe.hasIncompleteSourceInfo ?? false,
    is_demo: recipe.isDemo ?? false,
    nutrition_coverage: recipe.nutritionCoverage ?? null,
  };
}

export function recipeToDrizzle(recipe: Recipe): typeof recipes.$inferInsert {
  const n = recipe.nutritionalValues;
  return {
    visibility: recipe.visibility ?? 'private',
    sourceUrl: recipe.sourceUrl ?? null,
    sourceHandle: formatAuthorHandle(recipe.sourceHandle) ?? null,
    parentRecipeId: recipe.parentRecipeId ?? null,
    remixPrompt: recipe.remixPrompt ?? null,
    title: recipe.title,
    description: recipe.description ?? null,
    emoji: recipe.emoji ?? null,
    category: recipe.category ?? null,
    isRecipe: recipe.isRecipe ?? true,
    prepTime: recipe.prepTime ?? null,
    cookTime: recipe.cookTime ?? null,
    servings: recipe.servings !== undefined ? String(recipe.servings) : null,
    tags: recipe.tags ?? [],
    equipment: recipe.equipment ?? [],
    tips: recipe.tips ?? [],
    imageUrl: recipe.imageUrl ?? null,
    imageUrls: recipe.imageUrls ?? [],
    imagePrompt: recipe.imagePrompt ?? null,
    isAiCover: recipe.isAiCover ?? false,
    transcript: recipe.transcript ?? null,
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    alternativeIngredients: recipe.alternativeIngredients ?? null,
    nutritionalValues: n ?? null,
    sourceNutritionalValues: recipe.sourceNutritionalValues ?? null,
    healthScore: recipe.healthScore !== null && recipe.healthScore !== undefined ? String(recipe.healthScore) : null,
    healthScoreBreakdown: recipe.healthScoreBreakdown ?? null,
    hasExplicitNutritionalValues: recipe.hasExplicitNutritionalValues ?? false,
    hasIncompleteSourceInfo: recipe.hasIncompleteSourceInfo ?? false,
    isDemo: recipe.isDemo ?? false,
    nutritionCoverage: recipe.nutritionCoverage !== undefined && recipe.nutritionCoverage !== null ? String(recipe.nutritionCoverage) : null,
  };
}

export function rowToSavedRecipe(row: any): SavedRecipe {
  const rawRecipe = row.recipe ?? row.recipes;
  return {
    recipeId: row.recipeId ?? row.recipe_id,
    recipe: rowToRecipe(rawRecipe),
    source: (row.source ?? 'extraction') as UserRecipeSource,
    isFavorite: Boolean(row.isFavorite ?? row.is_favorite),
    flags: row.flags ?? [],
    collectionIds: [],
    addedAt: row.addedAt instanceof Date ? row.addedAt.toISOString() : (row.added_at ?? row.addedAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at ?? row.updatedAt),
  };
}
