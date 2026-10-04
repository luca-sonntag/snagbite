/**
 * Migration script: Copies all existing objects from Supabase Storage buckets
 * (recipe-covers, cook-photos, feedback-screenshots, app-bundles) to S3/Tigris,
 * and rewrites recipes.image_url to the new S3 domain.
 *
 * Usage:
 *   npx tsx src/scripts/storage/migrateStorageToS3.ts --dev
 *   npx tsx src/scripts/storage/migrateStorageToS3.ts --prod
 *   npx tsx src/scripts/storage/migrateStorageToS3.ts --prod --dry-run
 */
import { initScriptEnv } from '../scriptEnv.js';
import type { StorageBucket } from '../../storage/s3Client.js';

const scriptEnv = initScriptEnv();
const isDryRun = process.argv.includes('--dry-run');
const skipRewrite = process.argv.includes('--skip-url-rewrite');
const client = scriptEnv.client;

const {
  ensureBucketExists,
  uploadFile,
  getPublicUrl,
} = await import('../../storage/s3Client.js');

const BUCKETS_TO_MIGRATE: Array<{ bucket: StorageBucket; contentType: string }> = [
  { bucket: 'recipe-covers', contentType: 'image/jpeg' },
  { bucket: 'cook-photos', contentType: 'image/jpeg' },
  { bucket: 'feedback-screenshots', contentType: 'image/jpeg' },
  { bucket: 'app-bundles', contentType: 'application/zip' },
];

/**
 * Recursively lists all file paths in a Supabase Storage bucket.
 */
async function listAllSupabaseFiles(bucket: string, prefix = ''): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return [];

  const paths: string[] = [];
  for (const item of data) {
    if (!item.name) continue;
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null || !item.metadata) {
      // It's a folder, recurse into it
      const subPaths = await listAllSupabaseFiles(bucket, itemPath);
      paths.push(...subPaths);
    } else {
      paths.push(itemPath);
    }
  }
  return paths;
}

/**
 * Migrates files from a single Supabase bucket to S3.
 */
async function migrateBucket(bucket: StorageBucket, defaultContentType: string): Promise<number> {
  console.log(`\n📦 Checking bucket: ${bucket}...`);
  if (!isDryRun) {
    await ensureBucketExists(bucket);
  }

  const files = await listAllSupabaseFiles(bucket);
  console.log(`Found ${files.length} file(s) in Supabase bucket '${bucket}'.`);

  let copied = 0;
  for (const filePath of files) {
    if (isDryRun) {
      console.log(`[DRY-RUN] Would copy ${bucket}/${filePath} to S3`);
      copied++;
      continue;
    }

    try {
      const { data: blob, error } = await client.storage.from(bucket).download(filePath);
      if (error || !blob) {
        console.warn(`  ⚠️ Failed to download ${filePath}: ${error?.message}`);
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const contentType = blob.type || defaultContentType;
      await uploadFile(bucket, filePath, buffer, contentType);
      copied++;
      console.log(`  ✓ Copied ${bucket}/${filePath} (${buffer.length} bytes)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Error copying ${filePath}:`, msg);
    }
  }

  return copied;
}

/**
 * Rewrites recipes.image_url that point to Supabase recipe-covers to S3 URLs.
 */
async function rewriteRecipeImageUrls(): Promise<{ scanned: number; updated: number }> {
  console.log('\n🔍 Scanning recipes for Supabase cover URLs...');
  const { data: recipes, error } = await client
    .from('recipes')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .ilike('image_url', '%/recipe-covers/%');

  if (error) {
    console.error('Error fetching recipes:', error.message);
    return { scanned: 0, updated: 0 };
  }

  const list = recipes ?? [];
  console.log(`Found ${list.length} recipe(s) with Supabase cover URLs.`);
  let updated = 0;

  for (const recipe of list) {
    const oldUrl = recipe.image_url as string;
    const match = oldUrl.match(/\/recipe-covers\/(.+)$/);
    if (!match || !match[1]) continue;

    const storagePath = match[1].split('?')[0];
    const newUrl = getPublicUrl('recipe-covers', storagePath);

    if (oldUrl === newUrl) continue;

    if (isDryRun) {
      console.log(`[DRY-RUN] Recipe ${recipe.id}: ${oldUrl} -> ${newUrl}`);
      updated++;
    } else {
      const { error: updateError } = await client
        .from('recipes')
        .update({ image_url: newUrl })
        .eq('id', recipe.id);

      if (updateError) {
        console.error(`  Failed to update recipe ${recipe.id}:`, updateError.message);
      } else {
        updated++;
      }
    }
  }

  return { scanned: list.length, updated };
}

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(`🚀 Supabase Storage -> S3 / Tigris Migration (${scriptEnv.target.toUpperCase()})`);
  console.log(`Dry Run: ${isDryRun ? 'YES (no changes)' : 'NO'}`);
  console.log('============================================================');

  let totalFiles = 0;
  for (const { bucket, contentType } of BUCKETS_TO_MIGRATE) {
    const count = await migrateBucket(bucket, contentType);
    totalFiles += count;
  }

  let scanned = 0;
  let updated = 0;
  if (!skipRewrite) {
    const res = await rewriteRecipeImageUrls();
    scanned = res.scanned;
    updated = res.updated;
  } else {
    console.log('\n⏭️ Skipping recipe image URL rewrite (--skip-url-rewrite passed).');
  }

  console.log('\n============================================================');
  console.log('✅ Migration Summary:');
  console.log(`- Files copied to S3:       ${totalFiles}`);
  console.log(`- Recipe URLs scanned:      ${scanned}`);
  console.log(`- Recipe URLs rewritten:    ${updated}`);
  console.log('============================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
