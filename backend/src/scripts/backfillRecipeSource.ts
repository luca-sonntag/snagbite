import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { rowToRecipe, type RecipeRow } from '../db.js';
import type { ResolverInput } from '../matching/ingredientResolver.js';
import type { Recipe } from '../types.js';

export function getProdClient(): SupabaseClient {
  const prodPath = fs.existsSync(path.resolve('.env.production'))
    ? path.resolve('.env.production')
    : path.resolve('backend', '.env.production');
  const env = dotenv.config({ path: prodPath }).parsed || {};
  const url = env.SUPABASE_URL || process.env.PROD_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || process.env.PROD_SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(`PROD credentials missing in ${prodPath}`);
  }
  return createClient(url, key);
}

export function extractIngredients(recipe: Recipe): ResolverInput[] {
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) return [];
  const inputs: ResolverInput[] = [];
  for (const group of recipe.ingredients) {
    if (!group?.items || !Array.isArray(group.items)) continue;
    for (const ing of group.items) {
      if (!ing || !ing.name) continue;
      inputs.push({
        name: ing.name,
        baseName: ing.baseName,
        brand: ing.brand,
        modifier: ing.modifier,
        category: ing.category || group.name,
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
