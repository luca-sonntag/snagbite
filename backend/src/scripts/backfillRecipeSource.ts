import { type SupabaseClient } from '@supabase/supabase-js';
import { rowToRecipe, type RecipeRow } from '../db.js';
import type { ResolverInput } from '../matching/ingredientResolver.js';
import type { Recipe } from '../types.js';
import { initScriptEnv } from './scriptEnv.js';

export function getProdClient(): SupabaseClient {
  return initScriptEnv({ target: 'prod', autoSetDbClient: false }).client;
}

export function extractIngredients(recipe: Recipe): ResolverInput[] {
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) return [];
  const inputs: ResolverInput[] = [];
  for (const ing of recipe.ingredients) {
    if (!ing || !ing.name) continue;
    inputs.push({
      name: ing.name,
      baseName: ing.baseName,
      brand: ing.brand,
      modifier: ing.modifier,
      category: ing.category,
      synonyms: ing.synonyms,
      isGenericGrocery: ing.isGenericGrocery,
      parentIngredient: ing.parentIngredient,
      typicalPackageAmount: ing.typicalPackageAmount,
      typicalPackageUnit: ing.typicalPackageUnit,
      shelfLifeDays: ing.shelfLifeDays,
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
      amount: ing.amount,
      unit: ing.unit,
      gramsPerUnit: ing.gramsPerUnit,
    });
  }
  return inputs;
}

export async function fetchRecipesBatch(
  source: 'dev' | 'prod',
  client: SupabaseClient,
  offset: number,
  limit: number
): Promise<Recipe[]> {
  if (source === 'prod') {
    const { data, error } = await client
      .from('jobs')
      .select('id, recipe, created_at')
      .eq('status', 'completed')
      .not('recipe', 'is', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch PROD jobs at offset ${offset}: ${error.message}`);
    return (data || [])
      .filter((r) => r.recipe && typeof r.recipe === 'object' && Array.isArray(r.recipe.ingredients))
      .map(
        (r) =>
          ({
            id: r.id,
            title: r.recipe.title || 'Untitled',
            ingredients: r.recipe.ingredients || [],
            instructions: r.recipe.instructions || [],
            servings: r.recipe.servings ?? 1,
          } as Recipe)
      );
  }

  const { data, error } = await client
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch DEV recipes at offset ${offset}: ${error.message}`);
  return (data || []).map((row) => rowToRecipe(row as RecipeRow));
}
