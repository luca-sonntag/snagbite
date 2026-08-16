import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { CANONICAL_INGREDIENTS, type CanonicalIngredient } from '../data/canonicalIngredients.js';
import { BASE_NAME_TO_CANONICAL_ID } from './baseNameMap.js';
import type { Recipe, Ingredient, ParentIngredientInfo } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMBEDDINGS_BIN_PATH = path.resolve(__dirname, '../data/canonicalEmbeddings.bin');
const EMBEDDINGS_META_PATH = path.resolve(__dirname, '../data/canonicalEmbeddingsMeta.json');
const EMBEDDING_DIM = 3072;
const MODEL_NAME = 'gemini-embedding-001';

interface IndexedIngredient extends CanonicalIngredient {
  search_aliases: string;
}

// 1. Exact lookup maps for O(1) matching
const byId = new Map<string, CanonicalIngredient>();
const byAlias = new Map<string, CanonicalIngredient>();
const byNameEn = new Map<string, CanonicalIngredient>();
const byNameDe = new Map<string, CanonicalIngredient>();

// 2. Category-scoped item lists for MiniSearch instances
const itemsByCategory = new Map<string, IndexedIngredient[]>();
const allIndexedItems: IndexedIngredient[] = [];

// 3. Precomputed Embeddings index & buffer
let embeddingsBuffer: Float32Array | null = null;
const idToVectorIndex = new Map<string, number>();

try {
  if (fs.existsSync(EMBEDDINGS_BIN_PATH) && fs.existsSync(EMBEDDINGS_META_PATH)) {
    const rawMeta = fs.readFileSync(EMBEDDINGS_META_PATH, 'utf-8');
    const meta = JSON.parse(rawMeta);
    for (let i = 0; i < meta.idMap.length; i++) {
      idToVectorIndex.set(meta.idMap[i].toLowerCase().trim(), i);
    }

    const rawBin = fs.readFileSync(EMBEDDINGS_BIN_PATH);
    embeddingsBuffer = new Float32Array(rawBin.buffer, rawBin.byteOffset, rawBin.byteLength / 4);
  }
} catch (err) {
  console.warn('[ingredientMatcher] Could not load canonical embeddings buffer:', err);
}

// Simplicity score for choosing between multiple exact alias matches and ranking raw staples
function getSimplicityScore(item: CanonicalIngredient): number {
  const de = (item.name_de || '').toLowerCase();
  const en = (item.name_en || '').toLowerCase();
  let score = 100 - de.length;
  if (de.includes('roh') || en.includes('raw')) score += 40;
  if (de.includes('pulver') && !de.includes('backpulver')) score += 25;
  if (de.includes('nature') || de.includes('mager') || en.includes('plain') || en.includes('unsalted') || de.includes('trocken')) score += 20;
  if (
    de.includes('zubereitung') ||
    de.includes('gebäck') ||
    de.includes('gericht') ||
    de.includes('salat') ||
    de.includes('burger') ||
    de.includes('konserve') ||
    de.includes('gegrillt') ||
    de.includes('gebacken') ||
    de.includes('gedünstet') ||
    de.includes('mit fett und salz') ||
    de.includes('für torten')
  ) {
    score -= 40;
  }
  return score;
}

for (const item of CANONICAL_INGREDIENTS) {
  byId.set(item.id.toLowerCase().trim(), item);
  if (item.bls_code) {
    byId.set(item.bls_code.toLowerCase().trim(), item);
  }
  byNameEn.set(item.name_en.toLowerCase().trim(), item);
  byNameDe.set(item.name_de.toLowerCase().trim(), item);

  for (const alias of item.aliases) {
    const key = alias.toLowerCase().trim();
    if (!key) continue;
    const existing = byAlias.get(key);
    if (!existing || getSimplicityScore(item) > getSimplicityScore(existing)) {
      byAlias.set(key, item);
    }
  }

  const indexedItem: IndexedIngredient = {
    ...item,
    search_aliases: (item.aliases || []).join(' '),
  };

  allIndexedItems.push(indexedItem);

  const cat = item.category || 'OTHER';
  if (!itemsByCategory.has(cat)) {
    itemsByCategory.set(cat, []);
  }
  itemsByCategory.get(cat)!.push(indexedItem);
}

// 4. MiniSearch Indexes (BM25 sparse search)
function createMiniSearchIndex(items: IndexedIngredient[]): MiniSearch<IndexedIngredient> {
  const ms = new MiniSearch<IndexedIngredient>({
    idField: 'id',
    fields: ['name_de', 'search_aliases', 'name_en'],
    storeFields: ['id', 'bls_code', 'name_de', 'name_en', 'category', 'nutrients_per_100g', 'standard_units', 'aliases'],
    tokenize: (text: string) =>
      text
        .toLowerCase()
        .replace(/[,()[\]/._-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2),
    processTerm: (term: string) => term.toLowerCase().trim(),
    searchOptions: {
      boost: { name_de: 3.0, search_aliases: 2.5, name_en: 1.0 },
      fuzzy: (term: string) => (term.length >= 5 ? 0.2 : false),
      prefix: false,
      combineWith: 'OR',
    },
  });

  ms.addAll(items);
  return ms;
}

const categoryMiniSearchMap = new Map<string, MiniSearch<IndexedIngredient>>();
for (const [cat, items] of itemsByCategory.entries()) {
  categoryMiniSearchMap.set(cat, createMiniSearchIndex(items));
}
const globalMiniSearch = createMiniSearchIndex(allIndexedItems);

// 5. Google Generative AI Embedding Client
let embeddingModel: any = null;
function getEmbeddingModel(): any {
  if (!embeddingModel && config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return embeddingModel;
}

/**
 * Calculates dot product (cosine similarity) between normalized vectors.
 */
function calculateCosineSimilarity(vecA: Float32Array | number[], vecBOffset: number): number {
  if (!embeddingsBuffer) return 0;
  let dot = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    dot += vecA[i] * embeddingsBuffer[vecBOffset + i];
  }
  return dot;
}

/**
 * Normalizes a search term or ingredient name by removing modifiers,
 * parenthetical text, and special characters.
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  let cleaned = term.toLowerCase().trim();

  // Remove parenthetical descriptions: "Zwiebel (gewürfelt)" -> "Zwiebel"
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, ' ').trim();

  // Remove trailing comma modifiers: "Zwiebel, fein gewürfelt" -> "Zwiebel"
  const commaIndex = cleaned.indexOf(',');
  if (commaIndex !== -1) {
    cleaned = cleaned.slice(0, commaIndex).trim();
  }

  // Remove punctuation / multiple spaces
  cleaned = cleaned.replace(/[-_.]/g, ' ').replace(/[()[\]{},;:"'!?]/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Normalizes unit strings into standardized keys for portion weight calculation.
 */
export function normalizeUnit(rawUnit?: string): string {
  if (!rawUnit) return 'piece';
  const u = rawUnit.toLowerCase().trim().replace(/\.$/, '');

  if (['g', 'gram', 'grams', 'gramm'].includes(u)) return 'g';
  if (['kg', 'kilogram', 'kilograms', 'kilogramm'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'milliliters', 'millilitre'].includes(u)) return 'ml';
  if (['l', 'liter', 'liters', 'litre'].includes(u)) return 'l';
  if (['el', 'tbsp', 'tablespoon', 'tablespoons', 'essloeffel', 'esslöffel'].includes(u)) return 'tablespoon';
  if (['tl', 'tsp', 'teaspoon', 'teaspoons', 'teeloeffel', 'teelöffel'].includes(u)) return 'teaspoon';
  if (['cup', 'cups', 'tasse', 'tassen'].includes(u)) return 'cup';
  if (['zehe', 'zehen', 'clove', 'cloves'].includes(u)) return 'clove';
  if (['stk', 'stk.', 'stueck', 'stück', 'stuecke', 'stücke', 'piece', 'pieces', 'einheit', 'knolle'].includes(u)) return 'piece';
  if (['prise', 'prisen', 'pinch', 'pinches', 'messerspitze', 'msp'].includes(u)) return 'pinch';
  if (['scheibe', 'scheiben', 'slice', 'slices'].includes(u)) return 'slice';
  if (['dose', 'dosen', 'can', 'cans', 'tin', 'tins'].includes(u)) return 'can';
  if (['bund', 'bunch', 'bunches', 'strauss', 'strauß'].includes(u)) return 'bunch';
  if (['handvoll', 'handful'].includes(u)) return 'handful';

  return 'piece';
}

/**
 * Standardize category strings to canonical enum format.
 */
export function normalizeCategory(category?: string): string {
  if (!category) return '';
  const c = category.toUpperCase().trim();
  const map: Record<string, string> = {
    PRODUCE: 'FRUITS_VEGETABLES',
    VEGETABLES: 'FRUITS_VEGETABLES',
    FRUITS: 'FRUITS_VEGETABLES',
    FRUITS_VEGETABLES: 'FRUITS_VEGETABLES',
    DAIRY: 'DAIRY',
    DAIRY_EGGS: 'DAIRY',
    EGGS: 'DAIRY',
    MEAT: 'MEAT_FISH',
    POULTRY: 'MEAT_FISH',
    MEAT_POULTRY: 'MEAT_FISH',
    FISH: 'MEAT_FISH',
    SEAFOOD: 'MEAT_FISH',
    FISH_SEAFOOD: 'MEAT_FISH',
    MEAT_FISH: 'MEAT_FISH',
    GRAINS: 'GRAINS_PASTA',
    PASTA: 'GRAINS_PASTA',
    GRAINS_PASTA: 'GRAINS_PASTA',
    BAKING: 'BAKING_COOKING',
    PANTRY: 'BAKING_COOKING',
    PANTRY_BAKING: 'BAKING_COOKING',
    BAKING_COOKING: 'BAKING_COOKING',
    SPICES: 'SPICES_OILS',
    OILS: 'SPICES_OILS',
    SPICES_OILS: 'SPICES_OILS',
    OILS_CONDIMENTS: 'SPICES_OILS',
    CONDIMENTS: 'SPICES_OILS',
    HERBS_SPICES: 'SPICES_OILS',
    CANNED: 'CANNED_PRESERVED',
    CANNED_GOODS: 'CANNED_PRESERVED',
    CANNED_PRESERVED: 'CANNED_PRESERVED',
    FROZEN: 'FROZEN',
    FROZEN_FOODS: 'FROZEN',
    BREAD: 'BREAD_BAKERY',
    BAKERY: 'BREAD_BAKERY',
    BREAD_BAKERY: 'BREAD_BAKERY',
    BEVERAGES: 'BEVERAGES',
    DRINKS: 'BEVERAGES',
    SWEETS: 'SWEETS_SNACKS',
    SNACKS: 'SWEETS_SNACKS',
    SWEETS_SNACKS: 'SWEETS_SNACKS',
    SNACKS_SWEETS: 'SWEETS_SNACKS',
    READY_MEALS: 'READY_MEALS',
    CONVENIENCE: 'READY_MEALS',
    PREPARED_DISHES: 'READY_MEALS',
    REFRIGERATED_CONVENIENCE: 'REFRIGERATED_CONVENIENCE',
    OTHER: 'OTHER',
  };
  return map[c] || c;
}

/**
 * Builds the prioritized search queries for an ingredient.
 */
function buildSearchQueries(
  name: string,
  baseName?: string,
  synonyms?: string[],
  searchQueries?: string[]
): string[] {
  const queries: string[] = [];
  const genericFragments = new Set(['powder', 'pulver', 'milk', 'milch', 'cheese', 'käse', 'oil', 'öl', 'sauce', 'soße', 'cookies', 'kekse', 'pudding']);

  const isPowderName = /\b(pulver|powder)\b/i.test(name) || /\b(pulver|powder)\b/i.test(baseName || '');

  // 1. Primary Name & baseName (highest priority)
  if (name) {
    const norm = normalizeSearchTerm(name);
    if (norm && !queries.includes(norm)) queries.push(norm);
  }
  if (baseName) {
    const norm = normalizeSearchTerm(baseName);
    if (norm && !queries.includes(norm)) queries.push(norm);
  }

  // 2. Explicit search queries from Gemini
  if (searchQueries && Array.isArray(searchQueries)) {
    for (const q of searchQueries) {
      if (q && typeof q === 'string') {
        const norm = normalizeSearchTerm(q);
        if (!norm || queries.includes(norm)) continue;
        // If the ingredient is a powder, do not search for the raw root (e.g. "paprika" for "paprikapulver")
        if (isPowderName && !norm.includes('pulver') && !norm.includes('powder') && !norm.includes('gewürz')) {
          continue;
        }
        queries.push(norm);
      }
    }
  }

  // 3. Synonyms
  if (synonyms && Array.isArray(synonyms)) {
    for (const s of synonyms) {
      if (s && typeof s === 'string') {
        const norm = normalizeSearchTerm(s);
        if (!norm || queries.includes(norm)) continue;
        if (genericFragments.has(norm) && name && name.split(/\s+/).length >= 2) {
          continue; // Skip isolated generic fragment for compound products
        }
        if (isPowderName && !norm.includes('pulver') && !norm.includes('powder') && !norm.includes('gewürz')) {
          continue;
        }
        queries.push(norm);
      }
    }
  }

  return queries;
}

/**
 * Computes query embedding via Google Gemini Embedding API.
 */
async function fetchQueryEmbedding(text: string): Promise<number[] | null> {
  const model = getEmbeddingModel();
  if (!model) return null;
  try {
    const res = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
    });
    return res.embedding?.values || null;
  } catch (err: any) {
    console.warn(`[ingredientMatcher] Embedding call failed for "${text}":`, err.message);
    return null;
  }
}

/**
 * Safely converts an English plural food noun to its singular form.
 * Preserves nouns ending in -ss, -us, -is, -se, -cous (e.g. cheese, hummus, asparagus, couscous).
 */
export function toEnglishSingular(word: string): string {
  if (!word || word.length <= 2) return word;
  const lower = word.toLowerCase().trim();

  // 1. Never strip singular words ending in -ss, -us, -is, -se, -cous
  if (/(?:ss|us|is|cous|se)$/.test(lower)) {
    return lower;
  }

  // 2. Berries & -ies (strawberries -> strawberry, raspberries -> raspberry)
  if (lower.endsWith('ies')) {
    return lower.slice(0, -3) + 'y';
  }

  // 3. -oes (potatoes -> potato, tomatoes -> tomato)
  if (lower.endsWith('oes')) {
    return lower.slice(0, -2);
  }

  // 4. -leaves (leaves -> leaf)
  if (lower.endsWith('leaves')) {
    return lower.slice(0, -3) + 'f';
  }

  // 5. Standard Plural -s (eggs -> egg, onions -> onion, carrots -> carrot, shrimps -> shrimp)
  if (lower.endsWith('s') && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }

  return lower;
}

/**
 * Finds a matching canonical ingredient using Hybrid Search (Exact -> BM25 Sparse -> Gemini Vector Dense).
 */
export async function findCanonicalIngredient(
  name: string,
  baseName?: string,
  category?: string,
  synonyms?: string[],
  searchQueries?: string[],
  parentIngredient?: ParentIngredientInfo
): Promise<CanonicalIngredient | null> {
  const cleanCategory = normalizeCategory(category);
  const targetMiniSearch = cleanCategory && categoryMiniSearchMap.has(cleanCategory) ? categoryMiniSearchMap.get(cleanCategory)! : null;
  const isPowderQuery = /\b(pulver|powder)\b/i.test(name) || /\b(pulver|powder)\b/i.test(baseName || '');

  // 0. Stage 0: Universal BaseName Fast-Path (authoritative direct English key match + safe singularizer)
  if (baseName) {
    const normBase = baseName.toLowerCase().trim();
    const singular = toEnglishSingular(normBase);
    const mappedId = BASE_NAME_TO_CANONICAL_ID[normBase] || BASE_NAME_TO_CANONICAL_ID[singular];
    if (mappedId) {
      const item = byId.get(mappedId.toLowerCase().trim()) || byId.get('bls_' + mappedId.toLowerCase().trim());
      if (item) {
        return item;
      }
    }
  }

  // 1. Parent ingredient priority (e.g. "Ei" for "Eigelb", "Zitrone" for "Zitronensaft")
  if (parentIngredient?.name || parentIngredient?.baseName) {
    if (parentIngredient.baseName) {
      const normParentBase = parentIngredient.baseName.toLowerCase().trim();
      const singularParent = toEnglishSingular(normParentBase);
      const mappedParentId = BASE_NAME_TO_CANONICAL_ID[normParentBase] || BASE_NAME_TO_CANONICAL_ID[singularParent];
      if (mappedParentId) {
        const item = byId.get(mappedParentId.toLowerCase().trim()) || byId.get('bls_' + mappedParentId.toLowerCase().trim());
        if (item) return item;
      }
    }
    if (parentIngredient.name) {
      const normParent = normalizeSearchTerm(parentIngredient.name);
      const directParent = byAlias.get(normParent) || byNameDe.get(normParent) || byId.get(normParent);
      if (directParent) {
        return directParent;
      }
    }
  }

  // 2. Build search query list
  const queriesToTest = buildSearchQueries(name, baseName, synonyms, searchQueries);

  // 3. Stage 1: Exact O(1) Fast-Path (authoritative direct alias match)
  for (const q of queriesToTest) {
    const direct = byAlias.get(q) || byNameDe.get(q) || byId.get(q) || byNameEn.get(q);
    if (direct) {
      if (isPowderQuery && direct.category === 'FRUITS_VEGETABLES' && !direct.name_de.toLowerCase().includes('pulver')) {
        continue;
      }
      return direct;
    }
  }

  // 4. Stage 2: Category-Scoped Sparse Retrieval (MiniSearch BM25)
  const candidateMap = new Map<string, { item: CanonicalIngredient; bm25Score: number }>();
  const searchEngine = targetMiniSearch || globalMiniSearch;

  for (const q of queriesToTest) {
    if (q.length < 2) continue;
    const results = searchEngine.search(q, {
      boost: { name_de: 3.0, search_aliases: 2.5, name_en: 1.0 },
      fuzzy: q.length >= 5 ? 0.2 : false,
      prefix: false,
      combineWith: 'OR',
    });

    for (const r of results.slice(0, 8)) {
      if (!candidateMap.has(r.id)) {
        const item = byId.get(r.id);
        if (item) {
          candidateMap.set(r.id, { item, bm25Score: r.score });
        }
      }
    }
  }

  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) {
    return null;
  }

  // 5. Stage 3: Dense Semantic Re-Ranking (Gemini Vector Embeddings)
  let bestCandidate: CanonicalIngredient | null = null;
  let bestScore = 0;

  let queryVector: number[] | null = null;
  if (embeddingsBuffer) {
    const primaryQuery = queriesToTest[0] || name;
    queryVector = await fetchQueryEmbedding(primaryQuery);
  }

  const isFitnessQuery = /\b(protein|whey|isoclear|casein)\b/i.test(name) || /\b(protein|whey|isoclear|casein)\b/i.test(baseName || '');

  for (const { item, bm25Score } of candidates) {
    const candDe = (item.name_de || '').toLowerCase();
    const lowerQuery = (name + ' ' + (baseName || '')).toLowerCase();

    // Never match fitness protein powder to baking leavening agents (Backpulver/Natron)
    const isBakingLeavening = item.bls_code?.startsWith('R42') || candDe.includes('backpulver') || candDe.includes('natron');
    const isLeaveningQuery = /\b(backpulver|natron|baking powder|baking soda|leavening)\b/i.test(lowerQuery);
    if (!isLeaveningQuery && isBakingLeavening) {
      continue;
    }

    // Flour vs Pastry guard: if asking for flour (e.g. Mandelmehl, Kokosmehl), never match cake/pastry (e.g. Mandelkuchen)
    if (/\b(mehl|flour)\b/i.test(lowerQuery) && (candDe.includes('kuchen') || candDe.includes('torte') || candDe.includes('gebäck') || item.bls_code?.startsWith('D4'))) {
      continue;
    }

    // Spice vs Sauce guard: if asking for pure spice (e.g. Curry, Paprikapulver), never match ketchup or sauce unless query asks for sauce
    const isSpiceQuery = (cleanCategory === 'SPICES_OILS' || /\b(pulver|powder|gewürz|spice)\b/i.test(lowerQuery)) && !/\b(ketchup|sauce|soße|dressing|dip)\b/i.test(lowerQuery);
    if (isSpiceQuery && (candDe.includes('ketchup') || candDe.includes('sauce') || candDe.includes('soße') || candDe.includes('dressing'))) {
      continue;
    }

    // Pesto vs Dried herbs guard: Pesto (rich sauce with oil & nuts) must never match dry single herb leaves
    const isPestoQuery = /\bpesto\b/i.test(lowerQuery);
    if (isPestoQuery && (candDe.includes('getrocknet') || candDe.includes('blatt') || item.category === 'FRUITS_VEGETABLES')) {
      continue;
    }

    // Pulver/Powder guard: if query is a powder (e.g. Paprikapulver, Mangopulver), do not match fresh raw fruit/vegetable
    if (/\b(pulver|powder)\b/i.test(lowerQuery) && item.category === 'FRUITS_VEGETABLES' && !candDe.includes('pulver') && !candDe.includes('powder') && !candDe.includes('getrocknet')) {
      continue;
    }

    // Poultry vs Beef/Offal guard: if query is poultry (e.g. Hähnchenhackfleisch), do not match beef/offal (e.g. Leberhack)
    const isPoultryQuery = /\b(hähnchen|huhn|hühner|geflügel|pute|truthahn|chicken|turkey)\b/i.test(lowerQuery);
    if (isPoultryQuery && (item.bls_code?.startsWith('U') || candDe.includes('leber') || candDe.includes('niere') || candDe.includes('schwein') || candDe.includes('rind'))) {
      continue;
    }

    // Seasoning vs Animal Fat guard: if query is seasoning (e.g. Hähnchengewürz), do not match animal fat/oil
    const isSeasoningQuery = /\b(gewürz|seasoning|rub)\b/i.test(lowerQuery);
    if (isSeasoningQuery && (item.category === 'SPICES_OILS' || item.bls_code?.startsWith('Q')) && (candDe.includes('fett') || candDe.includes('schmalz') || candDe.includes('talg'))) {
      continue;
    }

    // Nutmeg vs Tree Nuts guard: nutmeg is a spice, never a whole nut like walnut/hazelnut
    if (/\b(muskat|muskatnuss|nutmeg)\b/i.test(lowerQuery) && (item.category === 'NUTS_SEEDS' || item.bls_code?.startsWith('H1') || item.bls_code?.startsWith('H2') || candDe.includes('walnuss') || candDe.includes('haselnuss'))) {
      continue;
    }

    // Pure spice/seasoning vs Meat/Fish/Prepared Dishes guard: spices (e.g. Rauchpaprika, Kebab-Gewürz, Pommesgewürz) must never match fish/meat/dishes
    const isPureSpiceQuery = /\b(pulver|powder|gewürz|seasoning|rub|salz|salt|flocken|flakes)\b/i.test(lowerQuery) && !/\b(fleisch|meat|fish|fisch|lachs|salmon|currywurst|suppe|soup)\b/i.test(lowerQuery);
    if (isPureSpiceQuery && (item.category === 'MEAT_FISH' || item.category === 'PREPARED_DISHES' || item.bls_code?.startsWith('T') || item.bls_code?.startsWith('U') || item.bls_code?.startsWith('V') || item.bls_code?.startsWith('W') || item.bls_code?.startsWith('X') || item.bls_code?.startsWith('Y') || candDe.includes('geräuchert') || candDe.includes('gebraten') || candDe.includes('gegrillt') || candDe.includes('pommes'))) {
      continue;
    }

    // Broth vs Animal Fat guard: broth/stock must never match pure animal fat/tallow
    const isBrothQuery = /\b(brühe|bouillon|broth|stock|fond)\b/i.test(lowerQuery);
    if (isBrothQuery && (item.category === 'SPICES_OILS' || item.bls_code?.startsWith('Q') || candDe.includes('fett') || candDe.includes('talg') || candDe.includes('schmalz'))) {
      continue;
    }

    // Pastry/Cookies vs Meat Substitute guard: sweet baked goods must never match savory soy meat substitutes
    const isPastryQuery = /\b(keks|kuchen|torte|gebäck|cookie|biscuit|pastry)\b/i.test(lowerQuery);
    if (isPastryQuery && (item.bls_code?.startsWith('H91') || candDe.includes('schnitzel') || candDe.includes('bratwurst') || candDe.includes('frikadelle'))) {
      continue;
    }

    // Chili flakes vs Grain Flakes guard: chili flakes must never match oat/wheat flakes
    const isChiliFlakesQuery = /\b(chili|chilikörner|chiliflocken|pepper flakes)\b/i.test(lowerQuery);
    if (isChiliFlakesQuery && (item.category === 'GRAINS_PASTA' || item.bls_code?.startsWith('C1') || candDe.includes('hafer') || candDe.includes('weizen') || candDe.includes('dinkel'))) {
      continue;
    }

    // Pure Butter guard: standard butter queries must never match cosmetic/plant fats like Sheabutter or Kakaobutter
    const isPureButterQuery = /\bbutter\b/i.test(lowerQuery) && !/\b(shea|kakao|erdnuss|mandel|apfel|cookie)\b/i.test(lowerQuery);
    if (isPureButterQuery && (candDe.includes('shea') || candDe.includes('kakao') || candDe.includes('joghurtbutter'))) {
      continue;
    }

    // Plain Dairy vs Fruit Dessert guard: plain yogurt/milk/quark must not match sweet fruit-flavored yogurts/desserts
    const isPlainDairyQuery = /\b(joghurt|quark|milch|yogurt)\b/i.test(lowerQuery) && !/\b(erdbeer|kirsch|frucht|vanille|schoko|stracciatella|blaubeer|beere|fruit)\b/i.test(lowerQuery);
    if (isPlainDairyQuery && (item.bls_code?.startsWith('Y8') || candDe.includes('erdbeer') || candDe.includes('kirsch') || candDe.includes('frucht') || candDe.includes('pfirsich') || candDe.includes('banane'))) {
      continue;
    }

    let semanticScore = 0;
    const vecIdx = idToVectorIndex.get(item.id.toLowerCase().trim());

    if (queryVector && vecIdx !== undefined && embeddingsBuffer) {
      const offset = vecIdx * EMBEDDING_DIM;
      semanticScore = calculateCosineSimilarity(queryVector, offset);
    }

    // Category alignment bonus / penalty
    let categoryWeight = 1.0;
    if (cleanCategory && cleanCategory !== 'READY_MEALS' && cleanCategory !== 'OTHER') {
      if (item.category === 'READY_MEALS' || item.bls_code?.startsWith('X') || item.bls_code?.startsWith('Y')) {
        categoryWeight = 0.65; // Strong penalty for ready meals when looking for raw produce/dairy/meat/grains
      } else if (item.category === cleanCategory) {
        categoryWeight = 1.15; // Category match bonus
      }
    }

    // Normalized BM25: saturates around score 10
    const normalizedBM25 = Math.min(1.0, bm25Score / 10.0);
    const simplicityBonus = (getSimplicityScore(item) - 50) / 400;

    // Hybrid composite score: (40% BM25 + 60% Semantic Vector Similarity + simplicity bonus) * categoryWeight
    const baseScore = queryVector
      ? (0.40 * normalizedBM25 + 0.60 * semanticScore + simplicityBonus)
      : (normalizedBM25 + simplicityBonus);

    const hybridScore = baseScore * categoryWeight;

    // Strict semantic filter: if vector model is active, cosine similarity must be >= 0.70
    if (queryVector && semanticScore < 0.70) {
      continue;
    }

    if (hybridScore > bestScore) {
      bestScore = hybridScore;
      bestCandidate = item;
    }
  }

  // Final acceptance threshold (ensures high-confidence matches only)
  if (bestCandidate && bestScore >= 0.68) {
    return bestCandidate;
  }

  return null;
}

/**
 * Calculates the total weight in grams for a given amount, unit, and matched ingredient.
 */
export function calculateWeightGrams(amount: number, unit: string, item: CanonicalIngredient | null): number {
  if (amount <= 0) return 0;
  const normUnit = normalizeUnit(unit);

  // 1. Direct weight / volume
  if (normUnit === 'g') return amount;
  if (normUnit === 'kg') return amount * 1000;
  if (normUnit === 'ml') return amount;
  if (normUnit === 'l') return amount * 1000;

  // 2. Specific standard unit weights for this ingredient
  if (item?.standard_units) {
    const std = item.standard_units as Record<string, number | undefined>;
    if (std[normUnit] !== undefined && std[normUnit]! > 0) {
      return amount * std[normUnit]!;
    }
  }

  // 3. Global default fallbacks by unit
  const globalDefaults: Record<string, number> = {
    tablespoon: 15,
    teaspoon: 5,
    cup: 200,
    clove: 3,
    piece: 100,
    pinch: 0.5,
    slice: 30,
    can: 400,
    bunch: 25,
    handful: 30,
  };

  if (globalDefaults[normUnit] !== undefined) {
    return amount * globalDefaults[normUnit];
  }

  return amount * 100;
}

/**
 * Matches and enriches a single ingredient.
 * If a canonical match is found, updates the nutrients based on the 100g reference values.
 * If unmatched, keeps the AI estimated values as a safe fallback.
 */
export async function matchAndEnrichIngredient(ingredient: Ingredient, groupCategory?: string): Promise<{
  matched: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> {
  const effectiveCategory = ingredient.category || groupCategory;
  const match = await findCanonicalIngredient(
    ingredient.name,
    ingredient.baseName,
    effectiveCategory,
    ingredient.synonyms,
    ingredient.searchQueries,
    ingredient.parentIngredient
  );

  if (!match) {
    ingredient.isVerified = false;
    return {
      matched: false,
      calories: ingredient.calories ?? 0,
      protein: ingredient.protein ?? 0,
      carbs: ingredient.carbs ?? 0,
      fat: ingredient.fat ?? 0,
    };
  }

  const weightGrams = calculateWeightGrams(ingredient.amount, ingredient.unit, match);
  const factor = weightGrams / 100;

  const cal = Math.round(match.nutrients_per_100g.calories * factor);
  const prot = Math.round(match.nutrients_per_100g.protein * factor * 10) / 10;
  const carb = Math.round(match.nutrients_per_100g.carbs * factor * 10) / 10;
  const fat = Math.round(match.nutrients_per_100g.fat * factor * 10) / 10;

  ingredient.canonicalId = match.id;
  ingredient.matchedName = match.name_de;
  ingredient.isVerified = true;
  ingredient.calories = cal;
  ingredient.protein = prot;
  ingredient.carbs = carb;
  ingredient.fat = fat;

  if (!ingredient.category || ingredient.category === 'OTHER') {
    ingredient.category = match.category;
  }

  return { matched: true, calories: cal, protein: prot, carbs: carb, fat };
}

/**
 * Enriches all ingredients in a recipe with canonical nutritional data and
 * computes the recipe-level nutritional values per serving (if not explicitly given).
 */
export async function enrichRecipeWithCanonicalIngredients(recipe: Recipe): Promise<void> {
  if (!recipe || !recipe.ingredients) return;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matchedCount = 0;
  let totalIngredients = 0;

  for (const group of recipe.ingredients) {
    if (!group.items) continue;
    for (const ing of group.items) {
      totalIngredients++;
      const result = await matchAndEnrichIngredient(ing, group.name);
      if (result.matched) {
        matchedCount++;
      }
      totalCalories += result.calories;
      totalProtein += result.protein;
      totalCarbs += result.carbs;
      totalFat += result.fat;
    }
  }

  const servings = recipe.servings > 0 ? recipe.servings : 1;

  // If recipe has no explicit nutritional values or they are all 0, calculate them from the ingredient sum
  if (
    !recipe.nutritionalValues ||
    (recipe.nutritionalValues.calories === 0 &&
      recipe.nutritionalValues.protein === 0 &&
      recipe.nutritionalValues.carbs === 0 &&
      recipe.nutritionalValues.fat === 0)
  ) {
    recipe.nutritionalValues = {
      calories: Math.round(totalCalories / servings),
      protein: Math.round((totalProtein / servings) * 10) / 10,
      carbs: Math.round((totalCarbs / servings) * 10) / 10,
      fat: Math.round((totalFat / servings) * 10) / 10,
    };
  }
}
