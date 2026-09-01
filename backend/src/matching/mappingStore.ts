/**
 * Persistent, cross-user store of resolved ingredient-to-product mappings.
 * Canonical 1-row-per-food model with English mapping_key, German mapping_key_de, and aliases.
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
  mappingKeyDe?: string | null;
  aliases?: string[];
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

export interface StoreMappingParams {
  mappingKey: string;
  mappingKeyDe?: string | null;
  aliases?: string[];
  category: string;
}

interface MappingRow {
  mapping_key: string;
  mapping_key_de?: string | null;
  aliases?: string[] | null;
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

const cache = new Map<string, IngredientMapping | null>();
const CACHE_MAX_ENTRIES = 5000;
const pendingHits = new Set<string>();

const cacheId = (key: string, cat: string) => `${key.toLowerCase().trim()} ${cat.toUpperCase().trim()}`;

function rowToMapping(row: MappingRow): IngredientMapping {
  const conf = row.confidence == null ? null : Number(row.confidence);
  const pkg = row.typical_package_amount != null ? Number(row.typical_package_amount) : null;
  return {
    mappingKey: row.mapping_key,
    mappingKeyDe: row.mapping_key_de ?? null,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    category: row.category ?? '',
    productCode: row.product_code ?? null,
    resolution: row.resolution === 'no_match' ? 'no_match' : 'matched',
    estimatedNutrients: (row.estimated_nutrients as EstimatedNutrients | null) ?? null,
    typicalPackageAmount: Number.isFinite(pkg as number) ? (pkg as number) : null,
    typicalPackageUnit: row.typical_package_unit ?? null,
    shelfLifeDays: typeof row.shelf_life_days === 'number' ? row.shelf_life_days : null,
    source: (['static', 'agent', 'human'].includes(row.source) ? row.source : 'agent') as MappingSource,
    confidence: Number.isFinite(conf as number) ? (conf as number) : null,
    model: row.model,
    reasoning: row.reasoning,
  };
}

function remember(id: string, mapping: IngredientMapping | null): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(id, mapping);
}

function rememberMappingInCache(mapping: IngredientMapping): void {
  const cat = mapping.category.toUpperCase().trim();
  const keys = [mapping.mappingKey, mapping.mappingKeyDe, ...(mapping.aliases || [])].filter(
    (k): k is string => Boolean(k && k.length >= 2)
  );
  for (const k of keys) {
    remember(cacheId(k, cat), mapping);
    remember(cacheId(k, ''), mapping);
  }
}

const trackHit = (mapping: IngredientMapping): IngredientMapping => {
  pendingHits.add(mapping.mappingKey);
  return mapping;
};

export async function lookupMapping(keys: string[], category: string): Promise<IngredientMapping | null> {
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
    const unknownList = unknown.map((k) => `"${k}"`).join(',');
    const { data, error } = await getClient()
      .from('ingredient_mappings')
      .select('*')
      .or(`mapping_key.in.(${unknownList}),mapping_key_de.in.(${unknownList}),aliases.ov.{${unknown.join(',')}}`);

    if (error) {
      const fallback = await getClient().from('ingredient_mappings').select('*').in('mapping_key', unknown);
      if (fallback.error) throw new Error(fallback.error.message);
      rows = (fallback.data ?? []) as MappingRow[];
    } else {
      rows = (data ?? []) as MappingRow[];
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[mappingStore] lookup failed, falling through to resolver:', msg);
    return null;
  }

  for (const row of rows) rememberMappingInCache(rowToMapping(row));

  for (const key of keys) {
    const exact = cache.get(cacheId(key, cat));
    if (exact) return trackHit(exact);
    const loose = cache.get(cacheId(key, ''));
    if (loose) return trackHit(loose);
  }

  for (const key of unknown) remember(cacheId(key, cat), null);
  return null;
}

export async function storeMapping(
  keysOrParams: string[] | StoreMappingParams,
  categoryOrMapping: string | Omit<IngredientMapping, 'mappingKey' | 'mappingKeyDe' | 'aliases' | 'category'>,
  maybeMapping?: Omit<IngredientMapping, 'mappingKey' | 'mappingKeyDe' | 'aliases' | 'category'>
): Promise<void> {
  const isParams = !Array.isArray(keysOrParams);
  const primaryKey = isParams ? keysOrParams.mappingKey : keysOrParams[0];
  const primaryKeyDe = isParams ? keysOrParams.mappingKeyDe ?? null : keysOrParams[1] ?? null;
  const rawAliases = isParams ? keysOrParams.aliases ?? [] : keysOrParams.slice(2);
  const cat = (isParams ? keysOrParams.category : (categoryOrMapping as string) || '').toUpperCase().trim();
  const mapping = (isParams ? categoryOrMapping : maybeMapping) as Omit<
    IngredientMapping,
    'mappingKey' | 'mappingKeyDe' | 'aliases' | 'category'
  >;

  const cleanKey = (primaryKey || '').toLowerCase().trim();
  if (!cleanKey || cleanKey.length < 2) return;
  const cleanKeyDe = (primaryKeyDe || '').toLowerCase().trim();
  const cleanAliases = Array.from(
    new Set(
      rawAliases
        .map((a) => (a || '').toLowerCase().trim())
        .filter((a) => a.length >= 2 && a !== cleanKey && a !== cleanKeyDe)
    )
  );

  if (mapping.source !== 'human') {
    try {
      const { data, error } = await getClient()
        .from('ingredient_mappings')
        .select('mapping_key')
        .eq('mapping_key', cleanKey)
        .eq('category', cat)
        .eq('source', 'human');
      if (error) throw new Error(error.message);
      if (data && data.length > 0) return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[mappingStore] human-row check failed, skipping write:', msg);
      return;
    }
  }

  const rowData: Record<string, unknown> = {
    mapping_key: cleanKey,
    mapping_key_de: cleanKeyDe || null,
    aliases: cleanAliases,
    category: cat,
    product_code: mapping.productCode ?? null,
    resolution: mapping.resolution,
    estimated_nutrients: mapping.estimatedNutrients,
    typical_package_amount: mapping.typicalPackageAmount ?? null,
    typical_package_unit: mapping.typicalPackageUnit ?? null,
    shelf_life_days: mapping.shelfLifeDays ?? null,
    source: mapping.source,
    confidence: mapping.confidence,
    model: mapping.model,
    reasoning: mapping.reasoning,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await getClient().from('ingredient_mappings').upsert([rowData], { onConflict: 'mapping_key,category' });
    if (error) {
      delete rowData.mapping_key_de;
      delete rowData.aliases;
      const fallback = await getClient().from('ingredient_mappings').upsert([rowData], { onConflict: 'mapping_key,category' });
      if (fallback.error) throw new Error(fallback.error.message);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[mappingStore] upsert failed, continuing without storing:', msg);
    return;
  }

  rememberMappingInCache({
    mappingKey: cleanKey,
    mappingKeyDe: cleanKeyDe || null,
    aliases: cleanAliases,
    category: cat,
    productCode: mapping.productCode ?? null,
    resolution: mapping.resolution,
    estimatedNutrients: mapping.estimatedNutrients ?? null,
    typicalPackageAmount: mapping.typicalPackageAmount ?? null,
    typicalPackageUnit: mapping.typicalPackageUnit ?? null,
    shelfLifeDays: mapping.shelfLifeDays ?? null,
    source: mapping.source,
    confidence: mapping.confidence ?? null,
    model: mapping.model ?? null,
    reasoning: mapping.reasoning ?? null,
  });
}

export async function flushHitCounts(): Promise<void> {
  if (pendingHits.size === 0) return;
  const keys = Array.from(pendingHits);
  pendingHits.clear();
  try {
    const { error } = await getClient().rpc('bump_ingredient_mapping_hits', { keys });
    if (error) throw new Error(error.message);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    for (const key of keys) pendingHits.add(key);
    console.warn('[mappingStore] hit-count flush failed, will retry:', msg);
  }
}

export function invalidateCache(): void {
  cache.clear();
  pendingHits.clear();
}
