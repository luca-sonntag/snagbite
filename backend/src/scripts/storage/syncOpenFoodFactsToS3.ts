/**
 * Synchronizes the Open Food Facts SQLite database (off_de.sqlite) with Tigris S3.
 *
 * Compresses the ~78 MB SQLite catalog into a lean ~30 MB gzip archive and uploads
 * it to the `datasets` bucket as `datasets/off_de.sqlite.gz`.
 *
 * Usage:
 *   npx tsx src/scripts/storage/syncOpenFoodFactsToS3.ts --dev
 *   npx tsx src/scripts/storage/syncOpenFoodFactsToS3.ts --prod
 *   npx tsx src/scripts/storage/syncOpenFoodFactsToS3.ts --prod --dry-run
 *   npx tsx src/scripts/storage/syncOpenFoodFactsToS3.ts --prod --pull
 */

import fs from 'node:fs';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { initScriptEnv } from '../scriptEnv.js';

const gzipAsync = promisify(zlib.gzip);
const scriptEnv = initScriptEnv({ autoSetDbClient: false });
const isDryRun = process.argv.includes('--dry-run');
const isPull = process.argv.includes('--pull');

const {
  isS3Configured,
  ensureBucketExists,
  uploadFile,
} = await import('../../storage/s3Client.js');

const {
  OFF_S3_BUCKET,
  OFF_S3_KEY,
  MIN_VALID_DB_SIZE_BYTES,
  ensureOpenFoodFactsDatabase,
} = await import('../../matching/openFoodFactsSync.js');

const { resolveDBPath } = await import('../../matching/openFoodFactsIndex.js');
const { config } = await import('../../config.js');

async function handlePull(): Promise<void> {
  console.log('⬇️  Pulling SQLite database from Tigris S3 to local filesystem...');
  const result = await ensureOpenFoodFactsDatabase({ force: true, verbose: true });
  if (result.ready) {
    console.log(`✅ Database successfully pulled to ${result.path}`);
  } else {
    console.error(`❌ Failed to pull database: ${result.error ?? 'Unknown error'}`);
    process.exit(1);
  }
}

async function handlePush(): Promise<void> {
  const dbPath = resolveDBPath();

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Local SQLite file not found at ${dbPath}.`);
    console.error(`   Run 'npm run build:off' first to generate the local SQLite database.`);
    process.exit(1);
  }

  const rawStat = fs.statSync(dbPath);
  if (rawStat.size < MIN_VALID_DB_SIZE_BYTES) {
    console.error(`❌ Local SQLite file is too small (${rawStat.size} bytes). Expected at least 10 MB.`);
    process.exit(1);
  }

  const rawMb = (rawStat.size / 1024 / 1024).toFixed(1);
  console.log(`📦 Reading local SQLite catalog: ${dbPath} (${rawMb} MB)...`);

  const tStart = Date.now();
  const rawBuffer = await fs.promises.readFile(dbPath);
  console.log('🗜️  Compressing with Gzip (level 9)...');
  const compressed = await gzipAsync(rawBuffer, { level: 9 });
  const compMb = (compressed.length / 1024 / 1024).toFixed(1);
  const ratio = ((compressed.length / rawStat.size) * 100).toFixed(1);
  console.log(`   Compressed to ${compMb} MB (${ratio}% of original size).`);

  if (isDryRun) {
    console.log('🔍 [Dry-Run] Skipped upload to S3.');
    return;
  }

  console.log(`🚀 Uploading to S3: Bucket="${config.S3_BUCKET_NAME || OFF_S3_BUCKET}", Key="${OFF_S3_KEY}"...`);
  await ensureBucketExists(OFF_S3_BUCKET);
  await uploadFile(OFF_S3_BUCKET, OFF_S3_KEY, compressed, 'application/gzip');

  const durationSec = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`✅ Upload complete in ${durationSec}s!`);
}

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(`🚀 Open Food Facts S3 Sync (${scriptEnv.target.toUpperCase()})`);
  console.log(`Target S3 Bucket: ${config.S3_BUCKET_NAME || OFF_S3_BUCKET}`);
  console.log(`Target S3 Key:    ${OFF_S3_KEY}`);
  console.log(`Mode:             ${isPull ? 'Pull (S3 -> Local)' : 'Push (Local -> S3)'}`);
  console.log(`Dry Run:          ${isDryRun ? 'YES (no changes)' : 'NO'}`);
  console.log('============================================================');

  if (!isS3Configured()) {
    console.error('❌ S3 is not configured in the selected environment.');
    process.exit(1);
  }

  if (isPull) {
    await handlePull();
  } else {
    await handlePush();
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('❌ Fatal error during OFF S3 sync:', msg);
  process.exit(1);
});
