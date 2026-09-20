/**
 * One-off migration: purge legacy rehosted recipe frames.
 *
 * Historically, selected video frames were uploaded to the `recipe-frames`
 * Storage bucket with 10-year signed URLs stored in each recipe's `imageUrls`.
 * That is effectively rehosting third-party video content. The pipeline now
 * hands frames to the extracting device transiently and keeps them only in the
 * device's local cache (see db.ts / queue.ts).
 *
 * This script brings existing data in line:
 *   1. Rewrites every recipe `imageUrls`/`imageUrl` entry that points at the
 *      `recipe-frames` bucket into a local reference (`local:{jobId}:{index}`),
 *      so the frontend short-circuits to its local cache instead of fetching.
 *      Platform-CDN thumbnail fallbacks are left untouched (they are hotlinks,
 *      not our hosting).
 *   2. Deletes all objects from the `recipe-frames` bucket.
 *
 * Idempotent. Run with DRY_RUN=1 to preview without writing.
 *
 *   npx tsx src/scripts/purgeHostedFrames.ts
 *   DRY_RUN=1 npx tsx src/scripts/purgeHostedFrames.ts
 */
import { getClient } from '../db.js';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const FRAMES_MARKER = '/recipe-frames/';
const PAGE_SIZE = 500;

/** Extracts the frame index from a `.../recipe-frames/{jobId}/{index}.jpg` URL. */
function frameIndexFromUrl(url: string): number | null {
  const match = url.match(/\/recipe-frames\/[^/]+\/(\d+)\.jpg/i);
  return match ? parseInt(match[1], 10) : null;
}

function isHostedFrameUrl(value: unknown): value is string {
  return typeof value === 'string' && value.includes(FRAMES_MARKER);
}

/**
 * Rewrites a recipe's image fields in place. Returns true if anything changed.
 */
function rewriteRecipe(recipe: any, recipeId: string): boolean {
  if (!recipe || typeof recipe !== 'object') return false;
  let changed = false;

  if (Array.isArray(recipe.imageUrls)) {
    recipe.imageUrls = recipe.imageUrls.map((url: unknown, i: number) => {
      if (!isHostedFrameUrl(url)) return url;
      changed = true;
      const idx = frameIndexFromUrl(url) ?? i;
      return `local:${recipeId}:${idx}`;
    });
  }

  if (isHostedFrameUrl(recipe.imageUrl)) {
    const idx = frameIndexFromUrl(recipe.imageUrl) ?? 0;
    recipe.imageUrl = `local:${recipeId}:${idx}`;
    changed = true;
  }

  return changed;
}

async function rewriteDatabase(): Promise<void> {
  const client = getClient();
  let from = 0;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const { data, error } = await client
      .from('recipes')
      .select('id, image_url, image_urls')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to page recipes: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      const r = row as any;
      // Only the image fields matter here, so work on them directly rather than
      // round-tripping the whole recipe.
      const recipe = { imageUrl: r.image_url, imageUrls: r.image_urls ?? [] };
      if (!rewriteRecipe(recipe, r.id)) continue;

      updated++;
      if (DRY_RUN) {
        console.log(`[dry-run] would rewrite recipe ${r.id} → ${JSON.stringify(recipe.imageUrls)}`);
        continue;
      }

      const { error: updateError } = await client
        .from('recipes')
        .update({ image_url: recipe.imageUrl, image_urls: recipe.imageUrls })
        .eq('id', r.id);
      if (updateError) {
        console.error(`Failed to update recipe ${r.id}: ${updateError.message}`);
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Scanned ${scanned} recipes, ${updated} contained hosted frames${DRY_RUN ? ' (no writes)' : ' (rewritten)'}.`);
}

async function purgeStorage(): Promise<void> {
  const client = getClient();
  const { data: folders, error } = await client.storage.from('recipe-frames').list('', { limit: 100000 });
  if (error) throw new Error(`Failed to list recipe-frames bucket: ${error.message}`);
  if (!folders || folders.length === 0) {
    console.log('Storage bucket recipe-frames is already empty.');
    return;
  }

  let removed = 0;
  for (const folder of folders) {
    if (!folder.name) continue;
    const { data: files, error: filesError } = await client.storage.from('recipe-frames').list(folder.name, { limit: 100000 });
    if (filesError || !files || files.length === 0) continue;

    const paths = files.map(f => `${folder.name}/${f.name}`);
    if (DRY_RUN) {
      console.log(`[dry-run] would delete ${paths.length} object(s) under ${folder.name}/`);
      removed += paths.length;
      continue;
    }

    const { error: removeError } = await client.storage.from('recipe-frames').remove(paths);
    if (removeError) {
      console.error(`Failed to delete frames under ${folder.name}/: ${removeError.message}`);
    } else {
      removed += paths.length;
    }
  }

  console.log(`${DRY_RUN ? 'Would delete' : 'Deleted'} ${removed} object(s) from recipe-frames.`);
}

async function main(): Promise<void> {
  console.log(`Purging legacy hosted recipe frames${DRY_RUN ? ' (DRY RUN)' : ''}...`);
  await rewriteDatabase();
  await purgeStorage();
  console.log('Done.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
