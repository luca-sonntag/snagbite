/**
 * Backfill: cleans legacy supermarket department and category names from recipe ingredient and instruction sections.
 *
 * Historically, when ingredient category groups (e.g. VEGETABLES, DAIRY_EGGS) were flattened,
 * group names were copied into item.section. This caused the UI to treat grocery departments as
 * culinary recipe components ("FÜR VEGETABLES", "FÜR DAIRY_EGGS").
 *
 * This script scans recipes in the database, runs sanitizeSectionName on every ingredient and instruction step,
 * and updates rows where section names were cleansed.
 *
 * Usage:
 *   npx tsx src/scripts/backfill/cleanLegacyIngredientSections.ts [--dev]
 *   npx tsx src/scripts/backfill/cleanLegacyIngredientSections.ts --dry-run
 *   npx tsx src/scripts/backfill/cleanLegacyIngredientSections.ts --prod
 *   npx tsx src/scripts/backfill/cleanLegacyIngredientSections.ts --prod --dry-run
 */
import { db } from '../../db/drizzle.js';
import { recipes } from '../../db/schema/recipes.js';
import { asc, eq } from 'drizzle-orm';
import { sanitizeSectionName } from '@cookbook/shared';
import { initScriptEnv } from '../scriptEnv.js';
import type { Recipe } from '../../types.js';

const scriptEnv = initScriptEnv();
const isProd = scriptEnv.isProd;
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

const PAGE_SIZE = 100;

function cleanIngredients(raw: unknown): { cleaned: unknown; changed: boolean } {
  if (!Array.isArray(raw)) return { cleaned: raw, changed: false };

  // Case 1: Legacy grouped array [{ name: "VEGETABLES", items: [...] }]
  if (raw.length > 0 && raw[0] && typeof raw[0] === 'object' && Array.isArray((raw[0] as { items?: unknown }).items)) {
    const flatItems: Recipe['ingredients'] = [];
    for (const group of raw as Array<{ name?: string; items?: Array<Record<string, unknown>> }>) {
      const groupSection = sanitizeSectionName(group.name);
      for (const item of group.items || []) {
        const itemCat = typeof item.category === 'string' ? item.category : undefined;
        const itemSec = typeof item.section === 'string' ? item.section : undefined;
        const cleanSection = sanitizeSectionName(itemSec, itemCat) ?? groupSection;
        const cleanedItem = { ...item };
        if (cleanSection) {
          cleanedItem.section = cleanSection;
        } else {
          delete cleanedItem.section;
        }
        flatItems.push(cleanedItem as unknown as Recipe['ingredients'][number]);
      }
    }
    return { cleaned: flatItems, changed: true };
  }

  // Case 2: Flat array of ingredients
  let changed = false;
  const cleanedList = (raw as Array<Record<string, unknown>>).map((item) => {
    if (!item || typeof item !== 'object') return item;
    const itemCat = typeof item.category === 'string' ? item.category : undefined;
    const itemSec = typeof item.section === 'string' ? item.section : undefined;
    const cleanSec = sanitizeSectionName(itemSec, itemCat);

    if (cleanSec !== itemSec) {
      changed = true;
      const copy = { ...item };
      if (cleanSec) {
        copy.section = cleanSec;
      } else {
        delete copy.section;
      }
      return copy;
    }
    return item;
  });

  return { cleaned: cleanedList, changed };
}

function cleanInstructions(raw: unknown): { cleaned: unknown; changed: boolean } {
  if (!Array.isArray(raw)) return { cleaned: raw, changed: false };

  let changed = false;
  const cleanedList = (raw as Array<Record<string, unknown>>).map((step) => {
    if (!step || typeof step !== 'object') return step;
    const stepSec = typeof step.section === 'string' ? step.section : undefined;
    const cleanSec = sanitizeSectionName(stepSec);

    if (cleanSec !== stepSec) {
      changed = true;
      const copy = { ...step };
      if (cleanSec) {
        copy.section = cleanSec;
      } else {
        delete copy.section;
      }
      return copy;
    }
    return step;
  });

  return { cleaned: cleanedList, changed };
}

async function main(): Promise<void> {
  console.log(`============================================================`);
  console.log(`Clean Legacy Ingredient & Instruction Sections`);
  console.log(`Target:  ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`Mode:    ${DRY_RUN ? 'DRY-RUN (no database writes)' : 'LIVE EXECUTION'}`);
  console.log(`============================================================\n`);

  let offset = 0;
  let scanned = 0;
  let updated = 0;

  for (;;) {
    const rows = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        ingredients: recipes.ingredients,
        instructions: recipes.instructions,
      })
      .from(recipes)
      .orderBy(asc(recipes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const ingResult = cleanIngredients(row.ingredients);
      const instResult = cleanInstructions(row.instructions);

      if (ingResult.changed || instResult.changed) {
        updated++;
        console.log(`[${updated}] Recipe "${row.title}" (${row.id}) had legacy sections cleaned.`);

        if (!DRY_RUN) {
          await db
            .update(recipes)
            .set({
              ingredients: ingResult.cleaned as any,
              instructions: instResult.cleaned as any,
              updatedAt: new Date(),
            })
            .where(eq(recipes.id, row.id));
        }
      }
    }

    offset += rows.length;
  }

  console.log(`\n============================================================`);
  console.log(`Summary:`);
  console.log(`  Total scanned:  ${scanned}`);
  console.log(`  Total updated:  ${updated}`);
  console.log(`  Unchanged:      ${scanned - updated}`);
  console.log(`============================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
