/**
 * Backfill script: Populates the `ingredient_mappings` table in the DEV database
 * by resolving ingredients from recipes (either from DEV or PROD database),
 * or directly from an AI-generated list of ingredients via Gemini.
 *
 * All writes (ingredient mappings) ALWAYS land in the DEV database.
 * When --source=prod (or --prod) is given, recipes are read read-only from PROD.
 * When --ai is given, ingredients are synthesized by Gemini or parsed from --ingredients.
 *
 * Usage:
 *   npm run mappings:backfill
 *   npm run mappings:backfill -- --prod --limit=50
 *   npm run mappings:backfill -- --ai --count=50
 *   npm run mappings:backfill -- --ai --category=DAIRY --count=30
 *   npm run mappings:backfill -- --ai-prompt="Top 50 Italian cheeses, herbs and meats"
 *   npm run mappings:backfill -- --ingredients="Hüttenkäse, Leinsamen, Mandelmilch, Backpulver"
 */

import { getClient } from '../db.js';
import { resolveAndRemember } from '../matching/ingredientMatcher.js';
import { mapWithConcurrency, type ResolverInput } from '../matching/ingredientResolver.js';
import { flushHitCounts } from '../matching/mappingStore.js';
import {
  generateIngredientsWithAi,
  parseManualIngredientList,
} from '../matching/aiIngredientGenerator.js';
import {
  getProdClient,
  extractIngredients,
  fetchRecipesBatch,
} from './backfillRecipeSource.js';

interface CliOptions {
  source: 'dev' | 'prod' | 'ai';
  limit: number;
  offset: number;
  all: boolean;
  concurrency: number;
  verbose: boolean;
  clear: boolean;
  aiPrompt?: string;
  aiCategory?: string;
  aiCount?: number;
  ingredientsList?: string;
}

interface BackfillMetrics {
  totalRecipesScanned: number;
  totalIngredients: number;
  cacheHits: number;
  resolverCalls: number;
  matchedOffCount: number;
  noMatchEstimatedCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    source: 'dev',
    limit: 50,
    offset: 0,
    all: false,
    concurrency: 3,
    verbose: false,
    clear: false,
  };

  for (const arg of args) {
    if (arg === '--all') options.all = true;
    else if (arg === '--clear' || arg === '--reset') options.clear = true;
    else if (arg === '--prod' || arg === '--source=prod') options.source = 'prod';
    else if (arg === '--dev' || arg === '--source=dev') options.source = 'dev';
    else if (arg === '--ai' || arg === '--source=ai') options.source = 'ai';
    else if (arg.startsWith('--ai-prompt=')) {
      options.aiPrompt = arg.split('=').slice(1).join('=');
      options.source = 'ai';
    } else if (arg.startsWith('--ai-category=') || arg.startsWith('--category=')) {
      options.aiCategory = arg.split('=').slice(1).join('=');
      options.source = 'ai';
    } else if (arg.startsWith('--ai-count=') || arg.startsWith('--count=')) {
      options.aiCount = Math.max(1, parseInt(arg.split('=')[1], 10) || 50);
    } else if (arg.startsWith('--ingredients=')) {
      options.ingredientsList = arg.split('=').slice(1).join('=');
      options.source = 'ai';
    } else if (arg.startsWith('--limit=')) options.limit = Math.max(1, parseInt(arg.split('=')[1], 10) || 50);
    else if (arg.startsWith('--offset=')) options.offset = Math.max(0, parseInt(arg.split('=')[1], 10) || 0);
    else if (arg.startsWith('--concurrency=')) options.concurrency = Math.max(1, parseInt(arg.split('=')[1], 10) || 3);
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
  }
  return options;
}

function printSummary(source: string, metrics: BackfillMetrics): void {
  console.log('\n' + '='.repeat(60));
  console.log(`Backfill Summary (${source} -> DEV):`);
  if (metrics.totalRecipesScanned > 0) {
    console.log(`  Recipes scanned:     ${metrics.totalRecipesScanned}`);
  }
  console.log(`  Total ingredients:   ${metrics.totalIngredients}`);
  console.log(`  Store / Cache hits:  ${metrics.cacheHits}`);
  console.log(`  Gemini tool calls:   ${metrics.resolverCalls}`);
  console.log(`  OFF matches:         ${metrics.matchedOffCount}`);
  console.log(`  Estimates (no match):${metrics.noMatchEstimatedCount}`);
  console.log(`  Total tokens used:   ${metrics.totalTokens}`);
  console.log(`  Estimated LLM cost:  $${metrics.totalCostUsd.toFixed(4)}`);
  console.log('='.repeat(60));
}

async function resolveInputs(
  inputs: ResolverInput[],
  concurrency: number,
  verbose: boolean,
  metrics: BackfillMetrics
): Promise<void> {
  metrics.totalIngredients += inputs.length;
  const results = await mapWithConcurrency(inputs, concurrency, async (input) => {
    const res = await resolveAndRemember(input);
    return { input, res };
  });

  for (const { input, res } of results) {
    const nameDisplay = input.baseName || input.name;
    if (res.usage) {
      metrics.resolverCalls++;
      metrics.totalTokens += res.usage.tokenUsage?.totalTokens ?? 0;
      metrics.totalCostUsd += res.usage.costEstimate?.totalCostUsd ?? 0;
      const target = res.match ? `OFF ${res.match.product_code || res.match.id} (${res.match.name_de})` : 'NO_MATCH (Estimated)';
      console.log(`  🤖 [Gemini Resolver] "${nameDisplay}" -> ${target}`);
    } else {
      metrics.cacheHits++;
      const target = res.match ? `OFF ${res.match.product_code || res.match.id}` : 'Store cached';
      if (verbose) console.log(`  ⚡ [Store Hit] "${nameDisplay}" -> ${target}`);
    }

    if (res.match) metrics.matchedOffCount++;
    else if (res.estimate) metrics.noMatchEstimatedCount++;
  }

  await flushHitCounts();
}

async function runAiOrManualBackfill(options: CliOptions, metrics: BackfillMetrics): Promise<void> {
  let rawInputs: ResolverInput[] = [];

  if (options.ingredientsList) {
    rawInputs = parseManualIngredientList(options.ingredientsList);
    console.log(`📝 Parsed ${rawInputs.length} manually specified ingredient(s)...\n`);
  } else {
    const count = options.aiCount ?? (options.all ? 100 : options.limit);
    console.log(`🤖 Requesting ${count} ingredients from Gemini AI...`);
    if (options.aiCategory) console.log(`🎯 Category filter: ${options.aiCategory}`);
    if (options.aiPrompt) console.log(`💡 Custom prompt:   ${options.aiPrompt}`);
    console.log('');

    rawInputs = await generateIngredientsWithAi({
      prompt: options.aiPrompt,
      category: options.aiCategory,
      count,
    });
    console.log(`✨ Generated ${rawInputs.length} ingredient(s) via Gemini AI.\n`);
  }

  await resolveInputs(rawInputs, options.concurrency, options.verbose, metrics);
  printSummary(options.ingredientsList ? 'MANUAL-LIST' : 'AI-GENERATED', metrics);
}

async function runRecipeBackfill(options: CliOptions, metrics: BackfillMetrics): Promise<void> {
  const source = options.source === 'prod' ? 'prod' : 'dev';
  const readClient = source === 'prod' ? getProdClient() : getClient();
  const PAGE_SIZE = 100;
  let currentOffset = options.offset;
  let remainingLimit = options.all ? Number.MAX_SAFE_INTEGER : options.limit;

  while (remainingLimit > 0) {
    const fetchCount = Math.min(PAGE_SIZE, remainingLimit);
    const recipes = await fetchRecipesBatch(source, readClient, currentOffset, fetchCount);

    if (recipes.length === 0) {
      console.log('No more recipes found.');
      break;
    }

    console.log(`Fetched batch of ${recipes.length} recipe(s) from ${options.source.toUpperCase()} (Offset: ${currentOffset})...`);

    for (const recipe of recipes) {
      metrics.totalRecipesScanned++;
      const ingredientInputs = extractIngredients(recipe);
      if (ingredientInputs.length === 0) {
        if (options.verbose) console.log(`[${metrics.totalRecipesScanned}] Recipe "${recipe.title}" (${recipe.id}): 0 ingredients, skipping.`);
        continue;
      }

      console.log(`\n[${metrics.totalRecipesScanned}] Processing "${recipe.title}" (${recipe.id}) - ${ingredientInputs.length} ingredient(s)...`);
      await resolveInputs(ingredientInputs, options.concurrency, options.verbose, metrics);
    }

    currentOffset += recipes.length;
    if (!options.all) remainingLimit -= recipes.length;
    if (recipes.length < fetchCount) break;
  }

  printSummary(options.source.toUpperCase(), metrics);
}

async function main(): Promise<void> {
  const options = parseCliArgs();
  const metrics: BackfillMetrics = {
    totalRecipesScanned: 0,
    totalIngredients: 0,
    cacheHits: 0,
    resolverCalls: 0,
    matchedOffCount: 0,
    noMatchEstimatedCount: 0,
    totalTokens: 0,
    totalCostUsd: 0,
  };

  console.log('='.repeat(60));
  console.log(`Ingredient Mappings Backfill [Source: ${options.source.toUpperCase()} | Write to: DEV]`);
  if (options.source !== 'ai') {
    console.log(`Limit: ${options.all ? 'ALL' : options.limit} | Offset: ${options.offset} | Concurrency: ${options.concurrency}`);
  } else {
    console.log(`Concurrency: ${options.concurrency} | Mode: AI / Synthetic list`);
  }
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

  if (options.source === 'ai') {
    await runAiOrManualBackfill(options, metrics);
  } else {
    await runRecipeBackfill(options, metrics);
  }
}

main().catch((err) => {
  console.error('\n❌ Backfill failed:', err?.message || err);
  process.exit(1);
});
