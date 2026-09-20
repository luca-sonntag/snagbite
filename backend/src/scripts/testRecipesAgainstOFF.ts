/**
 * Test: Evaluate 10 DEV Database Recipes against the Local Open Food Facts (OFF) Database
 *
 * Usage:
 *   npx tsx src/scripts/testRecipesAgainstOFF.ts [--limit=10]
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { getClient } from '../db/client.js';
import { canonicalizeBaseName } from '../matching/baseNameCanonical.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/off_de.sqlite');

interface OFFHit {
  code: string;
  name: string;
  generic_name: string | null;
  brand: string | null;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unique_scans: number;
}

function cleanQueryForFTS(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .join(' ');
}

function flattenIngredients(raw: any[]): any[] {
  if (!Array.isArray(raw)) return [];
  const result: any[] = [];
  for (const entry of raw) {
    if (entry && Array.isArray(entry.items)) {
      for (const item of entry.items) {
        result.push(item);
      }
    } else if (entry && (entry.name || entry.raw)) {
      result.push(entry);
    }
  }
  return result;
}

class OFFCatalogue {
  private db: DatabaseSync;
  private searchStmt: any;

  constructor(dbPath: string) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`OFF SQLite database not found at ${dbPath}. Run 'npm run build:off' first.`);
    }
    this.db = new DatabaseSync(dbPath, { readOnly: true });
    this.searchStmt = this.db.prepare(`
      SELECT p.code, p.name, p.generic_name, p.brand, p.category,
             p.calories, p.protein, p.carbs, p.fat, p.unique_scans, p.nova_group, p.ingredients_count,
             (bm25(products_fts, 10.0, 4.0, 2.0, 1.0) / (0.5 + COALESCE(p.nova_group, 2) * 0.4 + MIN(COALESCE(p.ingredients_count, 1), 10) * 0.05)) AS rank
      FROM products_fts f
      JOIN products p ON f.rowid = p.id
      WHERE products_fts MATCH ?
      ORDER BY rank ASC, p.unique_scans DESC
      LIMIT ?;
    `);
  }

  public search(rawTerm: string, limit = 1): OFFHit[] {
    const cleaned = cleanQueryForFTS(rawTerm);
    if (!cleaned) return [];

    const words = cleaned.split(' ');

    // 1. Try EXACT word match (e.g. "Salz", "Ei", "Zwiebel")
    const exactQuery = words.map(w => `"${w}"`).join(' ');
    try {
      const hits = this.searchStmt.all(exactQuery, limit) as OFFHit[];
      if (hits.length > 0) return hits;
    } catch {
      // ignore
    }

    // 2. Try prefix query for longer words (length >= 4)
    const ftsQuery = words.map(w => (w.length >= 4 ? `"${w}"*` : `"${w}"`)).join(' ');
    try {
      const hits = this.searchStmt.all(ftsQuery, limit) as OFFHit[];
      if (hits.length > 0) return hits;
    } catch {
      // ignore
    }

    // 3. Fallback: try individual words with OR
    if (words.length > 1) {
      try {
        const orQuery = words.map(w => (w.length >= 4 ? `"${w}"*` : `"${w}"`)).join(' OR ');
        const hits = this.searchStmt.all(orQuery, limit) as OFFHit[];
        if (hits.length > 0) return hits;
      } catch {
        // ignore
      }
    }

    return [];
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(75));
  console.log('🧪 Testing 10 DEV Database Recipes against Local Open Food Facts Index');
  console.log('='.repeat(75) + '\n');

  const catalogue = new OFFCatalogue(DB_PATH);
  const supabase = getClient();

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, ingredients')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !recipes || recipes.length === 0) {
    console.error('❌ Failed to fetch recipes from DEV DB:', error);
    process.exit(1);
  }

  console.log(`Fetched ${recipes.length} recipes from DEV database.\n`);

  let totalIngredients = 0;
  let matchedIngredients = 0;
  let totalDurationMs = 0;

  for (let rIdx = 0; rIdx < recipes.length; rIdx++) {
    const recipe = recipes[rIdx];
    const rawIngs = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const ingredients = flattenIngredients(rawIngs);

    console.log(`📖 Recipe [${rIdx + 1}/${recipes.length}]: "${recipe.title}" (${ingredients.length} Zutaten)`);
    console.log('-'.repeat(75));

    for (let iIdx = 0; iIdx < ingredients.length; iIdx++) {
      const ing = ingredients[iIdx];
      const name = ing.name || ing.raw || 'Unbekannt';
      const baseName = ing.baseName ? canonicalizeBaseName(ing.baseName) : null;
      totalIngredients++;

      const t0 = performance.now();
      let hits = baseName ? catalogue.search(baseName, 1) : [];
      if (hits.length === 0) {
        hits = catalogue.search(name, 1);
      }
      const dur = performance.now() - t0;
      totalDurationMs += dur;

      if (hits.length > 0) {
        matchedIngredients++;
        const hit = hits[0];
        const brand = hit.brand ? ` [${hit.brand}]` : '';
        console.log(
          `   ✓ "${name}" -> "${hit.name}"${brand}\n` +
          `       100g: ${hit.calories} kcal | ${hit.protein}g P | ${hit.carbs}g C | ${hit.fat}g F | ⏱️ ${dur.toFixed(2)}ms`
        );
      } else {
        console.log(`   ❌ "${name}" -> Keine Treffer in OFF | ⏱️ ${dur.toFixed(2)}ms`);
      }
    }
    console.log();
  }

  const hitRate = ((matchedIngredients / totalIngredients) * 100).toFixed(1);
  const avgLatency = (totalDurationMs / totalIngredients).toFixed(3);

  console.log('='.repeat(75));
  console.log('📊 Auswertung & Statistik:');
  console.log(`  Rezepte getestet:        ${recipes.length}`);
  console.log(`  Zutaten gesamt:          ${totalIngredients}`);
  console.log(`  Treffer in OFF:          ${matchedIngredients} von ${totalIngredients} (${hitRate} %)`);
  console.log(`  Durchschnittliche Suche: ${avgLatency} ms pro Zutat (In-Memory SQLite)`);
  console.log('='.repeat(75));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
