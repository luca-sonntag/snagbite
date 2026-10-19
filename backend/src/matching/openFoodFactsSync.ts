/**
 * Open Food Facts SQLite Sync & Runtime Hydration
 *
 * Ensures the local SQLite catalog (off_de.sqlite) is available for fast FTS5 search.
 * In production or fresh container environments, hydrates the ~78 MB SQLite database
 * by downloading the compressed ~30 MB gzip artifact (off_de.sqlite.gz) from Tigris S3.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { isS3Configured, downloadFile } from '../storage/s3Client.js';
import { resolveDBPath } from './openFoodFactsIndex.js';

export const OFF_S3_BUCKET = 'datasets' as const;
export const OFF_S3_KEY = 'off_de.sqlite.gz';
export const MIN_VALID_DB_SIZE_BYTES = 10_000_000; // 10 MB sanity threshold

export interface EnsureOffDbResult {
  ready: boolean;
  source: 'local' | 's3_downloaded' | 's3_missing' | 'unconfigured' | 'error';
  path: string;
  durationMs?: number;
  error?: string;
}

/**
 * Checks if the Open Food Facts SQLite index is available locally.
 * If missing and S3 is configured, automatically downloads and decompressing the artifact.
 */
export async function ensureOpenFoodFactsDatabase(options: {
  force?: boolean;
  verbose?: boolean;
} = {}): Promise<EnsureOffDbResult> {
  const dbPath = resolveDBPath();
  const verbose = options.verbose ?? false;

  // 1. Fast-path: check if valid SQLite database is already present locally
  if (!options.force && fs.existsSync(dbPath)) {
    try {
      const stat = fs.statSync(dbPath);
      if (stat.size >= MIN_VALID_DB_SIZE_BYTES) {
        if (verbose) {
          console.log(`[OpenFoodFacts] Local database ready at ${dbPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB).`);
        }
        return { ready: true, source: 'local', path: dbPath };
      }
      console.warn(`[OpenFoodFacts] Database file at ${dbPath} is suspiciously small (${stat.size} bytes). Re-downloading...`);
    } catch {
      // Continue to download if stat fails
    }
  }

  // 2. Check if S3 credentials are available
  if (!isS3Configured()) {
    console.warn(
      `[OpenFoodFacts] SQLite index not found at ${dbPath} and S3 is not configured.\n` +
      `  Run 'npm run off:sync:s3' or 'npm run build:off' to populate the catalogue.`
    );
    return { ready: false, source: 'unconfigured', path: dbPath };
  }

  // 3. Download compressed artifact from Tigris S3 and unpack atomically
  const startTime = Date.now();
  const targetDir = path.dirname(dbPath);
  const tmpPath = `${dbPath}.download.${Date.now()}.tmp`;

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`[OpenFoodFacts] Downloading compressed SQLite index from S3 (${OFF_S3_BUCKET}/${OFF_S3_KEY})...`);
    const compressedBuffer = await downloadFile(OFF_S3_BUCKET, OFF_S3_KEY);

    console.log(`[OpenFoodFacts] Decompressing ${(compressedBuffer.length / 1024 / 1024).toFixed(1)} MB gzip stream...`);
    const readStream = Readable.from(compressedBuffer);
    const gunzip = createGunzip();
    const writeStream = fs.createWriteStream(tmpPath);

    await pipeline(readStream, gunzip, writeStream);

    // Atomically replace target database
    fs.renameSync(tmpPath, dbPath);

    const durationMs = Date.now() - startTime;
    const stat = fs.statSync(dbPath);
    const sizeMb = (stat.size / 1024 / 1024).toFixed(1);

    console.log(`[OpenFoodFacts] ✅ SQLite index hydrated successfully in ${durationMs}ms (${sizeMb} MB) -> ${dbPath}`);
    return { ready: true, source: 's3_downloaded', path: dbPath, durationMs };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[OpenFoodFacts] ⚠️ Failed to download SQLite index from S3: ${errorMsg}`);

    // Cleanup orphan tmp file if it exists
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore unlink error on cleanup
      }
    }

    return {
      ready: false,
      source: 'error',
      path: dbPath,
      durationMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
