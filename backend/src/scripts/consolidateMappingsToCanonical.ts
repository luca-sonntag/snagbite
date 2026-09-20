/**
 * Migration & Consolidation Script:
 * Merges German/English row duplicates in `ingredient_mappings` into canonical 1-row-per-food entries:
 *   - `mapping_key`: Canonical English base name (1:1 matching with WebP icon)
 *   - `mapping_key_de`: Canonical German name
 *   - `aliases`: Array of alternative German and English synonyms
 *
 * Usage:
 *   npx tsx src/scripts/consolidateMappingsToCanonical.ts [--dry-run]
 */

import { getClient } from '../db.js';
import { canonicalizeBaseName } from '../matching/baseNameCanonical.js';

interface RawMappingRow {
  id: string;
  mapping_key: string;
  mapping_key_de?: string | null;
  aliases?: string[] | null;
  category: string;
  product_code: string | null;
  resolution: string;
  estimated_nutrients: unknown;
  typical_package_amount: number | null;
  typical_package_unit: string | null;
  shelf_life_days: number | null;
  source: string;
  confidence: number | null;
  model: string | null;
  reasoning: string | null;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

function isLikelyGerman(word: string): boolean {
  const w = word.toLowerCase();
  if (/[äöüß]/.test(w)) return true;
  if (/(?:fleisch|kohl|zwiebel|wurzel|kartoffel|suppe|kaese|käse|milch|sahne|quark|butter|essig|oel|öl|brot|mehl|schote|blatt|fisch|filet|brust|herz|herzen|zunge|leber|nudel|apfel|staerke|stärke|wuerfel|würfel|pulver)$/.test(w)) return true;
  if (/(?:eln|en)$/.test(w) && w.length > 5 && !w.endsWith('chicken') && !w.endsWith('bacon') && !w.endsWith('onion') && !w.endsWith('salmon')) return true;
  return false;
}

async function run(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`============================================================`);
  console.log(`Consolidate Ingredient Mappings to Canonical 1-Row Model`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no database writes)' : 'LIVE EXECUTION'}`);
  console.log(`============================================================\n`);

  const client = getClient();

  // 1. Verify schema columns exist
  const probe = await client.from('ingredient_mappings').select('mapping_key, mapping_key_de, aliases').limit(1);
  if (probe.error && probe.error.code === '42703') {
    console.error(`❌ Fehler: Die Spalten 'mapping_key_de' oder 'aliases' existieren noch nicht in der Datenbank.`);
    console.error(`Bitte führe zuerst die Migration in 'backend/db/migrations/007_canonical_mappings_aliases.sql' im Supabase SQL Editor aus:`);
    console.error(`\n  ALTER TABLE public.ingredient_mappings\n    ADD COLUMN IF NOT EXISTS mapping_key_de text DEFAULT NULL,\n    ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];\n`);
    process.exit(1);
  }

  // 2. Fetch all mappings
  const { data: rawRows, error } = await client.from('ingredient_mappings').select('*');
  if (error || !rawRows) {
    throw new Error(`Fehler beim Laden von ingredient_mappings: ${error?.message}`);
  }

  const rows = rawRows as RawMappingRow[];
  console.log(`📦 Gefundene Zeilen vor Konsolidierung: ${rows.length}`);

  // 3. Group by distinct food (product_code OR reasoning OR canonical baseName)
  const groups = new Map<string, RawMappingRow[]>();
  for (const r of rows) {
    const code = (r.product_code || '').trim();
    const cat = (r.category || 'OTHER').toUpperCase().trim();
    const groupKey = code ? `OFF:${code}::${cat}` : `EST:${(r.reasoning || r.mapping_key).slice(0, 45)}::${cat}`;

    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(r);
  }

  console.log(`🎯 Echte Lebensmittel-Gruppen identifiziert: ${groups.size}\n`);

  let consolidatedCount = 0;
  let redundantRowsDeleted = 0;

  for (const [groupKey, groupRows] of groups.entries()) {
    // Sort keys: English first, then German
    const allKeys = Array.from(new Set(groupRows.map((r) => r.mapping_key.toLowerCase().trim())));

    const englishCandidates = allKeys.filter((k) => !isLikelyGerman(k));
    const GENERIC_VAGUE = new Set(['heart', 'liver', 'tongue', 'breast', 'thigh', 'wing', 'fillet', 'meat', 'flour', 'oil', 'cheese', 'pasta', 'bread']);
    englishCandidates.sort((a, b) => {
      const aVague = GENERIC_VAGUE.has(a) ? 1 : 0;
      const bVague = GENERIC_VAGUE.has(b) ? 1 : 0;
      if (aVague !== bVague) return aVague - bVague;
      return b.length - a.length;
    });
    let englishKey = englishCandidates[0] || canonicalizeBaseName(allKeys[0]) || allKeys[0];

    const germanCandidates = allKeys.filter((k) => k !== englishKey);
    let germanKey = germanCandidates.find((k) => isLikelyGerman(k)) || germanCandidates[0] || null;

    const aliases = Array.from(
      new Set(
        allKeys.filter((k) => k !== englishKey && k !== germanKey).concat(
          groupRows.flatMap((r) => r.aliases || [])
        )
      )
    ).filter((a) => a !== englishKey && a !== germanKey);

    const bestRow = groupRows.find((r) => r.mapping_key.toLowerCase() === englishKey) || groupRows[0];
    const totalHits = groupRows.reduce((sum, r) => sum + (r.hit_count || 0), 0);
    const maxConfidence = Math.max(...groupRows.map((r) => r.confidence || 0));

    const canonicalRow = {
      mapping_key: englishKey,
      mapping_key_de: germanKey,
      aliases,
      category: bestRow.category || 'OTHER',
      product_code: bestRow.product_code,
      resolution: bestRow.resolution,
      estimated_nutrients: bestRow.estimated_nutrients,
      typical_package_amount: bestRow.typical_package_amount,
      typical_package_unit: bestRow.typical_package_unit,
      shelf_life_days: bestRow.shelf_life_days,
      source: bestRow.source,
      confidence: maxConfidence || bestRow.confidence,
      model: bestRow.model,
      reasoning: bestRow.reasoning,
      hit_count: totalHits,
      updated_at: new Date().toISOString(),
    };

    if (!isDryRun) {
      // Upsert the primary canonical row
      const { error: upsertErr } = await client
        .from('ingredient_mappings')
        .upsert([canonicalRow], { onConflict: 'mapping_key,category' });
      if (upsertErr) console.warn(`Warnung beim Upsert von ${englishKey}:`, upsertErr.message);

      // Delete the redundant non-canonical rows from this group
      const redundantIds = groupRows.filter((r) => r.id !== bestRow.id && r.mapping_key !== englishKey).map((r) => r.id);
      if (redundantIds.length > 0) {
        const { error: delErr } = await client.from('ingredient_mappings').delete().in('id', redundantIds);
        if (!delErr) redundantRowsDeleted += redundantIds.length;
      }
    }

    consolidatedCount++;
  }

  console.log(`============================================================`);
  console.log(`Konsolidierung abgeschlossen:`);
  console.log(`  Kanonische Lebensmittel: ${consolidatedCount}`);
  console.log(`  Redundante Zeilen entfernt: ${redundantRowsDeleted}`);
  console.log(`============================================================`);
}

run().catch((err) => {
  console.error('Fataler Fehler bei der Konsolidierung:', err);
  process.exit(1);
});
