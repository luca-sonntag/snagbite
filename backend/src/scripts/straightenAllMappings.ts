/**
 * Straighten & Disambiguate Ingredient Mappings
 *
 * 1. Renames ambiguous anatomical body parts to specific food items (e.g. "heart" -> "chicken heart").
 * 2. Translates any residual German mapping_keys to proper English canonical keys.
 * 3. Merges duplicates into existing English canonical keys when present.
 *
 * Usage:
 *   npx tsx src/scripts/straightenAllMappings.ts [--dry-run]
 */

import { getClient } from '../db.js';

interface TranslationRule {
  germanKey: string;
  englishKey: string;
  germanKeyDe?: string;
  additionalAliases?: string[];
}

const STRAIGHTEN_RULES: TranslationRule[] = [
  // Ambiguous body parts & generic nouns -> specific foods
  { germanKey: 'heart', englishKey: 'chicken heart', germanKeyDe: 'hähnchenherzen', additionalAliases: ['hähnchenherze', 'chicken hearts'] },
  { germanKey: 'tongue', englishKey: 'beef tongue', germanKeyDe: 'rinderzunge', additionalAliases: ['ochsenzunge', 'beef tongues'] },
  { germanKey: 'breast', englishKey: 'turkey breast', germanKeyDe: 'putenbrust', additionalAliases: ['truthahnbrust', 'turkey breasts'] },
  { germanKey: 'liver', englishKey: 'veal liver', germanKeyDe: 'kalbsleber', additionalAliases: ['rinderleber', 'calf liver'] },
  { germanKey: 'flour', englishKey: 'spelt flour', germanKeyDe: 'dinkelmehl', additionalAliases: ['dinkelvollkornmehl'] },
  { germanKey: 'pasta', englishKey: 'whole grain pasta', germanKeyDe: 'vollkornnudel', additionalAliases: ['vollkornpasta'] },
  { germanKey: 'oil', englishKey: 'vegetable oil', germanKeyDe: 'pflanzenöl', additionalAliases: ['pflanzliches speiseöl'] },

  // German mapping_keys -> English canonical keys
  { germanKey: 'erdapfel', englishKey: 'potato', germanKeyDe: 'kartoffel', additionalAliases: ['erdapfel', 'potatoes'] },
  { germanKey: 'olivenöl', englishKey: 'olive oil', germanKeyDe: 'olivenöl', additionalAliases: ['nativ extra olivenöl'] },
  { germanKey: 'kräuterbutter', englishKey: 'herb butter', germanKeyDe: 'kräuterbutter', additionalAliases: ['gewürzbutter'] },
  { germanKey: 'gewürzbutter', englishKey: 'herb butter', germanKeyDe: 'kräuterbutter', additionalAliases: ['gewürzbutter'] },
  { germanKey: 'compound butter', englishKey: 'herb butter', germanKeyDe: 'kräuterbutter', additionalAliases: ['compound butter'] },
  { germanKey: 'mexikanischer frischkäse', englishKey: 'queso fresco', germanKeyDe: 'mexikanischer frischkäse', additionalAliases: ['mexican fresh cheese'] },
  { germanKey: 'speisequark mit kräutern', englishKey: 'herb quark', germanKeyDe: 'kräuterquark', additionalAliases: ['speisequark mit kräutern'] },
  { germanKey: 'kräuterquark', englishKey: 'herb quark', germanKeyDe: 'kräuterquark', additionalAliases: ['speisequark mit kräutern'] },
  { germanKey: 'niederländischer käse', englishKey: 'edam cheese', germanKeyDe: 'edamer', additionalAliases: ['niederländischer käse', 'edam'] },
  { germanKey: 'mandelmehl', englishKey: 'almond flour', germanKeyDe: 'mandelmehl', additionalAliases: ['gemahlene mandeln'] },
  { germanKey: 'arganöl', englishKey: 'argan oil', germanKeyDe: 'arganöl', additionalAliases: ['marokkanisches arganöl'] },
  { germanKey: 'trüffelcreme', englishKey: 'truffle cream', germanKeyDe: 'trüffelcreme', additionalAliases: ['crema di tartufo'] },
  { germanKey: 'kapernäpfel', englishKey: 'caper berries', germanKeyDe: 'kapernäpfel', additionalAliases: ['kapernbeeren'] },
  { germanKey: 'hartkäse', englishKey: 'hard cheese', germanKeyDe: 'hartkäse', additionalAliases: ['reibehartkäse'] },
  { germanKey: 'tapiokastärke', englishKey: 'tapioca starch', germanKeyDe: 'tapiokastärke', additionalAliases: ['tapiokamehl'] },
  { germanKey: 'brühwürfel', englishKey: 'bouillon cube', germanKeyDe: 'brühwürfel', additionalAliases: ['suppenwürfel'] },
  { germanKey: 'schafskäse', englishKey: 'feta cheese', germanKeyDe: 'schafskäse', additionalAliases: ['feta'] },
  { germanKey: 'rotschimmelkäse', englishKey: 'taleggio cheese', germanKeyDe: 'rotschimmelkäse', additionalAliases: ['taleggio'] },
  { germanKey: 'speisequark', englishKey: 'quark', germanKeyDe: 'speisequark', additionalAliases: ['magerquark'] },
];

async function run(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`============================================================`);
  console.log(`Straighten & Disambiguate Ingredient Mappings`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'}`);
  console.log(`============================================================\n`);

  const client = getClient();
  let updatedCount = 0;
  let mergedCount = 0;

  for (const rule of STRAIGHTEN_RULES) {
    const { data: currentRows } = await client
      .from('ingredient_mappings')
      .select('*')
      .eq('mapping_key', rule.germanKey);

    if (!currentRows || currentRows.length === 0) continue;

    for (const row of currentRows) {
      const cat = row.category || 'OTHER';

      // Check if target English key already exists in the same category
      const { data: existingTarget } = await client
        .from('ingredient_mappings')
        .select('*')
        .eq('mapping_key', rule.englishKey)
        .eq('category', cat)
        .maybeSingle();

      if (existingTarget) {
        // Merge aliases into the existing English row and remove the German row
        const mergedAliases = Array.from(
          new Set([
            ...(existingTarget.aliases || []),
            rule.germanKey,
            rule.germanKeyDe || rule.germanKey,
            ...(rule.additionalAliases || []),
            ...(row.aliases || []),
          ])
        ).filter((a) => a !== existingTarget.mapping_key && a !== existingTarget.mapping_key_de);

        if (!isDryRun) {
          await client
            .from('ingredient_mappings')
            .update({
              aliases: mergedAliases,
              mapping_key_de: existingTarget.mapping_key_de || rule.germanKeyDe || rule.germanKey,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingTarget.id);

          await client.from('ingredient_mappings').delete().eq('id', row.id);
        }

        console.log(`🔀 Merged '${rule.germanKey}' into existing '${rule.englishKey}' (deleted duplicate row)`);
        mergedCount++;
      } else {
        // Rename in-place
        const newAliases = Array.from(
          new Set([
            rule.germanKey,
            ...(rule.additionalAliases || []),
            ...(row.aliases || []),
          ])
        ).filter((a) => a !== rule.englishKey && a !== rule.germanKeyDe);

        if (!isDryRun) {
          await client
            .from('ingredient_mappings')
            .update({
              mapping_key: rule.englishKey,
              mapping_key_de: rule.germanKeyDe || row.mapping_key_de || rule.germanKey,
              aliases: newAliases,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);
        }

        console.log(`✏️  Straightened '${rule.germanKey}' -> '${rule.englishKey}' (DE: ${rule.germanKeyDe || rule.germanKey})`);
        updatedCount++;
      }
    }
  }

  console.log(`\n============================================================`);
  console.log(`Fertig!`);
  console.log(`  Umgewandelt / Geradegezogen: ${updatedCount}`);
  console.log(`  In bestehendes English-Mapping gemergt: ${mergedCount}`);
  console.log(`============================================================`);
}

run().catch((err) => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
