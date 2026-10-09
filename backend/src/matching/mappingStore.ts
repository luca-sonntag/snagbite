/**
 * Persistent, cross-user store of resolved ingredient-to-product mappings.
 * Canonical 1-row-per-food model with English mapping_key, German mapping_key_de, and aliases.
 */

import { db, getDbPool } from '../db/drizzle.js';
import { ingredientMappings } from '../db/schema/ingredients.js';
import { eq, and, or, inArray, arrayOverlaps, sql } from 'drizzle-orm';
import { CATEGORY_GROUPS, getMajorCategoryGroup, areCategoriesCompatible } from './categoryGroups.js';

export { CATEGORY_GROUPS, getMajorCategoryGroup, areCategoriesCompatible };
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

const cache = new Map<string, IngredientMapping | null>();
const CACHE_MAX_ENTRIES = 5000;
const pendingHits = new Set<string>();
const cacheId = (key: string, cat: string) => `${key.toLowerCase().trim()} ${cat.toUpperCase().trim()}`;

function rowToMapping(row: any): IngredientMapping {
  const conf = row.confidence == null ? null : Number(row.confidence);
  const pkg = (row.typicalPackageAmount ?? row.typical_package_amount) != null
    ? Number(row.typicalPackageAmount ?? row.typical_package_amount)
    : null;
  return {
    mappingKey: row.mappingKey ?? row.mapping_key,
    mappingKeyDe: (row.mappingKeyDe ?? row.mapping_key_de) ?? null,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    category: row.category ?? '',
    productCode: (row.productCode ?? row.product_code) ?? null,
    resolution: (row.resolution === 'no_match' ? 'no_match' : 'matched') as MappingResolution,
    estimatedNutrients: ((row.estimatedNutrients ?? row.estimated_nutrients) as EstimatedNutrients | null) ?? null,
    typicalPackageAmount: Number.isFinite(pkg as number) ? (pkg as number) : null,
    typicalPackageUnit: (row.typicalPackageUnit ?? row.typical_package_unit) ?? null,
    shelfLifeDays: typeof (row.shelfLifeDays ?? row.shelf_life_days) === 'number'
      ? (row.shelfLifeDays ?? row.shelf_life_days)
      : null,
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
  const major = getMajorCategoryGroup(cat);
  const keys = [mapping.mappingKey, mapping.mappingKeyDe, ...(mapping.aliases || [])].filter(
    (k): k is string => Boolean(k && k.length >= 2)
  );
  for (const k of keys) {
    remember(cacheId(k, cat), mapping);
    if (major && major !== cat) {
      remember(cacheId(k, major), mapping);
    }
  }
}

const trackHit = (mapping: IngredientMapping): IngredientMapping => {
  pendingHits.add(mapping.mappingKey);
  return mapping;
};

export async function lookupMapping(keys: string[], category: string): Promise<IngredientMapping | null> {
  const cat = (category || '').toUpperCase().trim();
  const major = getMajorCategoryGroup(cat);
  const unknown: string[] = [];

  for (const key of keys) {
    if (!key) continue;
    if (cat) {
      const exact = cache.get(cacheId(key, cat));
      if (exact && areCategoriesCompatible(cat, exact.category)) return trackHit(exact);
      if (major) {
        const groupHit = cache.get(cacheId(key, major));
        if (groupHit && areCategoriesCompatible(cat, groupHit.category)) return trackHit(groupHit);
      }
    }
    const exactMiss = cache.get(cacheId(key, cat));
    if (exactMiss === undefined) unknown.push(key);
  }

  if (unknown.length === 0) return null;

  let rows: (typeof ingredientMappings.$inferSelect)[] = [];
  try {
    rows = await db
      .select()
      .from(ingredientMappings)
      .where(or(
        inArray(ingredientMappings.mappingKey, unknown),
        inArray(ingredientMappings.mappingKeyDe, unknown),
        arrayOverlaps(ingredientMappings.aliases, unknown)
      ));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[mappingStore] lookup failed, falling through to resolver:', msg);
    return null;
  }

  for (const row of rows) rememberMappingInCache(rowToMapping(row));

  for (const key of keys) {
    if (!key) continue;
    if (cat) {
      const exact = cache.get(cacheId(key, cat));
      if (exact && areCategoriesCompatible(cat, exact.category)) return trackHit(exact);
      if (major) {
        const groupHit = cache.get(cacheId(key, major));
        if (groupHit && areCategoriesCompatible(cat, groupHit.category)) return trackHit(groupHit);
      }
    } else {
      for (const row of rows) {
        const m = rowToMapping(row);
        const rowKeys = [m.mappingKey, m.mappingKeyDe, ...(m.aliases || [])].map((k) => (k || '').toLowerCase().trim());
        if (rowKeys.includes(key.toLowerCase().trim())) {
          return trackHit(m);
        }
      }
    }
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
      const [existingHuman] = await db
        .select({ mappingKey: ingredientMappings.mappingKey })
        .from(ingredientMappings)
        .where(and(
          eq(ingredientMappings.mappingKey, cleanKey),
          eq(ingredientMappings.category, cat),
          eq(ingredientMappings.source, 'human')
        ))
        .limit(1);
      if (existingHuman) return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[mappingStore] human-row check failed, skipping write:', msg);
      return;
    }
  }

  try {
    await db
      .insert(ingredientMappings)
      .values({
        mappingKey: cleanKey,
        mappingKeyDe: cleanKeyDe || null,
        aliases: cleanAliases,
        category: cat,
        productCode: mapping.productCode ?? null,
        resolution: mapping.resolution,
        estimatedNutrients: mapping.estimatedNutrients,
        typicalPackageAmount: mapping.typicalPackageAmount !== undefined && mapping.typicalPackageAmount !== null ? String(mapping.typicalPackageAmount) : null,
        typicalPackageUnit: mapping.typicalPackageUnit ?? null,
        shelfLifeDays: mapping.shelfLifeDays ?? null,
        source: mapping.source,
        confidence: mapping.confidence !== undefined && mapping.confidence !== null ? String(mapping.confidence) : null,
        model: mapping.model,
        reasoning: mapping.reasoning,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [ingredientMappings.mappingKey, ingredientMappings.category],
        set: {
          mappingKeyDe: cleanKeyDe || null,
          aliases: cleanAliases,
          productCode: mapping.productCode ?? null,
          resolution: mapping.resolution,
          estimatedNutrients: mapping.estimatedNutrients,
          typicalPackageAmount: mapping.typicalPackageAmount !== undefined && mapping.typicalPackageAmount !== null ? String(mapping.typicalPackageAmount) : null,
          typicalPackageUnit: mapping.typicalPackageUnit ?? null,
          shelfLifeDays: mapping.shelfLifeDays ?? null,
          source: mapping.source,
          confidence: mapping.confidence !== undefined && mapping.confidence !== null ? String(mapping.confidence) : null,
          model: mapping.model,
          reasoning: mapping.reasoning,
          updatedAt: new Date(),
        },
      });
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
    await getDbPool().query('SELECT bump_ingredient_mapping_hits($1::text[])', [keys]);
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
