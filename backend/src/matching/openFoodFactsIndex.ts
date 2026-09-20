/**
 * Open Food Facts Local SQLite Index (Replacing BLS 4.0)
 *
 * Provides high-speed (<1ms) in-memory SQLite FTS5 search with BM25
 * and Purity-Boost ranking across 438,000+ German/DACH supermarket, brand,
 * and staple foods.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { CatalogueAccess } from './ingredientResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDBPath(): string {
  const candidates = [
    path.resolve(__dirname, '../data/off_de.sqlite'),
    path.resolve(__dirname, '../../src/data/off_de.sqlite'),
    path.resolve(__dirname, '../../dist/data/off_de.sqlite'),
    path.resolve(process.cwd(), 'backend/dist/data/off_de.sqlite'),
    path.resolve(process.cwd(), 'backend/src/data/off_de.sqlite'),
    path.resolve(process.cwd(), 'dist/data/off_de.sqlite'),
    path.resolve(process.cwd(), 'src/data/off_de.sqlite'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

interface OFFRow {
  id: number;
  code: string | null;
  name: string;
  generic_name: string | null;
  brand: string | null;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number | null;
  fiber: number | null;
  nova_group: number | null;
  ingredients_count: number | null;
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

function rowToCanonicalIngredient(row: OFFRow): CanonicalIngredient {
  const code = row.code || `off_${row.id}`;
  const brandSuffix = row.brand ? ` [${row.brand}]` : '';

  return {
    id: code,
    product_code: code,
    name_de: `${row.name}${brandSuffix}`,
    name_en: row.generic_name || row.name,
    category: row.category || 'OTHER',
    nutrients_per_100g: {
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      fiber: row.fiber || 0,
      sugar: row.sugar ?? undefined,
      nova_group: row.nova_group ?? undefined,
    },
    aliases: [row.name, row.generic_name || '', row.brand || ''].filter(Boolean),
  };
}

function mapToOffCategory(category?: string): string | null {
  if (!category) return null;
  const upper = category.toUpperCase().trim();
  if (['DAIRY', 'DAIRY_EGGS', 'CHEESE', 'KÄSE', 'MILCHPRODUKTE', 'MOLKEREIPRODUKTE'].includes(upper)) return 'DAIRY';
  if (['MEAT_FISH', 'MEAT', 'FISH', 'MEAT_POULTRY', 'SEAFOOD', 'FLEISCH', 'FISCH', 'FLEISCH & FISCH'].includes(upper)) return 'MEAT_FISH';
  if (['PRODUCE', 'FRUITS_VEGETABLES', 'VEGETABLES', 'FRUITS', 'OBST', 'GEMÜSE', 'OBST & GEMÜSE', 'OBST UND GEMÜSE'].includes(upper)) return 'FRUITS_VEGETABLES';
  if (['GRAINS', 'GRAINS_PASTA', 'PASTA', 'BREAD', 'BROT', 'NUDELN', 'GETREIDE', 'BACKWAREN'].includes(upper)) return 'GRAINS_PASTA';
  if (['SPICES', 'SPICES_SEASONINGS', 'SPICES_HERBS', 'SPICES_OILS', 'OILS', 'GEWÜRZE', 'ÖLE', 'GEWÜRZE & ÖLE', 'OILS_CONDIMENTS'].includes(upper)) return 'SPICES_OILS';
  if (['BEVERAGES', 'GETRÄNKE', 'DRINKS'].includes(upper)) return 'BEVERAGES';
  if (['SWEETS', 'SWEETS_SNACKS', 'SÜSSWAREN', 'SNACKS', 'DESSERT'].includes(upper)) return 'SWEETS';
  return null;
}

let dbInstance: DatabaseSync | null = null;
let searchStmt: any = null;
let likeSearchStmt: any = null;
let getByCodeStmt: any = null;
let listCategoryStmt: any = null;

const scoreFormula = (termParam: string, catParam: string) => `
  (CASE 
    WHEN lower(p.name) = lower(${termParam}) THEN 100.0
    WHEN lower(p.name) LIKE lower(${termParam} || ' %') THEN 80.0
    WHEN lower(p.name) LIKE lower('% ' || ${termParam} || ' %') THEN 60.0
    WHEN lower(p.name) LIKE lower('%' || ${termParam}) THEN 50.0
    ELSE 20.0
  END)
  - (LENGTH(p.name) - LENGTH(REPLACE(p.name, ' ', ''))) * 4.0
  - (CASE WHEN p.name LIKE '% mit %' OR p.name LIKE '% in %' THEN 40.0 ELSE 0.0 END)
  + (CASE WHEN ${catParam} IS NOT NULL AND ${catParam} != '' AND p.category = ${catParam} THEN 15.0 ELSE 0.0 END)
  + MIN(LN(COALESCE(p.unique_scans, 0) + 1.0) * 2.0, 20.0)
`;

function getDB(): DatabaseSync | null {
  if (dbInstance) return dbInstance;
  const dbPath = resolveDBPath();
  if (!fs.existsSync(dbPath)) {
    console.warn(`[OpenFoodFacts] Database not found at ${dbPath}. Run 'npm run build:off' to generate.`);
    return null;
  }

  try {
    dbInstance = new DatabaseSync(dbPath, { readOnly: true });
    searchStmt = dbInstance.prepare(`
      SELECT p.id, p.code, p.name, p.generic_name, p.brand, p.category,
             p.calories, p.protein, p.carbs, p.fat, p.sugar, p.fiber,
             p.nova_group, p.ingredients_count, p.unique_scans,
             (${scoreFormula('?2', '?3')} - (bm25(products_fts, 10.0, 4.0, 2.0, 1.0) * 5.0)) AS score
      FROM products_fts f
      JOIN products p ON f.rowid = p.id
      WHERE products_fts MATCH ?1
      ORDER BY score DESC
      LIMIT ?4;
    `);

    getByCodeStmt = dbInstance.prepare(`
      SELECT * FROM products WHERE code = ? LIMIT 1;
    `);

    likeSearchStmt = dbInstance.prepare(`
      SELECT p.id, p.code, p.name, p.generic_name, p.brand, p.category,
             p.calories, p.protein, p.carbs, p.fat, p.sugar, p.fiber,
             p.nova_group, p.ingredients_count, p.unique_scans,
             (${scoreFormula('?3', '?4')}) AS score
      FROM products p
      WHERE (p.name LIKE ?1 OR p.generic_name LIKE ?2)
      ORDER BY score DESC
      LIMIT ?5;
    `);

    listCategoryStmt = dbInstance.prepare(`
      SELECT * FROM products WHERE category LIKE ? ORDER BY unique_scans DESC LIMIT ?;
    `);

    return dbInstance;
  } catch (err: any) {
    console.error('[OpenFoodFacts] Failed to initialize SQLite:', err.message);
    return null;
  }
}

/**
 * Open Food Facts Catalogue Access interface for resolver tools.
 */
export const openFoodFactsAccess: CatalogueAccess = {
  search(query: string, category?: string, limit = 15): CanonicalIngredient[] {
    const db = getDB();
    if (!db || !searchStmt) return [];

    const cleaned = cleanQueryForFTS(query);
    if (!cleaned) return [];

    const offCategory = mapToOffCategory(category);
    const results: CanonicalIngredient[] = [];
    const seenCodes = new Set<string>();

    const addHit = (row: OFFRow) => {
      const code = row.code || `off_${row.id}`;
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        results.push(rowToCanonicalIngredient(row));
      }
    };

    const words = cleaned.split(' ');

    // 1. For single-word staple queries, run compound & substring search first
    // (This guarantees pure staples like Süßrahmbutter / Markenbutter / Magerquark / Weizenmehl beat Buttermilch / Peanut butter)
    if (words.length === 1 && likeSearchStmt) {
      try {
        const likeHits = likeSearchStmt.all(
          `%${cleaned}%`,
          `%${cleaned}%`,
          cleaned,
          offCategory,
          limit
        ) as OFFRow[];
        likeHits.forEach(addHit);
      } catch {
        // ignore
      }
    }

    // 2. Exact full word phrase in FTS
    if (results.length < limit) {
      const exactQuery = words.map(w => `"${w}"`).join(' ');
      try {
        const hits = searchStmt.all(exactQuery, cleaned, offCategory, limit) as OFFRow[];
        hits.forEach(addHit);
      } catch {
        // ignore FTS syntax errors
      }
    }

    // 3. Substring & compound search for multi-word queries
    if (results.length < limit && likeSearchStmt && words.length > 1) {
      try {
        const likeHits = likeSearchStmt.all(
          `%${cleaned}%`,
          `%${cleaned}%`,
          cleaned,
          offCategory,
          limit
        ) as OFFRow[];
        likeHits.forEach(addHit);
      } catch {
        // ignore
      }
    }

    // 4. Try prefix query for longer words (length >= 4)
    if (results.length < limit) {
      const ftsQuery = words.map(w => (w.length >= 4 ? `"${w}"*` : `"${w}"`)).join(' ');
      try {
        const hits = searchStmt.all(ftsQuery, cleaned, offCategory, limit) as OFFRow[];
        hits.forEach(addHit);
      } catch {
        // ignore
      }
    }

    // 5. Fallback: try individual words with OR
    if (results.length < limit && words.length > 1) {
      try {
        const orQuery = words.map(w => (w.length >= 4 ? `"${w}"*` : `"${w}"`)).join(' OR ');
        const hits = searchStmt.all(orQuery, cleaned, offCategory, limit) as OFFRow[];
        hits.forEach(addHit);
      } catch {
        // ignore
      }
    }

    return results.slice(0, limit);
  },

  get(code: string): CanonicalIngredient | null {
    const db = getDB();
    if (!db || !getByCodeStmt) return null;

    const clean = String(code ?? '').trim();
    if (!clean) return null;

    try {
      const row = getByCodeStmt.get(clean) as OFFRow | undefined;
      return row ? rowToCanonicalIngredient(row) : null;
    } catch {
      return null;
    }
  },

  listCategory(category: string, limit = 20): CanonicalIngredient[] {
    const db = getDB();
    if (!db || !listCategoryStmt) return [];

    try {
      const rows = listCategoryStmt.all(`%${category}%`, limit) as OFFRow[];
      return rows.map(rowToCanonicalIngredient);
    } catch {
      return [];
    }
  },
};
