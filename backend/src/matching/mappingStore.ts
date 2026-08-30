/**
 * Persistent, cross-user store of resolved ingredient-to-product mappings.
 *
 * Every decision the AI resolver makes is written here and reused for every later
 * user, recipe and ingredient, so the same food is never resolved twice.
 *
 * Reads go through a process-local cache: a recipe has ~15 ingredients and the
 * worker handles them back to back, so hitting Postgres for each one would add
 * more latency than the lookup saves.
 */

import { getClient } from '../db.js';

export type MappingResolution = 'matched' | 'no_match';
export type MappingSource = 'static' | 'agent' | 'human';

export interface EstimatedNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IngredientMapping {
  mappingKey: string;
  category: string;
  productCode: string | null;
  resolution: MappingResolution;
  estimatedNutrients: EstimatedNutrients | null;
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
  shelfLifeDays?: number | null;
  source: MappingSource;
  confidence: number | null;
  model: string | null;
  reasoning: string | null;
}

interface MappingRow {
  mapping_key: string;
  category: string | null;
  product_code?: string | null;
  resolution: string;
  estimated_nutrients: unknown;
  typical_package_amount?: number | string | null;
  typical_package_unit?: string | null;
  shelf_life_days?: number | null;
  source: string;
  confidence: number | string | null;
  model: string | null;
  reasoning: string | null;
}

/** Cache entry value of `null` means "looked up, genuinely absent" - a negative cache. */
const cache = new Map<string, IngredientMapping | null>();
const CACHE_MAX_ENTRIES = 5000;
/** Keys whose hit_count still needs to be flushed to Postgres. */
const pendingHits = new Set<string>();

/**
 * A mapping is stored per (key, category), but a key resolved under a different
 * category is still a far better answer than nothing. Lookups therefore try the
 * exact pair first and fall back to the category-less row.
 */
function cacheId(key: string, category: string): string {
  return `${key} ${category}`;
}

function rowToMapping(row: MappingRow): IngredientMapping {
  const confidence =
    row.confidence === null || row.confidence === undefined ? null : Number(row.confidence);
  const code = row.product_code ?? null;
  const packageAmount =
    row.typical_package_amount !== null && row.typical_package_amount !== undefined
      ? Number(row.typical_package_amount)
      : null;
  return {
    mappingKey: row.mapping_key,
    category: row.category ?? '',
    productCode: code,
    resolution: row.resolution === 'no_match' ? 'no_match' : 'matched',
    estimatedNutrients: (row.estimated_nutrients as EstimatedNutrients | null) ?? null,
    typicalPackageAmount: Number.isFinite(packageAmount as number) ? (packageAmount as number) : null,
    typicalPackageUnit: row.typical_package_unit ?? null,
    shelfLifeDays: typeof row.shelf_life_days === 'number' ? row.shelf_life_days : null,
    source: (['static', 'agent', 'human'].includes(row.source) ? row.source : 'agent') as MappingSource,
    confidence: Number.isFinite(confidence as number) ? (confidence as number) : null,
    model: row.model,
    reasoning: row.reasoning,
  };
}

function remember(id: string, mapping: IngredientMapping | null): void {
  // Plain FIFO eviction: entries are equally valuable and the map is small.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(id, mapping);
}

function trackHit(mapping: IngredientMapping): IngredientMapping {
  pendingHits.add(mapping.mappingKey);
  return mapping;
}

/**
 * Looks up the first of `keys` that has a stored mapping.
 *
 * Keys are tried in order, so callers should pass them most-canonical-first (see
 * `buildMappingKeys`). Returns null when none of them is known.
 */
export async function lookupMapping(
  keys: string[],
  category: string
): Promise<IngredientMapping | null> {
  const cat = (category || '').toUpperCase().trim();
  const unknown: string[] = [];

  for (const key of keys) {
    if (!key) continue;
    const exact = cache.get(cacheId(key, cat));
    if (exact) return trackHit(exact);
    const loose = cache.get(cacheId(key, ''));
    if (loose) return trackHit(loose);
    if (exact === undefined && loose === undefined) unknown.push(key);
  }

  if (unknown.length === 0) return null;

  let rows: MappingRow[] = [];
  try {
    const { data, error } = await getClient()
      .from('ingredient_mappings')
      .select('*')
      .in('mapping_key', unknown);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as MappingRow[];
  } catch (err: any) {
    // A database blip during read falls through to the resolver rather than
    // aborting the whole extraction.
    console.warn('[mappingStore] lookup failed, falling through to resolver:', err?.message || err);
    return null;
  }

  const byKey = new Map<string, IngredientMapping[]>();
  for (const row of rows) {
    const mapping = rowToMapping(row);
    remember(cacheId(mapping.mappingKey, mapping.category.toUpperCase()), mapping);
    const list = byKey.get(mapping.mappingKey) ?? [];
    list.push(mapping);
    byKey.set(mapping.mappingKey, list);
  }

  // Negative-cache the keys Postgres had nothing for, so a recipe full of exotic
  // ingredients does not re-query them on every item.
  for (const key of unknown) {
    if (!byKey.has(key)) remember(cacheId(key, cat), null);
  }

  for (const key of keys) {
    const candidates = byKey.get(key);
    if (!candidates || candidates.length === 0) continue;
    const match =
      candidates.find(c => c.category.toUpperCase() === cat) ??
      candidates.find(c => c.category === '') ??
      candidates[0];
    return trackHit(match);
  }

  return null;
}

/**
 * Stores one resolution under every key it should answer to.
 *
 * Writing several keys is the mechanism that makes the store collapse spelling
 * variants: after "bacon cubes" has been resolved once, both "bacon cubes" and
 * "bacon" are keys for the same code.
 *
 * Rows a human corrected are left untouched. A hand fix is the whole point of
 * having the store in a table, so the resolver must never silently undo one on
 * its next run.
 */
export async function storeMapping(
  keys: string[],
  category: string,
  mapping: Omit<IngredientMapping, 'mappingKey' | 'category'>
): Promise<void> {
  const cat = (category || '').toUpperCase().trim();
  let usable = keys.filter(k => k && k.length >= 2);
  if (usable.length === 0) return;

  if (mapping.source !== 'human') {
    try {
      const { data, error } = await getClient()
        .from('ingredient_mappings')
        .select('mapping_key')
        .in('mapping_key', usable)
        .eq('category', cat)
        .eq('source', 'human');
      if (error) throw new Error(error.message);
      const protectedKeys = new Set((data ?? []).map((r: { mapping_key: string }) => r.mapping_key));
      usable = usable.filter(k => !protectedKeys.has(k));
    } catch (err: any) {
      // Cannot prove the rows are safe to touch, so leave them alone entirely.
      console.warn('[mappingStore] human-row check failed, skipping write:', err?.message || err);
      return;
    }
    if (usable.length === 0) return;
  }

  const now = new Date().toISOString();
  const code = mapping.productCode ?? null;
  const rows = usable.map(key => ({
    mapping_key: key,
    category: cat,
    product_code: code,
    resolution: mapping.resolution,
    estimated_nutrients: mapping.estimatedNutrients,
    typical_package_amount: mapping.typicalPackageAmount ?? null,
    typical_package_unit: mapping.typicalPackageUnit ?? null,
    shelf_life_days: mapping.shelfLifeDays ?? null,
    source: mapping.source,
    confidence: mapping.confidence,
    model: mapping.model,
    reasoning: mapping.reasoning,
    updated_at: now,
  }));

  try {
    const { error } = await getClient()
      .from('ingredient_mappings')
      .upsert(rows, { onConflict: 'mapping_key,category' });
    if (error) throw new Error(error.message);
  } catch (err: any) {
    console.warn('[mappingStore] upsert failed, continuing without storing:', err?.message || err);
    return;
  }

  for (const row of rows) {
    const stored: IngredientMapping = {
      mappingKey: row.mapping_key,
      category: row.category,
      productCode: row.product_code,
      resolution: row.resolution as MappingResolution,
      estimatedNutrients: (row.estimated_nutrients as EstimatedNutrients | null) ?? null,
      typicalPackageAmount: typeof row.typical_package_amount === 'number' ? row.typical_package_amount : null,
      typicalPackageUnit: row.typical_package_unit ?? null,
      shelfLifeDays: typeof row.shelf_life_days === 'number' ? row.shelf_life_days : null,
      source: row.source as MappingSource,
      confidence: row.confidence === null ? null : Number(row.confidence),
      model: row.model,
      reasoning: row.reasoning,
    };
    remember(cacheId(stored.mappingKey, stored.category), stored);
  }
}

/**
 * Pushes accumulated hit counts to Postgres via the `bump_ingredient_mapping_hits`
 * RPC function, clearing the local set.
 */
export async function flushHitCounts(): Promise<void> {
  if (pendingHits.size === 0) return;
  const keys = Array.from(pendingHits);
  pendingHits.clear();

  try {
    const { error } = await getClient().rpc('bump_ingredient_mapping_hits', { keys });
    if (error) throw new Error(error.message);
  } catch (err: any) {
    // A lost hit count is harmless, but put the keys back so the next flush retries.
    for (const key of keys) pendingHits.add(key);
    console.warn('[mappingStore] hit-count flush failed, will retry:', err?.message || err);
  }
}

/** Clears the in-memory cache (used by unit tests and admin cache invalidation). */
export function invalidateCache(): void {
  cache.clear();
  pendingHits.clear();
}
