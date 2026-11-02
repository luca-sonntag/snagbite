/**
 * Backfill & Data Hygiene: Clean Corrupt Ingredient Mappings & Backfill Packaging Types
 *
 * 1. Poisoned Aliases:
 *    Removes whole produce names ('zitrone', 'lemon', 'orange', 'apfel', 'apple',
 *    'knoblauch', 'garlic', etc.) from liquid/volume products (e.g. Zitronensaft 200ml).
 *
 * 2. Conflicting no_match Staples:
 *    Cleans bogus no_match rows where a valid matched staple product exists in Open Food Facts.
 *
 * 3. Packaging Type Backfill:
 *    Populates the new packaging_type column for existing ingredient mappings based on
 *    unit dimensions and category.
 *
 * Usage:
 *   npx tsx src/scripts/backfill/cleanCorruptIngredientMappings.ts [--dry-run]
 *   npx tsx src/scripts/backfill/cleanCorruptIngredientMappings.ts --apply
 *   npx tsx src/scripts/backfill/cleanCorruptIngredientMappings.ts --prod --dry-run
 *   npx tsx src/scripts/backfill/cleanCorruptIngredientMappings.ts --prod --apply
 */

import { db, getDbPool } from '../../db/drizzle.js';
import { ingredientMappings } from '../../db/schema/ingredients.js';
import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { initScriptEnv } from '../scriptEnv.js';
import { getUnitDimension, type PackagingType } from '@cookbook/shared';
import { openFoodFactsAccess } from '../../matching/openFoodFactsIndex.js';

const scriptEnv = initScriptEnv();
const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

const FRESH_PRODUCE_TERMS = new Set([
  'zitrone', 'lemon', 'limette', 'lime', 'orange', 'apfel', 'apple',
  'knoblauch', 'garlic', 'knoblauchzehe', 'zwiebel', 'onion', 'ingwer', 'ginger',
]);

const FRESH_PRODUCE_CATEGORIES = new Set([
  'PRODUCE', 'VEGETABLES', 'FRUITS', 'FRUITS_VEGETABLES', 'HERBS',
  'GEMÜSE', 'OBST', 'OBST & GEMÜSE',
]);

function inferPackagingType(unit: string | null | undefined, category: string, key?: string): PackagingType | null {
  const normCat = category.toUpperCase().trim();
  const normUnit = (unit || '').toLowerCase().trim();
  const normKey = (key || '').toLowerCase().trim();

  if (normUnit === 'glas' || normUnit === 'jar' || normKey.includes('in glas')) return 'jar';
  if (normUnit === 'dose' || normUnit === 'can' || normKey.includes('canned') || normKey.includes('dosentomate') || normKey.includes('konserve')) return 'can';
  if (normUnit === 'flasche' || normUnit === 'bottle') return 'bottle';
  if (normUnit === 'becher' || normUnit === 'tub') return 'tub';
  if (normUnit === 'bund' || normUnit === 'bunch') return 'bunch';
  if (normUnit === 'beutel' || normUnit === 'bag') return 'bag';
  if (normUnit === 'schachtel' || normUnit === 'box') return 'box';
  if (normUnit === 'packung' || normUnit === 'pkg' || normUnit === 'pack') return 'pack';
  if (normUnit === 'stück' || normUnit === 'piece') {
    if (FRESH_PRODUCE_CATEGORIES.has(normCat)) return 'loose';
    return 'piece';
  }

  if (FRESH_PRODUCE_CATEGORIES.has(normCat)) {
    if (!normUnit || getUnitDimension(normUnit) === 'count') {
      return 'loose';
    }
  }

  return null;
}

export async function runCleanMappings(): Promise<{
  scanned: number;
  aliasesCleaned: number;
  noMatchCleaned: number;
  packagingTypesBackfilled: number;
}> {
  console.log(`[cleanCorruptIngredientMappings] Running on target: ${scriptEnv.target.toUpperCase()} (mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'})`);

  const allRows = await db.select().from(ingredientMappings);
  let scanned = 0;
  let aliasesCleaned = 0;
  let noMatchCleaned = 0;
  let packagingTypesBackfilled = 0;

  for (const row of allRows) {
    scanned++;
    const cat = (row.category || '').toUpperCase().trim();
    const pkgUnit = (row.typicalPackageUnit || '').toLowerCase().trim();
    const isVolume = getUnitDimension(pkgUnit) === 'volume';

    // 1. Poisoned Aliases Check on volume packages
    let updatedAliases = [...(row.aliases || [])];
    let aliasesModified = false;

    if (isVolume && updatedAliases.length > 0) {
      const filtered = updatedAliases.filter(alias => !FRESH_PRODUCE_TERMS.has(alias.toLowerCase().trim()));
      if (filtered.length !== updatedAliases.length) {
        console.log(`  🧹 [Row ${row.id}] "${row.mappingKey}": removed fresh produce aliases from volume product (${pkgUnit})`);
        updatedAliases = filtered;
        aliasesModified = true;
        aliasesCleaned++;
      }
    }

    // 2. Packaging Type Backfill & Single Piece Produce Weight Correction
    let targetPackagingType = row.packagingType as PackagingType | null;
    let targetPackageAmount = row.typicalPackageAmount;
    let targetPackageUnit = row.typicalPackageUnit;
    let packagingModified = false;

    // Single produce piece weight correction (e.g. lemon 100g, banana 150g, garlic 40g, onion 100g)
    const isSingleProduceStaple =
      FRESH_PRODUCE_CATEGORIES.has(cat) &&
      FRESH_PRODUCE_TERMS.has((row.mappingKey || '').toLowerCase().trim());

    if (isSingleProduceStaple && pkgUnit === 'g' && Number(row.typicalPackageAmount) <= 250) {
      console.log(`  🍋 [Row ${row.id}] "${row.mappingKey}": converted single piece weight (${row.typicalPackageAmount}g) to loose produce`);
      targetPackagingType = 'loose';
      targetPackageAmount = null;
      targetPackageUnit = null;
      packagingModified = true;
      packagingTypesBackfilled++;
    } else if (!targetPackagingType) {
      const inferred = inferPackagingType(row.typicalPackageUnit, cat, row.mappingKey);
      if (inferred) {
        targetPackagingType = inferred;
        packagingModified = true;
        packagingTypesBackfilled++;
      }
    }

    // Apply updates if modified
    if ((aliasesModified || packagingModified) && !isDryRun) {
      await db
        .update(ingredientMappings)
        .set({
          aliases: updatedAliases,
          packagingType: targetPackagingType,
          typicalPackageAmount: targetPackageAmount,
          typicalPackageUnit: targetPackageUnit,
          updatedAt: new Date(),
        })
        .where(eq(ingredientMappings.id, row.id));
    }

    // 3. Bogus no_match staple check: any staple with resolution = 'no_match' and no productCode
    // where OFF actually has plain grocery matches or another matched category exists
    if (row.resolution === 'no_match' && !row.productCode) {
      const cleanKey = (row.mappingKey || '').toLowerCase().trim();
      const isKnownStapleTerm =
        FRESH_PRODUCE_TERMS.has(cleanKey) ||
        ['rolled oat', 'rolled oats', 'fish stick', 'fish fingers', 'olive oil', 'cooking oil', 'egg', 'butter', 'milk', 'flour', 'sugar'].includes(cleanKey);

      const hasMatchedTwin = allRows.some(
        (other) =>
          other.id !== row.id &&
          (other.mappingKey || '').toLowerCase().trim() === cleanKey &&
          other.resolution === 'matched' &&
          Boolean(other.productCode)
      );

      const offHits = isKnownStapleTerm ? openFoodFactsAccess.search(row.mappingKey, row.category, 1) : [];

      if (hasMatchedTwin || offHits.length > 0) {
        console.log(`  🗑️ [Row ${row.id}] Removing bogus no_match for staple "${row.mappingKey}" in ${cat}`);
        noMatchCleaned++;
        if (!isDryRun) {
          await db.delete(ingredientMappings).where(eq(ingredientMappings.id, row.id));
        }
      }
    }
  }

  console.log(`\n============================================================`);
  console.log(`Clean Mappings Summary (${isDryRun ? 'SIMULATION' : 'APPLIED'}):`);
  console.log(`  Scanned mappings:           ${scanned}`);
  console.log(`  Poisoned aliases cleaned:   ${aliasesCleaned}`);
  console.log(`  Bogus no_match removed:     ${noMatchCleaned}`);
  console.log(`  Packaging types backfilled: ${packagingTypesBackfilled}`);
  console.log(`============================================================`);

  return { scanned, aliasesCleaned, noMatchCleaned, packagingTypesBackfilled };
}

// Direct execution
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('cleanCorruptIngredientMappings.ts') ||
    process.argv[1].endsWith('cleanCorruptIngredientMappings.js'));

if (isDirectExecution) {
  runCleanMappings()
    .then(async () => {
      try {
        await getDbPool().end();
      } catch {}
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Fatal error during clean mappings:', err);
      try {
        await getDbPool().end();
      } catch {}
      process.exit(1);
    });
}
