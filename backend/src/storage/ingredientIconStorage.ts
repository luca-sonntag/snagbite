import fs from 'node:fs';
import path from 'node:path';
import {
  isS3Configured,
  ensureBucketExists,
  listFiles,
  downloadFile,
  uploadFile,
  type StorageBucket,
} from './s3Client.js';
import { canonicalizeBaseName, toEnglishSingular } from '../matching/baseNameCanonical.js';
import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';

export const INGREDIENT_ICONS_BUCKET: StorageBucket = 'ingredient-icons';

const GENERIC_UMBRELLA_BASENAMES = new Set([
  'cheese',
  'fish',
  'meat',
  'poultry',
  'seafood',
  'oil',
  'flour',
  'spice',
  'herb',
  'pasta',
  'noodle',
  'pepper',
  'salad',
]);

/** In-memory index of .webp filenames known to exist in S3 (lowercase). */
const s3KnownIcons = new Set<string>();
const inFlightDownloads = new Map<string, Promise<string | null>>();
let initialized = false;

export function toIconSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Loads the list of existing .webp icons from S3 into memory on startup.
 */
export async function initIngredientIconStorage(): Promise<number> {
  if (!isS3Configured()) {
    return 0;
  }

  try {
    await ensureBucketExists(INGREDIENT_ICONS_BUCKET);
    const files = await listFiles(INGREDIENT_ICONS_BUCKET);
    s3KnownIcons.clear();
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.webp')) {
        s3KnownIcons.add(name);
      }
    }
    initialized = true;
    console.log(`[ingredientIconStorage] Indexed ${s3KnownIcons.size} ingredient icons in S3.`);
    return s3KnownIcons.size;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ingredientIconStorage] Failed to index S3 ingredient icons: ${msg}`);
    return 0;
  }
}

export function isS3IconIndexInitialized(): boolean {
  return initialized;
}

export function registerS3IconInMemory(filename: string): void {
  s3KnownIcons.add(filename.toLowerCase().trim());
}

export function getKnownS3IconSet(): ReadonlySet<string> {
  return s3KnownIcons;
}

/**
 * Resolves a filename against a lookup function (used for both local disk and S3 index).
 */
export function resolveIconFilenameWithCascade(
  ingredientId: string,
  existsFn: (filename: string) => boolean,
  synonyms?: string[]
): string | null {
  const raw = ingredientId.toLowerCase().trim();
  const canonical = toIconSlug(canonicalizeBaseName(raw));
  const slug = toIconSlug(raw);

  if (!slug && !canonical) return null;

  const checkSynonyms = (): string | null => {
    if (!Array.isArray(synonyms)) return null;
    for (const syn of synonyms) {
      if (!syn) continue;
      const sRaw = syn.toLowerCase().trim();
      const sCanonical = toIconSlug(canonicalizeBaseName(sRaw));
      const sSlug = toIconSlug(sRaw);
      if (sSlug && existsFn(`${sSlug}.webp`)) return `${sSlug}.webp`;
      if (sCanonical && existsFn(`${sCanonical}.webp`)) return `${sCanonical}.webp`;
    }
    return null;
  };

  if (
    (canonical && GENERIC_UMBRELLA_BASENAMES.has(canonical)) ||
    (slug && GENERIC_UMBRELLA_BASENAMES.has(slug))
  ) {
    const synMatch = checkSynonyms();
    if (synMatch) return synMatch;
  }

  if (slug && existsFn(`${slug}.webp`)) return `${slug}.webp`;
  if (canonical && existsFn(`${canonical}.webp`)) return `${canonical}.webp`;

  const singular = toEnglishSingular(slug);
  if (singular && singular !== slug && existsFn(`${singular}.webp`)) {
    return `${singular}.webp`;
  }

  const synFallback = checkSynonyms();
  if (synFallback) return synFallback;

  const product = openFoodFactsAccess.get(raw);
  if (product) {
    const candidateNames = [product.name_en, product.name_de].filter(Boolean);
    for (const name of candidateNames) {
      const pCanonical = toIconSlug(canonicalizeBaseName(name));
      if (pCanonical && existsFn(`${pCanonical}.webp`)) return `${pCanonical}.webp`;
      const pSlug = toIconSlug(name.split(/[,(]/)[0] || '');
      if (pSlug && existsFn(`${pSlug}.webp`)) return `${pSlug}.webp`;
    }
  }

  return null;
}

/**
 * Checks whether an icon for `ingredientId` exists in the in-memory S3 index.
 */
export function findIngredientImageInS3Index(
  ingredientId: string,
  synonyms?: string[]
): string | null {
  if (!isS3Configured() || s3KnownIcons.size === 0) return null;
  return resolveIconFilenameWithCascade(
    ingredientId,
    (filename) => s3KnownIcons.has(filename.toLowerCase()),
    synonyms
  );
}

/**
 * Downloads an icon from S3 into the local disk cache (`outDir`), deduplicating concurrent downloads.
 */
export async function fetchIconFromS3ToDisk(
  filename: string,
  outDir: string
): Promise<string | null> {
  if (!isS3Configured()) return null;
  const cleanFilename = path.basename(filename).toLowerCase();
  const targetPath = path.join(outDir, cleanFilename);

  if (fs.existsSync(targetPath)) {
    s3KnownIcons.add(cleanFilename);
    return targetPath;
  }

  const inflight = inFlightDownloads.get(cleanFilename);
  if (inflight) return inflight;

  const promise = (async (): Promise<string | null> => {
    try {
      const buffer = await downloadFile(INGREDIENT_ICONS_BUCKET, cleanFilename);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);
      s3KnownIcons.add(cleanFilename);
      return targetPath;
    } catch {
      return null;
    } finally {
      inFlightDownloads.delete(cleanFilename);
    }
  })();

  inFlightDownloads.set(cleanFilename, promise);
  return promise;
}

/**
 * Uploads a generated .webp icon buffer to S3 and registers it in the in-memory index.
 */
export async function uploadIngredientIconToS3(
  filename: string,
  webpBuffer: Buffer
): Promise<boolean> {
  if (!isS3Configured()) return false;
  const cleanFilename = path.basename(filename).toLowerCase();
  try {
    await ensureBucketExists(INGREDIENT_ICONS_BUCKET);
    await uploadFile(INGREDIENT_ICONS_BUCKET, cleanFilename, webpBuffer, 'image/webp');
    s3KnownIcons.add(cleanFilename);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ingredientIconStorage] Failed to upload ${cleanFilename} to S3: ${msg}`);
    return false;
  }
}
