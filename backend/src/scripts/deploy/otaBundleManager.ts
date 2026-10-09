/**
 * CLI Tool for managing and deploying OTA App Bundles.
 * Completely replaces Supabase Storage & PostgREST with Railway Tigris S3 + Postgres (Drizzle).
 *
 * Usage:
 *   npx tsx src/scripts/deploy/otaBundleManager.ts --prod publish --channel=alpha --version=1.1.9-ota.1 --zip="path.zip" --min-code=110 [--no-activate]
 *   npx tsx src/scripts/deploy/otaBundleManager.ts --prod get-active --channel=alpha
 *   npx tsx src/scripts/deploy/otaBundleManager.ts --prod list --channel=alpha
 *   npx tsx src/scripts/deploy/otaBundleManager.ts --prod rollback --channel=alpha
 *   npx tsx src/scripts/deploy/otaBundleManager.ts --prod cap --version-code=110
 */
import fs from 'fs';
import { initScriptEnv } from '../scriptEnv.js';

initScriptEnv();

const {
  getActiveAppBundle,
  listAppBundles,
  createAppBundle,
  setAppBundleActive,
  capOpenEndedAppBundles,
} = await import('../../db/appBundlesDb.js');

const {
  ensureBucketExists,
  uploadFile,
  getPublicUrl,
} = await import('../../storage/s3Client.js');

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const command = process.argv.find((a) =>
  ['publish', 'get-active', 'list', 'rollback', 'cap'].includes(a)
);

async function main() {
  if (!command) {
    console.error('Usage: otaBundleManager.ts [--prod|--dev] <publish|get-active|list|rollback|cap> [options]');
    process.exit(1);
  }

  const channel = (getArg('channel') || 'production') as 'production' | 'alpha' | 'internal';

  if (command === 'get-active') {
    const bundles = await listAppBundles(channel);
    const active = bundles.find((b) => b.active);
    if (!active) {
      console.log(JSON.stringify(null));
      return;
    }
    console.log(JSON.stringify(active));
    return;
  }

  if (command === 'list') {
    const bundles = await listAppBundles(channel);
    console.log(JSON.stringify(bundles));
    return;
  }

  if (command === 'rollback') {
    const bundles = await listAppBundles(channel);
    const active = bundles.find((b) => b.active);
    if (!active) {
      console.error(`No active bundle found on channel "${channel}" to roll back.`);
      process.exit(1);
    }

    const previous = bundles.find(
      (b) => !b.active && new Date(b.created_at) < new Date(active.created_at)
    );

    if (!previous) {
      await setAppBundleActive(active.id, false);
      console.log(JSON.stringify({ rolledBack: true, deactivatedOnly: true, previousVersion: null }));
      return;
    }

    await setAppBundleActive(previous.id, true);
    console.log(JSON.stringify({
      rolledBack: true,
      deactivated: active.version,
      activated: previous.version,
    }));
    return;
  }

  if (command === 'cap') {
    const versionCodeRaw = getArg('version-code');
    const versionCode = versionCodeRaw ? parseInt(versionCodeRaw, 10) : NaN;
    if (isNaN(versionCode)) {
      console.error('Missing or invalid --version-code argument.');
      process.exit(1);
    }
    const count = await capOpenEndedAppBundles(versionCode);
    console.log(JSON.stringify({ capped: count, versionCode }));
    return;
  }

  if (command === 'publish') {
    const version = getArg('version');
    const zipPath = getArg('zip');
    const minCodeRaw = getArg('min-code');
    const notes = getArg('notes');
    const noActivate = hasFlag('no-activate');

    if (!version || !zipPath || !minCodeRaw) {
      console.error('Missing required arguments: --version, --zip, --min-code');
      process.exit(1);
    }

    if (!fs.existsSync(zipPath)) {
      console.error(`Zip file not found at: ${zipPath}`);
      process.exit(1);
    }

    const minVersionCode = parseInt(minCodeRaw, 10);
    const storagePath = `${channel}/${version}.zip`;
    const zipBuffer = fs.readFileSync(zipPath);

    // Compute checksum
    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex').toLowerCase();

    // 1. Upload to Tigris S3
    await ensureBucketExists('app-bundles');
    await uploadFile('app-bundles', storagePath, zipBuffer, 'application/zip');

    // 2. Insert into PostgreSQL
    const inserted = await createAppBundle({
      channel,
      version,
      storagePath,
      checksum,
      minVersionCode,
      active: !noActivate,
      notes: notes || undefined,
    });

    const publicUrl = getPublicUrl('app-bundles', storagePath);

    console.log(JSON.stringify({
      success: true,
      bundle: inserted,
      url: publicUrl,
    }));
  }
}

main().catch((err) => {
  console.error('OTA Manager Error:', err);
  process.exit(1);
});
