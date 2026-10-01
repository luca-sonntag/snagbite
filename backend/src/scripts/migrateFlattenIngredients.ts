/**
 * Data Migration Script: Flatten Recipe Ingredients
 *
 * Migrates existing recipes in the database from nested groups:
 *   [ { name: "Sauce", items: [ Ingredient, ... ] } ]
 * to flat:
 *   [ Ingredient (with optional section: "Sauce"), ... ]
 *
 * Usage:
 *   npx tsx src/scripts/migrateFlattenIngredients.ts [--dry-run] [--prod|--dev]
 */

import { getClient } from '../db.js';
import { initScriptEnv } from './scriptEnv.js';

interface RawIngredientItem {
  id?: string;
  name?: string;
  amount?: number | null;
  unit?: string | null;
  originalText?: string;
  section?: string | null;
  category?: string | null;
  [key: string]: unknown;
}

interface RawIngredientGroup {
  name?: string;
  items?: RawIngredientItem[];
  [key: string]: unknown;
}

const GENERIC_SECTIONS = new Set([
  'ingredients',
  'zutaten',
  'hauptzutaten',
  'default',
  'allgemein',
  'basis',
  'general',
  'main',
]);

export function isNestedGroupFormat(raw: unknown): raw is RawIngredientGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  const first = raw[0];
  return (
    typeof first === 'object' &&
    first !== null &&
    'items' in first &&
    Array.isArray((first as RawIngredientGroup).items)
  );
}

export function flattenIngredients(groups: RawIngredientGroup[]): RawIngredientItem[] {
  const result: RawIngredientItem[] = [];

  for (const group of groups) {
    const rawGroupName = typeof group.name === 'string' ? group.name.trim() : '';
    const isInformativeSection =
      rawGroupName.length > 0 && !GENERIC_SECTIONS.has(rawGroupName.toLowerCase());
    const sectionName = isInformativeSection ? rawGroupName : undefined;

    const items = Array.isArray(group.items) ? group.items : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const flatItem: RawIngredientItem = { ...item };
      if (sectionName && !flatItem.section) {
        flatItem.section = sectionName;
      }
      result.push(flatItem);
    }
  }

  return result;
}

async function run(): Promise<void> {
  const scriptEnv = initScriptEnv();
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`============================================================`);
  console.log(`Data Migration: Flatten Recipe Ingredients`);
  console.log(`Target: ${scriptEnv.target.toUpperCase()} (${scriptEnv.supabaseUrl})`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no database writes)' : 'LIVE EXECUTION'}`);
  console.log(`============================================================\n`);

  const client = getClient();

  // Test table existence
  const { data: probe, error: probeError } = await client
    .from('recipes')
    .select('id')
    .limit(1);

  if (probeError) {
    console.error('❌ Could not query public.recipes table:', probeError.message);
    process.exit(1);
  }

  let from = 0;
  const pageSize = 100;
  let scanned = 0;
  let alreadyFlat = 0;
  let migrated = 0;
  let empty = 0;
  let failed = 0;

  for (;;) {
    const { data: rows, error } = await client
      .from('recipes')
      .select('id, title, ingredients')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`❌ Failed to fetch page at offset ${from}:`, error.message);
      break;
    }

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const raw = row.ingredients;

      if (!Array.isArray(raw) || raw.length === 0) {
        empty++;
        continue;
      }

      if (!isNestedGroupFormat(raw)) {
        alreadyFlat++;
        continue;
      }

      const flattened = flattenIngredients(raw);
      console.log(
        `🔄 [${row.id.slice(0, 8)}] "${row.title || 'Untitled'}": ${raw.length} group(s) -> ${flattened.length} flat item(s)`
      );

      if (!isDryRun) {
        const { error: updateError } = await client
          .from('recipes')
          .update({
            ingredients: flattened,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (updateError) {
          console.error(`  ❌ Update failed for ${row.id}:`, updateError.message);
          failed++;
        } else {
          migrated++;
        }
      } else {
        migrated++;
      }
    }

    from += pageSize;
  }

  console.log(`\n============================================================`);
  console.log(`Migration Summary:`);
  console.log(`  Scanned total:   ${scanned}`);
  console.log(`  Already flat:    ${alreadyFlat}`);
  console.log(`  Migrated:        ${migrated} ${isDryRun ? '(simulated)' : ''}`);
  console.log(`  Empty/no items:  ${empty}`);
  console.log(`  Failed updates:  ${failed}`);
  console.log(`============================================================`);
}

// Run if executed directly
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('migrateFlattenIngredients.ts') ||
    process.argv[1].endsWith('migrateFlattenIngredients.js'));

if (isDirectExecution) {
  run().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}
