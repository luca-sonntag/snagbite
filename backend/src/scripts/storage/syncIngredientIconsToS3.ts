/**
 * Synchronizes ingredient icons (.webp) between local `public/ingredient-icons/`
 * (extracted from `ingredient-icons.zip`) and the Tigris S3 bucket `ingredient-icons`.
 *
 * Usage:
 *   npx tsx src/scripts/storage/syncIngredientIconsToS3.ts --dev
 *   npx tsx src/scripts/storage/syncIngredientIconsToS3.ts --prod
 *   npx tsx src/scripts/storage/syncIngredientIconsToS3.ts --prod --dry-run
 *   npx tsx src/scripts/storage/syncIngredientIconsToS3.ts --prod --pull
 */
import fs from 'node:fs';
import path from 'node:path';
import { initScriptEnv } from '../scriptEnv.js';

const scriptEnv = initScriptEnv({ autoSetDbClient: false });
const isDryRun = process.argv.includes('--dry-run');
const isPull = process.argv.includes('--pull');
const isForce = process.argv.includes('--force');

const {
  isS3Configured,
  ensureBucketExists,
  listFiles,
  uploadFile,
  downloadFile,
} = await import('../../storage/s3Client.js');
const {
  ensureIngredientIconsExtracted,
  getIngredientImagesDir,
} = await import('../../ingredientIconPacker.js');
const { config } = await import('../../config.js');

const BUCKET = 'ingredient-icons' as const;
const CONCURRENCY = 10;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(`🚀 Ingredient Icons S3 Sync (${scriptEnv.target.toUpperCase()})`);
  console.log(`Target S3 Bucket: ${config.S3_BUCKET_NAME || BUCKET}`);
  console.log(`Mode:             ${isPull ? 'Bidirectional (Push + Pull)' : 'Push Local -> S3'}`);
  console.log(`Dry Run:          ${isDryRun ? 'YES (no changes)' : 'NO'}`);
  console.log('============================================================');

  if (!isS3Configured()) {
    console.error('❌ S3 is not configured in the selected environment.');
    process.exit(1);
  }

  await ensureIngredientIconsExtracted({ verbose: true });
  const localDir = getIngredientImagesDir();
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  if (!isDryRun) {
    await ensureBucketExists(BUCKET);
  }

  const localFiles = fs
    .readdirSync(localDir)
    .filter((f) => f.toLowerCase().endsWith('.webp'));
  const localSet = new Set(localFiles.map((f) => f.toLowerCase()));

  console.log(`📂 Local .webp icons found: ${localFiles.length}`);
  console.log(`☁️  Listing existing icons in S3 (${BUCKET})...`);

  const s3Items = await listFiles(BUCKET);
  const s3Files = s3Items
    .map((item) => item.name.toLowerCase())
    .filter((name) => name.endsWith('.webp'));
  const s3Set = new Set(s3Files);

  console.log(`☁️  S3 .webp icons found:    ${s3Set.size}`);

  const toUpload = isForce
    ? localFiles
    : localFiles.filter((f) => !s3Set.has(f.toLowerCase()));

  const toDownload = isPull
    ? s3Files.filter((f) => !localSet.has(f.toLowerCase()))
    : [];

  console.log(`\n⬆️  Icons to upload to S3:     ${toUpload.length}`);
  if (isPull) {
    console.log(`⬇️  Icons to pull from S3:     ${toDownload.length}`);
  }

  let uploaded = 0;
  let failedUploads = 0;

  if (toUpload.length > 0) {
    await runWithConcurrency(toUpload, CONCURRENCY, async (filename, idx) => {
      const fullPath = path.join(localDir, filename);
      const cleanName = filename.toLowerCase();
      if (isDryRun) {
        uploaded++;
        if (idx < 10 || (idx + 1) % 100 === 0) {
          console.log(`  [DRY-RUN] Would upload ${cleanName} (${idx + 1}/${toUpload.length})`);
        }
        return;
      }

      try {
        const buffer = fs.readFileSync(fullPath);
        await uploadFile(BUCKET, cleanName, buffer, 'image/webp');
        uploaded++;
        if ((idx + 1) % 50 === 0 || idx + 1 === toUpload.length) {
          console.log(`  ✓ Uploaded ${idx + 1}/${toUpload.length} icons to S3...`);
        }
      } catch (err: unknown) {
        failedUploads++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Failed to upload ${cleanName}: ${msg}`);
      }
    });
  }

  let downloaded = 0;
  if (toDownload.length > 0) {
    await runWithConcurrency(toDownload, CONCURRENCY, async (filename, idx) => {
      const fullPath = path.join(localDir, filename);
      if (isDryRun) {
        downloaded++;
        console.log(`  [DRY-RUN] Would download ${filename} (${idx + 1}/${toDownload.length})`);
        return;
      }

      try {
        const buffer = await downloadFile(BUCKET, filename);
        fs.writeFileSync(fullPath, buffer);
        downloaded++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Failed to download ${filename}: ${msg}`);
      }
    });
  }

  console.log('\n============================================================');
  console.log('✅ Sync Summary:');
  console.log(`- Uploaded to S3:       ${uploaded} (failed: ${failedUploads})`);
  if (isPull) {
    console.log(`- Downloaded from S3:   ${downloaded}`);
  }
  console.log(`- Total icons in S3:    ${s3Set.size + (isForce ? 0 : uploaded)}`);
  console.log('============================================================\n');
}

main().catch((err: unknown) => {
  console.error('Fatal error during S3 icon sync:', err);
  process.exit(1);
});
