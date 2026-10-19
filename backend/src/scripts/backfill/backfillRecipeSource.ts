import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { asc } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';
import * as schema from '../../db/schema/index.js';
import { recipes } from '../../db/schema/recipes.js';
import { rowToRecipe } from '../../db.js';
import type { ResolverInput } from '../../matching/ingredientResolver.js';
import type { Recipe } from '../../types.js';
import { loadEnvFile } from '../scriptEnv.js';

let prodDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getProdDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (prodDb) return prodDb;
  const prodEnv = loadEnvFile('.env.production');
  const connectionString = prodEnv.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in .env.production or environment');
  }
  const pool = new pg.Pool({ connectionString, max: 5 });
  prodDb = drizzle(pool, { schema });
  return prodDb;
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
  offset: number,
  limit: number
): Promise<Recipe[]> {
  const targetDb = source === 'prod' ? getProdDb() : db;
  const rows = await targetDb
    .select()
    .from(recipes)
    .orderBy(asc(recipes.createdAt))
    .limit(limit)
    .offset(offset);

  return (rows || []).map((row) => rowToRecipe(row as any));
}
