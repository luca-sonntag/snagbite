import fs from 'node:fs';
import path from 'node:path';
import { or, inArray, arrayOverlaps } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import { ingredientMappings } from '../db/schema/ingredients.js';
import { config } from '../config.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';
import { buildMappingKeys, canonicalizeBaseName } from '../matching/baseNameCanonical.js';
import {
  findExistingIngredientImage,
  generateIngredientIcon,
  getIngredientImagesDir,
} from '../ingredientImageService.js';
import {
  findIngredientImageInS3Index,
  fetchIconFromS3ToDisk,
  toIconSlug,
} from '../storage/ingredientIconStorage.js';
import {
  isBudgetExhausted,
  recordAuditSpend,
  DEFAULT_DAILY_BUDGET_USD,
} from '../audit/budgetTracker.js';

const MAX_CONCURRENT_GENERATIONS = 3;
let activeGenerations = 0;
const waitQueue: Array<() => void> = [];

/** Deduplicates concurrent generation requests for the same canonical slug. */
const inFlightGenerations = new Map<string, Promise<string | null>>();

/** Caches negative lookups briefly (5 min) so unknown slugs don't hit Postgres repeatedly. */
const negativeLookupCache = new Map<string, number>();
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;

async function acquireGenerationSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT_GENERATIONS) {
    activeGenerations++;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeGenerations++;
}

function releaseGenerationSlot(): void {
  activeGenerations = Math.max(0, activeGenerations - 1);
  const next = waitQueue.shift();
  if (next) next();
}

export interface OnDemandDependencies {
  lookupKnownIngredient?: (cleanId: string, synonyms?: string[]) => Promise<CanonicalIngredient | null>;
  generateIcon?: typeof generateIngredientIcon;
  fetchFromS3?: typeof fetchIconFromS3ToDisk;
  checkBudgetExhausted?: (limitUsd?: number) => boolean;
  hasGeneratorKey?: () => boolean;
}

/**
 * Resolves a requested icon ID / synonyms against `ingredient_mappings` or OpenFoodFacts.
 * Returns null if the ingredient is completely unknown (prevents arbitrary generation abuse).
 */
export async function resolveKnownIngredientForIcon(
  cleanId: string,
  synonyms?: string[]
): Promise<CanonicalIngredient | null> {
  const normalizedSpace = cleanId.replace(/_/g, ' ').trim().toLowerCase();
  const slug = toIconSlug(cleanId);
  if (!slug) return null;

  const negTimestamp = negativeLookupCache.get(slug);
  if (negTimestamp && Date.now() - negTimestamp < NEGATIVE_CACHE_TTL_MS) {
    return null;
  }

  // 1. Direct Open Food Facts barcode / product code check
  const offDirect = openFoodFactsAccess.get(cleanId) || openFoodFactsAccess.get(slug);
  if (offDirect) {
    const offSlug = toIconSlug(canonicalizeBaseName(offDirect.name_en || offDirect.name_de)) || toIconSlug(offDirect.id);
    return {
      ...offDirect,
      id: offSlug,
    };
  }

  // 2. Build candidate lookup keys for `ingredient_mappings`
  const candidateSet = new Set<string>();
  for (const k of buildMappingKeys(normalizedSpace, normalizedSpace, synonyms)) {
    candidateSet.add(k.toLowerCase().trim());
    candidateSet.add(k.toLowerCase().trim().replace(/\s+/g, '_'));
  }
  candidateSet.add(normalizedSpace);
  candidateSet.add(slug);

  const candidates = Array.from(candidateSet).filter((k) => k.length >= 2);
  if (candidates.length === 0) return null;

  try {
    const rows = await db
      .select({
        mappingKey: ingredientMappings.mappingKey,
        mappingKeyDe: ingredientMappings.mappingKeyDe,
        category: ingredientMappings.category,
        productCode: ingredientMappings.productCode,
        aliases: ingredientMappings.aliases,
      })
      .from(ingredientMappings)
      .where(
        or(
          inArray(ingredientMappings.mappingKey, candidates),
          inArray(ingredientMappings.mappingKeyDe, candidates),
          arrayOverlaps(ingredientMappings.aliases, candidates)
        )
      )
      .limit(5);

    if (rows.length > 0) {
      // Prefer exact mappingKey match if present
      const best =
        rows.find((r) => toIconSlug(r.mappingKey) === slug || r.mappingKey.toLowerCase() === normalizedSpace) ||
        rows[0];
      const canonicalSlug = toIconSlug(canonicalizeBaseName(best.mappingKey)) || toIconSlug(best.mappingKey) || slug;
      const nameEn = best.mappingKey.replace(/_/g, ' ');
      const nameDe = (best.mappingKeyDe || nameEn).replace(/_/g, ' ');

      return {
        id: canonicalSlug,
        product_code: best.productCode || canonicalSlug,
        name_de: nameDe,
        name_en: nameEn,
        category: best.category || 'OTHER',
        nutrients_per_100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        aliases: best.aliases ?? [nameEn],
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ingredientOnDemandService] DB lookup failed for "${cleanId}": ${msg}`);
  }

  negativeLookupCache.set(slug, Date.now());
  return null;
}

/**
 * Resolves an ingredient icon via:
 *   1. L1 Local Disk Cache
 *   2. L2 S3 In-Memory Index / Direct S3 Fetch
 *   3. L3 On-Demand Generation (if known in `ingredient_mappings` / OFF and within daily budget)
 */
export async function resolveOrGenerateIngredientIcon(
  cleanId: string,
  synonyms?: string[],
  outDir?: string,
  deps: OnDemandDependencies = {}
): Promise<string | null> {
  const dir = outDir || getIngredientImagesDir();
  const fetchFromS3 = deps.fetchFromS3 || fetchIconFromS3ToDisk;

  // 1. Check L1 Local Disk Cache
  const localMatch = findExistingIngredientImage(cleanId, dir, synonyms);
  if (localMatch && fs.existsSync(path.join(dir, localMatch))) {
    return localMatch;
  }

  // 2. Check L2 S3 In-Memory Index
  const s3IndexedFilename = findIngredientImageInS3Index(cleanId, synonyms);
  if (s3IndexedFilename) {
    const downloadedPath = await fetchFromS3(s3IndexedFilename, dir);
    if (downloadedPath && fs.existsSync(downloadedPath)) {
      return path.basename(downloadedPath);
    }
  }

  // 3. Validate whether this is a known ingredient in our DB or OpenFoodFacts
  const lookupFn = deps.lookupKnownIngredient || resolveKnownIngredientForIcon;
  const knownItem = await lookupFn(cleanId, synonyms);
  if (!knownItem) {
    return null;
  }

  const canonicalSlug = toIconSlug(knownItem.id);
  const canonicalFilename = `${canonicalSlug}.webp`;

  // Re-check L1 Disk and direct S3 with the resolved canonical slug (in case worker just uploaded it)
  const localCanonical = findExistingIngredientImage(canonicalSlug, dir);
  if (localCanonical && fs.existsSync(path.join(dir, localCanonical))) {
    return localCanonical;
  }

  const directS3Path = await fetchFromS3(canonicalFilename, dir);
  if (directS3Path && fs.existsSync(directS3Path)) {
    return path.basename(directS3Path);
  }

  // 4. On-Demand Generation (Deduplicated per canonicalSlug)
  const existingInFlight = inFlightGenerations.get(canonicalSlug);
  if (existingInFlight) {
    return existingInFlight;
  }

  const hasKey = deps.hasGeneratorKey ? deps.hasGeneratorKey() : Boolean(config.FAL_KEY);
  const budgetExhausted = deps.checkBudgetExhausted
    ? deps.checkBudgetExhausted(DEFAULT_DAILY_BUDGET_USD)
    : isBudgetExhausted(DEFAULT_DAILY_BUDGET_USD);

  if (!hasKey || budgetExhausted) {
    if (budgetExhausted) {
      console.warn(`[ingredientOnDemandService] Daily icon budget exhausted, skipping on-demand generation for "${canonicalSlug}".`);
    }
    return null;
  }

  const generateFn = deps.generateIcon || generateIngredientIcon;

  const generationPromise = (async (): Promise<string | null> => {
    await acquireGenerationSlot();
    try {
      // Double-check disk after acquiring slot in case another worker finished
      if (fs.existsSync(path.join(dir, canonicalFilename))) {
        return canonicalFilename;
      }

      console.log(`[ingredientOnDemandService] 🎨 Generating on-demand icon for "${canonicalSlug}" (${knownItem.category})...`);
      const res = await generateFn(knownItem, { outDir: dir, transparent: true, uploadToS3: true });

      recordAuditSpend({
        geminiCostUsd: res.costs.gemini.costUsd,
        fluxCostUsd: res.costs.flux.costUsd,
        bgbusterCostUsd: res.costs.bgbusterCostUsd ?? 0,
        isGeneration: true,
      });

      negativeLookupCache.delete(canonicalSlug);
      console.log(
        `[ingredientOnDemandService] ✅ On-demand icon ready: ${res.filename} (${res.durationMs}ms, ${res.sizeKb} KB, $${res.costs.totalCostUsd.toFixed(4)})`
      );
      return res.filename;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ingredientOnDemandService] ❌ On-demand generation failed for "${canonicalSlug}": ${msg}`);
      return null;
    } finally {
      releaseGenerationSlot();
      inFlightGenerations.delete(canonicalSlug);
    }
  })();

  inFlightGenerations.set(canonicalSlug, generationPromise);
  return generationPromise;
}

/**
 * Fire-and-forget helper to pre-warm missing ingredient icons in the background during recipe extraction.
 */
export function triggerBackgroundIconGeneration(
  ingredientIdOrBaseName: string,
  synonyms?: string[]
): void {
  const clean = toIconSlug(ingredientIdOrBaseName);
  if (!clean) return;
  void resolveOrGenerateIngredientIcon(clean, synonyms).catch(() => {
    // Non-fatal background pre-warming
  });
}
