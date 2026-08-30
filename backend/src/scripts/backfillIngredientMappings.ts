/**
 * Backfill script: Populates the `ingredient_mappings` table in the DEV database
 * by resolving ingredients from recipes (either from DEV or PROD database)
 * using the learned mapping store & Gemini resolver.
 *
 * All writes (ingredient mappings) ALWAYS land in the DEV database.
 * When --source=prod (or --prod) is given, recipes are read read-only from PROD.
 *
 * Usage:
 *   npm run mappings:backfill
 *   npm run mappings:backfill -- --prod --limit=50
 *   npm run mappings:backfill -- --source=prod --all
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getClient, rowToRecipe, type RecipeRow } from '../db.js';
import { resolveAndRemember } from '../matching/ingredientMatcher.js';
import { mapWithConcurrency, type ResolverInput } from '../matching/ingredientResolver.js';
import { flushHitCounts } from '../matching/mappingStore.js';
import type { Recipe, Ingredient } from '../types.js';

interface CliOptions {
  source: 'dev' | 'prod';
  limit: number;
  offset: number;
  all: boolean;
  concurrency: number;
  verbose: boolean;
  clear: boolean;
}

interface ItemToResolve {
  recipeId?: string;
  recipeTitle: string;
  input: ResolverInput;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { source: 'dev', limit: 50, offset: 0, all: false, concurrency: 3, verbose: false, clear: false };

  for (const arg of args) {
    if (arg === '--all') options.all = true;
    else if (arg === '--clear' || arg === '--reset') options.clear = true;
    else if (arg === '--prod' || arg === '--source=prod') options.source = 'prod';
    else if (arg === '--dev' || arg === '--source=dev') options.source = 'dev';
    else if (arg.startsWith('--limit=')) options.limit = Math.max(1, parseInt(arg.split('=')[1], 10) || 50);
    else if (arg.startsWith('--offset=')) options.offset = Math.max(0, parseInt(arg.split('=')[1], 10) || 0);
    else if (arg.startsWith('--concurrency=')) options.concurrency = Math.max(1, parseInt(arg.split('=')[1], 10) || 3);
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
  }
  return options;
}

function getProdClient(): SupabaseClient {
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

function extractIngredients(recipe: Recipe): ResolverInput[] {
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

async function fetchRecipesBatch(
  source: 'dev' | 'prod',
  client: SupabaseClient,
  offset: number,
  limit: number
): Promise<Recipe[]> {
  if (source === 'prod') {
    // PROD schema: jobs table holds recipe in JSONB column 'recipe'
    const { data, error } = await client
      .from('jobs')
      .select('id, recipe, created_at')
      .eq('status', 'completed')
      .not('recipe', 'is', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch PROD jobs at offset ${offset}: ${error.message}`);
    return (data || [])
      .filter(r => r.recipe && typeof r.recipe === 'object' && Array.isArray(r.recipe.ingredients))
      .map(r => ({
        id: r.id,
        title: r.recipe.title || 'Untitled',
        ingredients: r.recipe.ingredients || [],
        instructions: r.recipe.instructions || [],
        servings: r.recipe.servings ?? 1,
      } as Recipe));
  }

  // DEV schema: recipes table
  const { data, error } = await client
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch DEV recipes at offset ${offset}: ${error.message}`);
  return (data || []).map(row => rowToRecipe(row as RecipeRow));
}

async function main(): Promise<void> {
  const options = parseCliArgs();
  const readClient = options.source === 'prod' ? getProdClient() : getClient();

  console.log('='.repeat(60));
  console.log(`Ingredient Mappings Backfill [Read from: ${options.source.toUpperCase()} | Write to: DEV]`);
  console.log(`Limit: ${options.all ? 'ALL' : options.limit} | Offset: ${options.offset} | Concurrency: ${options.concurrency}`);
  if (options.clear) console.log('Mode: CLEAR & REBUILD from scratch');
  console.log('='.repeat(60) + '\n');

  if (options.clear) {
    console.log('🗑️  Clearing all existing mappings in DEV database...');
    const { error: delError } = await getClient().from('ingredient_mappings').delete().neq('mapping_key', '__dummy__');
    if (delError) {
      console.error('❌ Failed to clear mappings:', delError.message);
    } else {
      console.log('✅ Mapping table cleared.\n');
    }
  }

  const PAGE_SIZE = 100;
  let currentOffset = options.offset;
  let remainingLimit = options.all ? Number.MAX_SAFE_INTEGER : options.limit;

  let totalRecipesScanned = 0;
  let totalIngredients = 0;
  let cacheHits = 0;
  let resolverCalls = 0;
  let matchedOffCount = 0;
  let noMatchEstimatedCount = 0;
  let totalCostUsd = 0;
  let totalTokens = 0;

  while (remainingLimit > 0) {
    const fetchCount = Math.min(PAGE_SIZE, remainingLimit);
    const recipes = await fetchRecipesBatch(options.source, readClient, currentOffset, fetchCount);

    if (recipes.length === 0) {
      console.log('No more recipes found.');
      break;
    }

    console.log(`Fetched batch of ${recipes.length} recipe(s) from ${options.source.toUpperCase()} (Offset: ${currentOffset})...`);

    for (const recipe of recipes) {
      totalRecipesScanned++;
      const ingredientInputs = extractIngredients(recipe);
      if (ingredientInputs.length === 0) {
        if (options.verbose) console.log(`[${totalRecipesScanned}] Recipe "${recipe.title}" (${recipe.id}): 0 ingredients, skipping.`);
        continue;
      }

      console.log(`\n[${totalRecipesScanned}] Processing "${recipe.title}" (${recipe.id}) - ${ingredientInputs.length} ingredient(s)...`);
      const items: ItemToResolve[] = ingredientInputs.map(input => ({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        input,
      }));

      totalIngredients += items.length;
      const results = await mapWithConcurrency(items, options.concurrency, async item => {
        const res = await resolveAndRemember(item.input);
        return { item, res };
      });

      for (const { item, res } of results) {
        const nameDisplay = item.input.baseName || item.input.name;
        if (res.usage) {
          resolverCalls++;
          totalTokens += res.usage.tokenUsage?.totalTokens ?? 0;
          totalCostUsd += res.usage.costEstimate?.totalCostUsd ?? 0;
          const target = res.match ? `OFF ${res.match.product_code || res.match.id} (${res.match.name_de})` : 'NO_MATCH (Estimated)';
          console.log(`  🤖 [Gemini Resolver] "${nameDisplay}" -> ${target}`);
        } else {
          cacheHits++;
          const target = res.match ? `OFF ${res.match.product_code || res.match.id}` : 'Store cached';
          if (options.verbose) console.log(`  ⚡ [Store Hit] "${nameDisplay}" -> ${target}`);
        }

        if (res.match) matchedOffCount++;
        else if (res.estimate) noMatchEstimatedCount++;
      }

      await flushHitCounts();
    }

    currentOffset += recipes.length;
    if (!options.all) remainingLimit -= recipes.length;
    if (recipes.length < fetchCount) break;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Backfill Summary (${options.source.toUpperCase()} -> DEV):`);
  console.log(`  Recipes scanned:     ${totalRecipesScanned}`);
  console.log(`  Total ingredients:   ${totalIngredients}`);
  console.log(`  Store / Cache hits:  ${cacheHits}`);
  console.log(`  Gemini tool calls:   ${resolverCalls}`);
  console.log(`  OFF matches:         ${matchedOffCount}`);
  console.log(`  Estimates (no match):${noMatchEstimatedCount}`);
  console.log(`  Total tokens used:   ${totalTokens}`);
  console.log(`  Estimated LLM cost:  $${totalCostUsd.toFixed(4)}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('\n❌ Backfill failed:', err?.message || err);
  process.exit(1);
});
