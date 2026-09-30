/**
 * Backfill script: Generates AI food photography cover images for public recipes with FLUX.1 [schnell] via fal.ai
 * and stores them in the public Supabase Storage bucket ('recipe-covers').
 *
 * Usage:
 *   npx tsx src/scripts/backfillPublicRecipeCovers.ts --prod
 *   npx tsx src/scripts/backfillPublicRecipeCovers.ts --prod --dry-run
 *   npx tsx src/scripts/backfillPublicRecipeCovers.ts --prod --limit 5
 *   npx tsx src/scripts/backfillPublicRecipeCovers.ts --prod --force
 *   npx tsx src/scripts/backfillPublicRecipeCovers.ts --prod --id <recipeId>
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { getClient, setClient } from '../db.js';
import { generateRecipeCoverImage, ensureCoverBucketExists } from '../imageGenerator.js';
import { generateFoodPhotographyPrompt } from '../prompts/foodPhotographyPrompt.js';
import type { RecipeRow } from '../db/types/core.js';

// CLI flags
const isProd = process.argv.includes('--prod');
const isDev = process.argv.includes('--dev');
const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const isForce = process.argv.includes('--force');

const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

const idIdx = process.argv.indexOf('--id');
const singleId = idIdx !== -1 ? process.argv[idIdx + 1] : null;

const delayIdx = process.argv.indexOf('--delay');
const delayMs = delayIdx !== -1 ? parseInt(process.argv[delayIdx + 1], 10) : 1000;

// Setup target environment
const backendDir = path.resolve(import.meta.dirname, '..', '..');

if (isProd) {
  const prodEnvFile = path.resolve(backendDir, '.env.production');
  if (fs.existsSync(prodEnvFile)) {
    const prodEnv = dotenv.parse(fs.readFileSync(prodEnvFile, 'utf8'));
    if (prodEnv.SUPABASE_URL && prodEnv.SUPABASE_SECRET_KEY) {
      setClient(createClient(prodEnv.SUPABASE_URL, prodEnv.SUPABASE_SECRET_KEY));
    }
  }
} else if (isDev) {
  const devEnvFile = path.resolve(backendDir, '.env');
  if (fs.existsSync(devEnvFile)) {
    const devEnv = dotenv.parse(fs.readFileSync(devEnvFile, 'utf8'));
    if (devEnv.SUPABASE_URL && devEnv.SUPABASE_SECRET_KEY) {
      setClient(createClient(devEnv.SUPABASE_URL, devEnv.SUPABASE_SECRET_KEY));
    }
  }
}

// Ensure FAL_KEY is present
if (!config.FAL_KEY) {
  const baseEnvFile = path.resolve(backendDir, '.env');
  if (fs.existsSync(baseEnvFile)) {
    const baseEnv = dotenv.parse(fs.readFileSync(baseEnvFile, 'utf8'));
    if (baseEnv.FAL_KEY) config.FAL_KEY = baseEnv.FAL_KEY;
  }
}

// Force cover generation flag in config
config.GENERATE_RECIPE_COVERS = true;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const client = getClient();
  const host = (client as unknown as { supabaseUrl?: string })?.supabaseUrl
    ? new URL((client as unknown as { supabaseUrl: string }).supabaseUrl).host
    : 'unknown';

  console.log('============================================================');
  console.log('🖼️  Backfill AI Recipe Covers for Public Recipes');
  console.log(`Database Host:    ${host} ${isProd ? '(PRODUCTION)' : ''}`);
  console.log(`Dry Run:          ${isDryRun ? 'YES (no images will be generated)' : 'NO'}`);
  console.log(`Force Overwrite:  ${isForce ? 'YES' : 'NO'}`);
  console.log(`Limit:            ${limit ?? 'all'}`);
  console.log(`Single ID:        ${singleId ?? 'none'}`);
  console.log(`FAL_KEY present:  ${Boolean(config.FAL_KEY)}`);
  console.log('============================================================\n');

  if (!isDryRun) {
    if (!config.FAL_KEY) {
      throw new Error('❌ FAL_KEY is not configured! Please provide FAL_KEY in backend/.env.');
    }
    await ensureCoverBucketExists();
  }

  // 1. Fetch public recipes
  let query = client
    .from('recipes')
    .select('id, title, description, category, ingredients, instructions, image_url, image_urls, image_prompt, is_ai_cover, created_by, visibility')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  if (singleId) {
    query = query.eq('id', singleId);
  }

  const { data: recipes, error } = await query.returns<RecipeRow[]>();
  if (error || !recipes) {
    throw new Error(`Failed to fetch public recipes: ${error?.message}`);
  }

  console.log(`📋 Found ${recipes.length} total public recipes in database.`);

  const toProcess: RecipeRow[] = [];
  let alreadyAiCount = 0;

  for (const r of recipes) {
    if (r.is_ai_cover && !isForce) {
      alreadyAiCount++;
    } else {
      toProcess.push(r);
    }
  }

  console.log(`   - Already have AI cover: ${alreadyAiCount}`);
  console.log(`   - Need AI cover:         ${toProcess.length}`);

  const candidates = limit ? toProcess.slice(0, limit) : toProcess;
  if (candidates.length === 0) {
    console.log('\n✨ No recipes need cover generation. All up to date!');
    return;
  }

  console.log(`\n🚀 Starting batch processing of ${candidates.length} recipes...\n`);

  let succeeded = 0;
  let failed = 0;
  const failedList: Array<{ id: string; title: string; error: string }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const r = candidates[i];
    const indexStr = `[${i + 1}/${candidates.length}]`;
    console.log(`${indexStr} Processing: "${r.title}" (id: ${r.id})...`);

    const recipeStart = Date.now();
    try {
      // 1. Get or generate prompt
      let prompt = r.image_prompt?.trim();
      if (!prompt) {
        console.log(`   🤖 Generating food photography prompt with Gemini...`);
        prompt = await generateFoodPhotographyPrompt({
          title: r.title,
          description: r.description,
          category: r.category,
          ingredients: r.ingredients,
          instructions: r.instructions,
        });
        console.log(`   ✓ Prompt generated: "${prompt.slice(0, 80)}..."`);

        if (!isDryRun) {
          await client.from('recipes').update({ image_prompt: prompt }).eq('id', r.id);
        }
      } else {
        console.log(`   ℹ️ Using existing prompt: "${prompt.slice(0, 80)}..."`);
      }

      if (isDryRun) {
        console.log(`   🔍 [DRY RUN] Would generate FLUX cover for: "${prompt}"\n`);
        succeeded++;
        continue;
      }

      // 2. Generate cover image via fal.ai & upload to Supabase storage
      console.log(`   🎨 Generating FLUX.1 [schnell] cover & uploading to storage...`);
      const result = await generateRecipeCoverImage({
        prompt,
        jobId: r.id,
        userId: r.created_by,
      });

      if (!result.imageUrl) {
        throw new Error('generateRecipeCoverImage returned null image URL');
      }

      // 3. Update database record
      const cleanedUrls = Array.isArray(r.image_urls)
        ? r.image_urls.filter((u: string) => typeof u === 'string' && u.length > 0 && !u.startsWith('local:'))
        : [];
      const updatedImageUrls = [result.imageUrl, ...cleanedUrls.filter((u) => u !== result.imageUrl)];

      const { error: updateErr } = await client
        .from('recipes')
        .update({
          image_url: result.imageUrl,
          image_urls: updatedImageUrls,
          image_prompt: prompt,
          is_ai_cover: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id);

      if (updateErr) {
        throw new Error(`Failed to update recipe in DB: ${updateErr.message}`);
      }

      const elapsed = ((Date.now() - recipeStart) / 1000).toFixed(1);
      console.log(`   ✅ Succeeded in ${elapsed}s: ${result.imageUrl}\n`);
      succeeded++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Failed: ${msg}\n`);
      failed++;
      failedList.push({ id: r.id, title: r.title, error: msg });
    }

    if (i < candidates.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log('============================================================');
  console.log('📊 BACKFILL COMPLETE SUMMARY');
  console.log(`Total candidates:    ${candidates.length}`);
  console.log(`Succeeded:           ${succeeded}`);
  console.log(`Failed:              ${failed}`);
  if (!isDryRun) {
    const costUsd = (succeeded * 0.0035).toFixed(4);
    console.log(`Estimated FLUX cost: ~$${costUsd}`);
  }
  if (failedList.length > 0) {
    console.log('\nFailed recipes:');
    for (const f of failedList) {
      console.log(` - [${f.id}] "${f.title}": ${f.error}`);
    }
  }
  console.log('============================================================');
}

main().catch((err) => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
