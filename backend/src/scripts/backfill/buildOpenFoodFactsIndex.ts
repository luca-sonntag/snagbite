/**
 * Build Script: Stream, Filter, Minify & Index Open Food Facts for DACH
 *
 * Streams the official Open Food Facts CSV dump directly (without uncompressing 50GB to disk),
 * filters for German / DACH products with valid macronutrients, and builds a lean,
 * high-performance SQLite database with FTS5 fulltext search and Purity-Ranking (`backend/src/data/off_de.sqlite`).
 *
 * Usage:
 *   npx tsx src/scripts/buildOpenFoodFactsIndex.ts
 */

import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import readline from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'off_de.sqlite');

const DUMP_URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';

const DACH_PATTERNS = [
  'germany', 'deutschland', 'en:germany', 'de:deutschland', 'de',
  'austria', 'österreich', 'en:austria', 'at',
  'switzerland', 'schweiz', 'en:switzerland', 'ch',
];

function isDACH(countriesStr: string): boolean {
  if (!countriesStr) return false;
  const lower = countriesStr.toLowerCase();
  for (const p of DACH_PATTERNS) {
    if (lower.includes(p)) return true;
  }
  return false;
}

function cleanString(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const num = Number(val.replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

const TAXONOMY_MAP: Record<string, string> = {
  // BEVERAGES
  'en:plant-based-beverages': 'BEVERAGES',
  'en:beverages': 'BEVERAGES',
  'en:beverages-and-beverages-preparations': 'BEVERAGES',
  'en:waters': 'BEVERAGES',
  'en:carbonated-drinks': 'BEVERAGES',
  'en:sodas': 'BEVERAGES',
  'en:fruit-juices': 'BEVERAGES',
  'en:fruit-based-beverages': 'BEVERAGES',
  'en:teas': 'BEVERAGES',
  'en:coffees': 'BEVERAGES',
  'en:alcoholic-beverages': 'BEVERAGES',
  'en:beers': 'BEVERAGES',
  'en:wines': 'BEVERAGES',

  // DAIRY & EGGS
  'en:dairies': 'DAIRY',
  'en:milks': 'DAIRY',
  'en:cheeses': 'DAIRY',
  'en:fermented-milk-products': 'DAIRY',
  'en:yogurts': 'DAIRY',
  'en:curds': 'DAIRY',
  'en:creams': 'DAIRY',
  'en:butters': 'DAIRY',
  'en:dairy-substitutes': 'DAIRY',
  'en:eggs': 'DAIRY',
  'en:eggs-and-their-products': 'DAIRY',

  // MEAT & FISH
  'en:meats-and-their-products': 'MEAT_FISH',
  'en:meats': 'MEAT_FISH',
  'en:poultries': 'MEAT_FISH',
  'en:prepared-meats': 'MEAT_FISH',
  'en:seafood': 'MEAT_FISH',
  'en:fishes-and-their-products': 'MEAT_FISH',
  'en:fishes': 'MEAT_FISH',
  'en:crustaceans': 'MEAT_FISH',
  'en:meat-alternatives': 'MEAT_FISH',

  // FRUITS & VEGETABLES
  'en:fruits-and-vegetables-based-foods': 'FRUITS_VEGETABLES',
  'en:vegetables-based-foods': 'FRUITS_VEGETABLES',
  'en:fruits-based-foods': 'FRUITS_VEGETABLES',
  'en:vegetables': 'FRUITS_VEGETABLES',
  'en:fruits': 'FRUITS_VEGETABLES',
  'en:fresh-vegetables': 'FRUITS_VEGETABLES',
  'en:fresh-fruits': 'FRUITS_VEGETABLES',
  'en:frozen-vegetables': 'FRUITS_VEGETABLES',
  'en:frozen-fruits': 'FRUITS_VEGETABLES',
  'en:canned-plant-based-foods': 'FRUITS_VEGETABLES',
  'en:legumes-and-their-products': 'FRUITS_VEGETABLES',
  'en:pulses': 'FRUITS_VEGETABLES',
  'en:mushrooms': 'FRUITS_VEGETABLES',
  'en:salads': 'FRUITS_VEGETABLES',

  // GRAINS, PASTA & BAKING
  'en:cereals-and-potatoes': 'GRAINS_PASTA',
  'en:cereals-and-their-products': 'GRAINS_PASTA',
  'en:pastas': 'GRAINS_PASTA',
  'en:noodles': 'GRAINS_PASTA',
  'en:breads': 'GRAINS_PASTA',
  'en:flours': 'GRAINS_PASTA',
  'en:breakfast-cereals': 'GRAINS_PASTA',
  'en:cereal-grains': 'GRAINS_PASTA',
  'en:rices': 'GRAINS_PASTA',
  'en:tortillas': 'GRAINS_PASTA',
  'en:baked-goods': 'GRAINS_PASTA',

  // SPICES, OILS & CONDIMENTS
  'en:condiments': 'SPICES_OILS',
  'en:sauces': 'SPICES_OILS',
  'en:spices': 'SPICES_OILS',
  'en:culinary-plants': 'SPICES_OILS',
  'en:fats': 'SPICES_OILS',
  'en:vegetable-fats': 'SPICES_OILS',
  'en:vegetable-oils': 'SPICES_OILS',
  'en:pestos': 'SPICES_OILS',
  'en:vinegars': 'SPICES_OILS',
  'en:salts': 'SPICES_OILS',

  // SWEETS & DESSERTS
  'en:sweet-snacks': 'SWEETS',
  'en:chocolates': 'SWEETS',
  'en:confectioneries': 'SWEETS',
  'en:biscuits-and-cakes': 'SWEETS',
  'en:biscuits': 'SWEETS',
  'en:cakes': 'SWEETS',
  'en:desserts': 'SWEETS',
  'en:dairy-desserts': 'SWEETS',
  'en:frozen-desserts': 'SWEETS',
  'en:ice-creams': 'SWEETS',
  'en:sweet-spreads': 'SWEETS',
  'en:cocoa-and-its-products': 'SWEETS',
};

function classifyCategory(rawTagsStr: string): string {
  if (!rawTagsStr) return 'OTHER';
  const tags = rawTagsStr.split(',').map(t => t.trim().toLowerCase());

  // 1. Leaf-first check: scan tags from most specific (end) to general (start)
  for (let i = tags.length - 1; i >= 0; i--) {
    const match = TAXONOMY_MAP[tags[i]];
    if (match) return match;
  }

  // 2. Keyword fallback on individual tags
  for (let i = tags.length - 1; i >= 0; i--) {
    const t = tags[i];
    if (t.includes('cheese') || t.includes('dairy') || t.includes('milk') || t.includes('joghurt') || t.includes('quark')) return 'DAIRY';
    if (t.includes('meat') || t.includes('poultry') || t.includes('chicken') || t.includes('beef') || t.includes('pork') || t.includes('fish') || t.includes('seafood')) return 'MEAT_FISH';
    if (t.includes('vegetable') || t.includes('fruit') || t.includes('legume') || t.includes('pulse') || t.includes('tomato') || t.includes('onion') || t.includes('salad')) return 'FRUITS_VEGETABLES';
    if (t.includes('cereal') || t.includes('pasta') || t.includes('noodle') || t.includes('bread') || t.includes('flour') || t.includes('rice') || t.includes('potato')) return 'GRAINS_PASTA';
    if (t.includes('spice') || t.includes('sauce') || t.includes('oil') || t.includes('fat') || t.includes('pesto') || t.includes('condiment')) return 'SPICES_OILS';
    if (t.includes('beverage') || t.includes('drink') || t.includes('juice') || t.includes('water') || t.includes('tea') || t.includes('coffee')) return 'BEVERAGES';
    if (t.includes('sweet') || t.includes('snack') || t.includes('chocolate') || t.includes('dessert') || t.includes('candy') || t.includes('cake') || t.includes('biscuit')) return 'SWEETS';
  }

  return 'OTHER';
}

async function main(): Promise<void> {
  console.log('='.repeat(75));
  console.log('🚀 Open Food Facts Index Builder (DACH / German Lean Database + Purity Ranking)');
  console.log('='.repeat(75));
  console.log(`Source URL: ${DUMP_URL}`);
  console.log(`Target SQLite DB: ${DB_PATH}\n`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Delete previous DB if exists
  if (fs.existsSync(DB_PATH)) {
    console.log(`🗑️  Removing existing database at ${DB_PATH}...`);
    fs.unlinkSync(DB_PATH);
  }

  // Initialize SQLite Database with WAL and performance pragma
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = OFF;');
  db.exec('PRAGMA synchronous = OFF;');
  db.exec('PRAGMA cache_size = -64000;'); // 64MB cache

  // Create products table with ingredients_count and nova_group for purity ranking
  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      generic_name TEXT,
      brand TEXT,
      category TEXT,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      sugar REAL,
      fiber REAL,
      nova_group INTEGER,
      ingredients_count INTEGER,
      unique_scans INTEGER DEFAULT 0
    );
  `);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO products (
      code, name, generic_name, brand, category,
      calories, protein, carbs, fat, sugar, fiber,
      nova_group, ingredients_count, unique_scans
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  console.log('📡 Connecting to Open Food Facts dump stream...');
  const tStart = Date.now();

  const response = await fetch(DUMP_URL, {
    headers: {
      'User-Agent': 'CookbookAppIndexBuilder/1.0 (contact: dev@cookbook.app)',
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download dump: ${response.status} ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  const totalMbExpected = contentLength > 0 ? (contentLength / 1024 / 1024).toFixed(1) : 'unknown';
  console.log(`📦 Stream size: ~${totalMbExpected} MB (Compressed)\n`);

  let downloadedBytes = 0;
  let linesProcessed = 0;
  let dachInserted = 0;
  let lastReportTime = Date.now();
  let lastDownloadedBytes = 0;

  // Track download progress from WebStream
  const trackingStream = new (await import('node:stream')).Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      callback(null, chunk);
    },
  });

  const nodeReadable = Readable.fromWeb(response.body as any).pipe(trackingStream);
  const gunzip = createGunzip();
  const uncompressedStream = nodeReadable.pipe(gunzip);

  const rl = readline.createInterface({
    input: uncompressedStream,
    crlfDelay: Infinity,
  });

  let colMap: Record<string, number> = {};
  let isHeader = true;

  // Batch insert buffer
  db.exec('BEGIN TRANSACTION;');
  let batchCount = 0;

  for await (const line of rl) {
    if (!line) continue;

    if (isHeader) {
      const headers = line.split('\t');
      headers.forEach((h, idx) => {
        colMap[h.trim()] = idx;
      });
      isHeader = false;
      continue;
    }

    linesProcessed++;

    const cols = line.split('\t');

    const countries = cols[colMap['countries_tags'] ?? 40] || cols[colMap['countries_en'] ?? 41] || '';
    if (!isDACH(countries)) {
      continue;
    }

    const code = cleanString(cols[colMap['code'] ?? 0]);
    const name = cleanString(cols[colMap['product_name'] ?? 10]);
    const genericName = cleanString(cols[colMap['generic_name'] ?? 12]);
    const brand = cleanString(cols[colMap['brands'] ?? 18]);
    const category = classifyCategory(cols[colMap['categories_tags'] ?? 22] || cols[colMap['categories_en'] ?? 23] || '');

    if (!name && !genericName) continue;

    let calories = parseNum(cols[colMap['energy-kcal_100g'] ?? 89]);
    if (calories <= 0) {
      const energyKj = parseNum(cols[colMap['energy_100g'] ?? 90]);
      if (energyKj > 0) calories = Math.round(energyKj / 4.184);
    }

    const protein = Math.round(parseNum(cols[colMap['proteins_100g'] ?? 150]) * 10) / 10;
    const carbs = Math.round(parseNum(cols[colMap['carbohydrates_100g'] ?? 129]) * 10) / 10;
    const fat = Math.round(parseNum(cols[colMap['fat_100g'] ?? 92]) * 10) / 10;
    const sugar = parseNum(cols[colMap['sugars_100g'] ?? 130]);
    const fiber = parseNum(cols[colMap['fiber_100g'] ?? 146]);
    const novaGroup = parseInt(cols[colMap['nova_group'] ?? 59] || '0', 10) || null;
    const uniqueScans = parseInt(cols[colMap['unique_scans_n'] ?? 75] || '0', 10) || 0;

    // Determine ingredients count for purity ranking
    let ingredientsCount: number | null = null;
    const ingTags = cols[colMap['ingredients_tags'] ?? 43];
    if (ingTags) {
      const count = ingTags.split(',').filter(Boolean).length;
      if (count > 0) ingredientsCount = count;
    } else if (novaGroup === 1) {
      ingredientsCount = 1;
    }

    // Discard completely empty nutrient profiles
    if (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) continue;

    // Discard physically impossible community entry typos (e.g. >900 kcal for non-fats, or sum of macros > 105g/100g)
    if (calories > 900 && fat < 95) continue;
    if (calories > 950) continue;
    if (protein > 100 || carbs > 100 || fat > 100) continue;
    if (protein + carbs + fat > 105) continue;

    try {
      insertStmt.run(
        code || null,
        name || genericName || 'Unbenannt',
        genericName,
        brand,
        category,
        Math.round(calories),
        protein,
        carbs,
        fat,
        sugar > 0 ? Math.round(sugar * 10) / 10 : null,
        fiber > 0 ? Math.round(fiber * 10) / 10 : null,
        novaGroup,
        ingredientsCount,
        uniqueScans
      );
      dachInserted++;
      batchCount++;

      if (batchCount >= 10000) {
        db.exec('COMMIT;');
        db.exec('BEGIN TRANSACTION;');
        batchCount = 0;
      }
    } catch {
      // Ignore duplicate codes
    }

    const now = Date.now();
    if (now - lastReportTime >= 2000) {
      const mbDownloaded = (downloadedBytes / 1024 / 1024).toFixed(1);
      const deltaBytes = downloadedBytes - lastDownloadedBytes;
      const speedMb = ((deltaBytes / 1024 / 1024) / ((now - lastReportTime) / 1000)).toFixed(2);
      const elapsedSec = Math.round((now - tStart) / 1000);

      process.stdout.write(
        `\r⏳ [${elapsedSec}s] Downloaded: ${mbDownloaded} MB (${speedMb} MB/s) | Lines: ${linesProcessed.toLocaleString()} | DACH Products: ${dachInserted.toLocaleString()} `
      );

      lastReportTime = now;
      lastDownloadedBytes = downloadedBytes;
    }
  }

  // Commit remaining rows
  db.exec('COMMIT;');
  console.log('\n\n✅ Stream processing finished!');
  console.log(`   Total Lines Processed: ${linesProcessed.toLocaleString()}`);
  console.log(`   DACH Products Inserted: ${dachInserted.toLocaleString()}`);

  // Build FTS5 Full-Text Search Virtual Table
  console.log('\n⚙️  Building FTS5 Full-Text Search Index (BM25)...');
  const tFts = Date.now();

  db.exec(`
    CREATE VIRTUAL TABLE products_fts USING fts5(
      name,
      generic_name,
      brand,
      category,
      content='products',
      content_rowid='id',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);

  db.exec(`
    INSERT INTO products_fts(rowid, name, generic_name, brand, category)
    SELECT id, name, generic_name, brand, category FROM products;
  `);

  // Optimize and shrink DB
  console.log('🧹 Optimizing & vacuuming database...');
  db.exec('INSERT INTO products_fts(products_fts) VALUES(\'optimize\');');
  db.exec('PRAGMA optimize;');

  const ftsDuration = ((Date.now() - tFts) / 1000).toFixed(1);
  console.log(`✅ FTS5 Index built in ${ftsDuration}s.`);

  // Check file size
  const stats = fs.statSync(DB_PATH);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`\n🎉 SQLite Database successfully created!`);
  console.log(`   File: ${DB_PATH}`);
  console.log(`   Total Size on Disk: ${sizeMb} MB`);

  // Verification queries with Purity Boost
  console.log('\n' + '='.repeat(75));
  console.log('🧪 Verifying Local FTS5 Purity-Boost Search Queries:');
  console.log('='.repeat(75));

  const testQueries = [
    'Kartoffeln',
    'Zwiebeln',
    'Butter',
    'Hähnchenbrustfilet',
    'Ei',
    'Eatlean',
    'Reispapier',
    'Sriracha',
    'Speisequark',
  ];

  const searchStmt = db.prepare(`
    SELECT p.name, p.brand, p.category, p.calories, p.protein, p.carbs, p.fat,
           p.nova_group, p.ingredients_count, p.unique_scans,
           (bm25(products_fts, 10.0, 5.0, 2.0, 1.0) / (0.5 + COALESCE(p.nova_group, 2) * 0.4 + MIN(COALESCE(p.ingredients_count, 1), 10) * 0.05)) AS rank
    FROM products_fts f
    JOIN products p ON f.rowid = p.id
    WHERE products_fts MATCH ?
    ORDER BY rank ASC, p.unique_scans DESC
    LIMIT 3;
  `);

  for (const q of testQueries) {
    console.log(`\n🔎 Query: "${q}"`);
    try {
      const results = searchStmt.all(`"${q}"*`) as any[];
      if (results.length === 0) {
        console.log('   ❌ Keine Treffer');
        continue;
      }
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const brand = r.brand ? ` [Marke: ${r.brand}]` : '';
        const nova = r.nova_group ? ` | NOVA ${r.nova_group}` : '';
        const count = r.ingredients_count ? ` | ${r.ingredients_count} Zutat(en)` : '';
        console.log(
          `   [${i + 1}] ${r.name}${brand}${nova}${count}\n` +
          `       100g: ${r.calories} kcal, ${r.protein}g P, ${r.carbs}g C, ${r.fat}g F`
        );
      }
    } catch (e: any) {
      console.error('   ❌ Search error:', e.message);
    }
  }

  db.close();
  console.log('\n' + '='.repeat(75));
  console.log('🏁 Open Food Facts DACH Index Build Complete!');
  console.log('='.repeat(75));
}

main().catch(err => {
  console.error('\n❌ Fatal Build Error:', err);
  process.exit(1);
});
