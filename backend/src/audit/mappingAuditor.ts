import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';
import { resolveIngredient } from '../matching/ingredientResolver.js';
import { storeMapping, type EstimatedNutrients } from '../matching/mappingStore.js';
import { recordMappingAudit } from './auditManifest.js';
import { recordAuditSpend } from './budgetTracker.js';
import type { MappingAuditEntry } from './types.js';

export interface AuditMappingRow {
  mapping_key: string;
  category: string;
  product_code?: string | null;
  resolution: string;
  estimated_nutrients?: unknown;
  source?: string;
  confidence?: number | string | null;
  reasoning?: string | null;
}

export interface AuditMappingResult {
  mappingKey: string;
  category: string;
  previousProductCode: string | null;
  updatedProductCode: string | null;
  resolution: 'matched' | 'no_match';
  updatedInDatabase: boolean;
  costUsd: number;
  notes: string;
}

export async function auditSingleMapping(
  row: AuditMappingRow,
  options: { dryRun?: boolean; force?: boolean } = {}
): Promise<AuditMappingResult> {
  const key = (row.mapping_key || '').trim().toLowerCase();
  const category = (row.category || '').trim().toUpperCase();
  const prevCode = row.product_code || null;

  // 1. If product_code exists, verify against local Open Food Facts DB
  if (prevCode) {
    const existingProduct = openFoodFactsAccess.get(prevCode);
    if (existingProduct) {
      const nutrients = existingProduct.nutrients_per_100g;
      const plausible =
        nutrients &&
        nutrients.calories >= 0 &&
        nutrients.calories <= 950 &&
        nutrients.protein + nutrients.carbs + nutrients.fat <= 105;

      if (plausible) {
        const auditEntry: MappingAuditEntry = {
          mappingKey: key,
          category,
          status: 'ai_confirmed',
          auditedAt: new Date().toISOString(),
          productCode: prevCode,
          resolution: 'matched',
          confidence: Number(row.confidence) || 0.95,
          reasoning: `Confirmed existing OFF match: ${existingProduct.name_de || existingProduct.name_en}`,
          notes: 'Plausible nutritional values and valid product code in OFF index.',
        };

        if (!options.dryRun) {
          recordMappingAudit(auditEntry);
        }

        return {
          mappingKey: key,
          category,
          previousProductCode: prevCode,
          updatedProductCode: prevCode,
          resolution: 'matched',
          updatedInDatabase: false,
          costUsd: 0,
          notes: 'Existing mapping confirmed plausible.',
        };
      }
    }
  }

  // 2. Perform intelligent re-search in Open Food Facts via resolver
  let costUsd = 0;
  let newProductCode: string | null = null;
  let newResolution: 'matched' | 'no_match' = 'no_match';
  let estimatedNutrients: EstimatedNutrients | null = null;
  let reasoning = 'Audited via Open Food Facts search';

  // Quick offline FTS check first
  const fastHits = openFoodFactsAccess.search(key, category, 1);
  if (fastHits.length > 0) {
    const topHit = fastHits[0];
    newProductCode = topHit.product_code || topHit.id;
    newResolution = 'matched';
    reasoning = `Matched to ${topHit.name_de || topHit.name_en} via local OFF index search`;
  } else {
    // Multi-turn Gemini Tool resolver for difficult / translated terms
    const resolved = await resolveIngredient(
      {
        name: key,
        baseName: key,
        category,
      },
      openFoodFactsAccess
    );

    const usageCost = resolved?.usage?.costEstimate?.totalCostUsd;
    if (typeof usageCost === 'number' && usageCost > 0) {
      costUsd = Number(usageCost.toFixed(6));
      recordAuditSpend({ geminiCostUsd: costUsd });
    }

    if (resolved?.productCode) {
      newProductCode = resolved.productCode;
      newResolution = 'matched';
      reasoning = resolved.reasoning || 'Matched via Gemini OFF resolver';
    } else {
      newResolution = 'no_match';
      estimatedNutrients = resolved?.estimatedNutrients ?? (row.estimated_nutrients as EstimatedNutrients) ?? null;
      reasoning = resolved?.reasoning || 'No matching Open Food Facts product found; confirmed no_match';
    }
  }

  let updatedInDatabase = false;
  if (!options.dryRun && (newProductCode !== prevCode || newResolution !== row.resolution)) {
    await storeMapping([key], category, {
      productCode: newProductCode,
      resolution: newResolution,
      estimatedNutrients,
      source: 'agent',
      confidence: 0.9,
      model: 'gemini-audit-pipeline',
      reasoning,
    });
    updatedInDatabase = true;
  }

  const auditEntry: MappingAuditEntry = {
    mappingKey: key,
    category,
    status: 'ai_confirmed',
    auditedAt: new Date().toISOString(),
    productCode: newProductCode,
    resolution: newResolution,
    confidence: 0.9,
    reasoning,
    notes: updatedInDatabase ? 'Mapping updated in database during audit' : 'Mapping verified',
  };

  if (!options.dryRun) {
    recordMappingAudit(auditEntry);
  }

  return {
    mappingKey: key,
    category,
    previousProductCode: prevCode,
    updatedProductCode: newProductCode,
    resolution: newResolution,
    updatedInDatabase,
    costUsd,
    notes: reasoning,
  };
}
