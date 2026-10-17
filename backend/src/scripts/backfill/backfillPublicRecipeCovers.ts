/**
 * Backfill script: Generates AI food photography cover images for public recipes with FLUX.1 [schnell] via fal.ai
 * and stores them in the Tigris S3 Storage bucket ('recipe-covers').
 *
 * Usage:
 *   npx tsx src/scripts/backfill/backfillPublicRecipeCovers.ts --prod
 *   npx tsx src/scripts/backfill/backfillPublicRecipeCovers.ts --prod --dry-run
 *   npx tsx src/scripts/backfill/backfillPublicRecipeCovers.ts --prod --limit 5
 *   npx tsx src/scripts/backfill/backfillPublicRecipeCovers.ts --prod --force
 *   npx tsx src/scripts/backfill/backfillPublicRecipeCovers.ts --prod --id <recipeId>
 */
import { config } from '../../config.js';
import { db } from '../../db/drizzle.js';
import { recipes } from '../../db/schema/recipes.js';
import { eq, and, desc } from 'drizzle-orm';
import { generateRecipeCoverImage, ensureCoverBucketExists } from '../../imageGenerator.js';
import { generateFoodPhotographyPrompt } from '../../prompts/foodPhotographyPrompt.js';
import { initScriptEnv, loadEnvFile } from '../scriptEnv.js';

// Setup target environment
const scriptEnv = initScriptEnv();
const isProd = scriptEnv.isProd;
const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const isForce = process.argv.includes('--force');

const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

const idIdx = process.argv.indexOf('--id');
const singleId = idIdx !== -1 ? process.argv[idIdx + 1] : null;

const delayIdx = process.argv.indexOf('--delay');
const delayMs = delayIdx !== -1 ? parseInt(process.argv[delayIdx + 1], 10) : 1000;

// Ensure FAL_KEY is present
if (!config.FAL_KEY) {
  const baseEnv = loadEnvFile('.env');
  if (baseEnv.FAL_KEY) config.FAL_KEY = baseEnv.FAL_KEY;
}

// Force cover generation flag in config
config.GENERATE_RECIPE_COVERS = true;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  console.log('============================================================');
  console.log('🖼️  Backfill AI Recipe Covers for Public Recipes');
  console.log(`Database Target:  ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
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

  // 1. Fetch public recipes via Drizzle
  const conditions = [eq(recipes.visibility, 'public')];
  if (singleId) {
    conditions.push(eq(recipes.id, singleId));
  }

  const recipeList = await db
    .select()
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.createdAt));

  console.log(`📋 Found ${recipeList.length} total public recipes in database.`);

  const toProcess: typeof recipeList = [];
  let alreadyAiCount = 0;

  for (const r of recipeList) {
    if (r.isAiCover && !isForce) {
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
      let prompt = r.imagePrompt?.trim();
      if (!prompt) {
        console.log(`   🤖 Generating food photography prompt with Gemini...`);
        prompt = await generateFoodPhotographyPrompt({
          title: r.title,
          description: r.description ?? undefined,
          category: r.category ?? undefined,
          ingredients: r.ingredients as any,
          instructions: r.instructions as any,
        });
        console.log(`   ✓ Prompt generated: "${prompt.slice(0, 80)}..."`);

        if (!isDryRun) {
          await db.update(recipes).set({ imagePrompt: prompt }).where(eq(recipes.id, r.id));
        }
      } else {
        console.log(`   ℹ️ Using existing prompt: "${prompt.slice(0, 80)}..."`);
      }

      if (isDryRun) {
        console.log(`   🔍 [DRY RUN] Would generate FLUX cover for: "${prompt}"\n`);
        succeeded++;
        continue;
      }

      // 2. Generate cover image via fal.ai & upload to Tigris S3 storage
      console.log(`   🎨 Generating FLUX.1 [schnell] cover & uploading to storage...`);
      const result = await generateRecipeCoverImage({
        prompt,
        jobId: r.id,
        userId: r.createdBy ?? undefined,
      });

      if (!result.imageUrl) {
        throw new Error('generateRecipeCoverImage returned null image URL');
      }

      // 3. Update database record
      const cleanedUrls = Array.isArray(r.imageUrls)
        ? r.imageUrls.filter((u: string) => typeof u === 'string' && u.length > 0 && !u.startsWith('local:'))
        : [];
      const updatedImageUrls = [result.imageUrl, ...cleanedUrls.filter((u) => u !== result.imageUrl)];

      await db
        .update(recipes)
        .set({
          imageUrl: result.imageUrl,
          imageUrls: updatedImageUrls,
          imagePrompt: prompt,
          isAiCover: true,
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, r.id));

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
