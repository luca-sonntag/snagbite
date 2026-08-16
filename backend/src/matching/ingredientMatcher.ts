import MiniSearch from 'minisearch';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import { config } from '../config.js';
import { CANONICAL_INGREDIENTS, type CanonicalIngredient } from '../data/canonicalIngredients.js';
import { BASE_NAME_TO_CANONICAL_ID } from './baseNameMap.js';
import type { Recipe, Ingredient, ParentIngredientInfo } from '../types.js';

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
    de.includes('paniert') ||
    de.includes('frittiert')
  ) {
    score -= 30;
  }
  return score;
}

// Populate indexes
for (const item of CANONICAL_INGREDIENTS) {
  // Index by id (e.g. bls_m111300) and clean code (e.g. m111300)
  byId.set(item.id.toLowerCase().trim(), item);
  if (item.bls_code) {
    byId.set(item.bls_code.toLowerCase().trim(), item);
  }

  const aliases = [
    item.name_de,
    item.name_en,
    ...(item.aliases || []),
    ...(item.search_terms_de || []),
    ...(item.search_terms_en || []),
  ].filter(Boolean);

  const cleanAliases: string[] = [];
  for (const alias of aliases) {
    const norm = normalizeSearchTerm(alias);
    if (!norm) continue;
    cleanAliases.push(norm);

    const existing = byAlias.get(norm);
    if (!existing || getSimplicityScore(item) > getSimplicityScore(existing)) {
      byAlias.set(norm, item);
    }
  }

  if (item.name_de) {
    const normDe = normalizeSearchTerm(item.name_de);
    const existing = byNameDe.get(normDe);
    if (!existing || getSimplicityScore(item) > getSimplicityScore(existing)) {
      byNameDe.set(normDe, item);
    }
  }

  if (item.name_en) {
    const normEn = normalizeSearchTerm(item.name_en);
    const existing = byNameEn.get(normEn);
    if (!existing || getSimplicityScore(item) > getSimplicityScore(existing)) {
      byNameEn.set(normEn, item);
    }
  }

  const indexedItem: IndexedIngredient = {
    ...item,
    search_aliases: Array.from(new Set(cleanAliases)).join(' '),
  };

  allIndexedItems.push(indexedItem);

  const cat = item.category || 'OTHER';
  if (!itemsByCategory.has(cat)) {
    itemsByCategory.set(cat, []);
  }
  itemsByCategory.get(cat)!.push(indexedItem);
}

// Build MiniSearch indexes
const miniSearchOptions = {
  fields: ['name_de', 'name_en', 'search_aliases'],
  storeFields: ['id', 'name_de', 'name_en', 'category', 'bls_code'],
  searchOptions: {
    boost: { name_de: 3.0, search_aliases: 2.5, name_en: 1.0 },
    fuzzy: 0.2,
    prefix: false,
  },
};

const categoryMiniSearchMap = new Map<string, MiniSearch<IndexedIngredient>>();
for (const [cat, items] of itemsByCategory.entries()) {
  const ms = new MiniSearch<IndexedIngredient>(miniSearchOptions);
  ms.addAll(items);
  categoryMiniSearchMap.set(cat, ms);
}

const globalMiniSearch = new MiniSearch<IndexedIngredient>(miniSearchOptions);
globalMiniSearch.addAll(allIndexedItems);

// Lazy Gemini client initialization
let genAIInstance: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI | null {
  if (!genAIInstance && config.GEMINI_API_KEY) {
    genAIInstance = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAIInstance;
}

/**
 * Cleans punctuation, parentheses, brackets, quantities, and superfluous culinary adjectives.
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  return term
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[,;:\/\\+*&]/g, ' ')
    .replace(/\b(frisch|frische|frischer|frisches|getrocknet|getrocknete|getrockneter|gemahlen|gemahlene|gehackt|gehackte|gewürfelt|geschnitten|gepresst|gepresste|gepresster|gepresstes|püriert|pürierte|püriertes|geschält|geschälte|geschälter|geschältes|gehobelt|gehobelte|gerieben|geriebener|geriebene|abgetropft|fein|grob|kaltgepresst|bio|ungesüßt|gesüßt|vegan|vegetarisch|optional|nach belieben|zum anbraten|zum garnieren|etwas|prise|ca\.?|warm|kalt|heiß|flüssig|weich|hart|reif|unreif|mittelgroß|groß|klein|dünn|dick)\b/gi, ' ')
    .replace(/\b(fresh|dried|ground|minced|chopped|diced|sliced|pressed|pureed|peeled|shaved|grated|drained|fine|coarse|cold-pressed|organic|unsweetened|sweetened|vegan|vegetarian|optional|to taste|for frying|for garnish|some|pinch|approx\.?|warm|cold|hot|liquid|soft|hard|ripe|unripe|medium|large|small|thin|thick)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes culinary measurement units to canonical keys.
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return 'piece';
  const u = unit.toLowerCase().trim();
  if (['g', 'gramm', 'grams', 'gram', 'gr', 'g.'].includes(u)) return 'g';
  if (['kg', 'kilogramm', 'kilograms', 'kilo'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'milliliters'].includes(u)) return 'ml';
  if (['l', 'liter', 'liters', 'ltr'].includes(u)) return 'l';
  if (['el', 'esslöffel', 'tbsp', 'tablespoon', 'tablespoons'].includes(u)) return 'tablespoon';
  if (['tl', 'teelöffel', 'tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'teaspoon';
  if (['stk', 'stück', 'stueck', 'piece', 'pieces', 'pc', 'pcs', 'x'].includes(u)) return 'piece';
  if (['prise', 'prisen', 'pinch', 'pinches'].includes(u)) return 'pinch';
  if (['zehe', 'zehen', 'clove', 'cloves'].includes(u)) return 'clove';
  if (['scheibe', 'scheiben', 'slice', 'slices'].includes(u)) return 'slice';
  if (['dose', 'dosen', 'can', 'cans', 'tin'].includes(u)) return 'can';
  if (['bund', 'bunch', 'bunches'].includes(u)) return 'bunch';
  if (['handvoll', 'handful'].includes(u)) return 'handful';
  if (['tasse', 'tassen', 'cup', 'cups'].includes(u)) return 'cup';
  return 'piece';
}

/**
 * Normalizes supermarket category names to match canonical BLS categories.
 */
function normalizeCategory(cat?: string): string | null {
  if (!cat) return null;
  const upper = cat.toUpperCase().trim();
  if (itemsByCategory.has(upper)) return upper;
  const mapping: Record<string, string> = {
    'PRODUCE': 'FRUITS_VEGETABLES',
    'FRUITS': 'FRUITS_VEGETABLES',
    'VEGETABLES': 'FRUITS_VEGETABLES',
    'OBST': 'FRUITS_VEGETABLES',
    'GEMÜSE': 'FRUITS_VEGETABLES',
    'OBST & GEMÜSE': 'FRUITS_VEGETABLES',
    'MOLKEREIPRODUKTE': 'DAIRY',
    'MILCHPRODUKTE': 'DAIRY',
    'KÄSE': 'DAIRY',
    'CHEESE': 'DAIRY',
    'FLEISCH': 'MEAT_FISH',
    'FISCH': 'MEAT_FISH',
    'FLEISCH & FISCH': 'MEAT_FISH',
    'MEAT': 'MEAT_FISH',
    'FISH': 'MEAT_FISH',
    'SEAFOOD': 'MEAT_FISH',
    'GETREIDE': 'GRAINS_PASTA',
    'NUDELN': 'GRAINS_PASTA',
    'PASTA': 'GRAINS_PASTA',
    'GRAINS': 'GRAINS_PASTA',
    'BACKEN': 'BAKING_COOKING',
    'BACKZUTATEN': 'BAKING_COOKING',
    'BAKING': 'BAKING_COOKING',
    'SPICES': 'SPICES_OILS',
    'OILS': 'SPICES_OILS',
    'GEWÜRZE': 'SPICES_OILS',
    'ÖLE': 'SPICES_OILS',
    'GEWÜRZE & ÖLE': 'SPICES_OILS',
    'SWEETS': 'SWEETS_SNACKS',
    'SNACKS': 'SWEETS_SNACKS',
    'SÜSSWAREN': 'SWEETS_SNACKS',
    'BEVERAGES': 'BEVERAGES',
    'GETRÄNKE': 'BEVERAGES',
    'DRINKS': 'BEVERAGES',
    'CANNED': 'CANNED_PRESERVED',
    'KONSERVEN': 'CANNED_PRESERVED',
    'BREAD': 'BREAD_BAKERY',
    'BROT': 'BREAD_BAKERY',
    'BACKWAREN': 'BREAD_BAKERY',
  };
  return mapping[upper] || null;
}

/**
 * Builds candidate search queries from raw name, baseName, synonyms and searchQueries.
 */
function buildSearchQueries(
  name: string,
  baseName?: string,
  synonyms?: string[],
  searchQueries?: string[]
): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  const add = (q?: string) => {
    if (!q) return;
    const clean = normalizeSearchTerm(q);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      queries.push(clean);
    }
  };

  add(name);
  add(baseName);

  if (searchQueries && Array.isArray(searchQueries)) {
    for (const sq of searchQueries) add(sq);
  }

  if (synonyms && Array.isArray(synonyms)) {
    for (const syn of synonyms) add(syn);
  }

  if (name.includes(' ') || name.includes('-')) {
    const words = name.split(/[\s-]+/).map(normalizeSearchTerm).filter(w => w.length > 2);
    for (const w of words) add(w);
    if (words.length >= 2) {
      add(words[words.length - 1]);
    }
  }

  return queries;
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
 * Stage 0 & Stage 1: Synchronous O(1) Fast-Path lookup.
 * Covers 92%+ of all ingredients instantly in 0 ms.
 */
export function findFastPathMatch(
  name: string,
  baseName?: string,
  category?: string,
  synonyms?: string[],
  searchQueries?: string[],
  parentIngredient?: ParentIngredientInfo
): CanonicalIngredient | null {
  const isPowderQuery = /\b(pulver|powder)\b/i.test(name) || /\b(pulver|powder)\b/i.test(baseName || '');

  // 0. Stage 0: Universal BaseName Fast-Path (authoritative direct English key match + safe singularizer)
  if (baseName) {
    const normBase = baseName.toLowerCase().trim();
    const singular = toEnglishSingular(normBase);
    const mappedId = BASE_NAME_TO_CANONICAL_ID[normBase] || BASE_NAME_TO_CANONICAL_ID[singular];
    if (mappedId) {
      const item = byId.get(mappedId.toLowerCase().trim()) || byId.get('bls_' + mappedId.toLowerCase().trim());
      if (item) return item;
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

  return null;
}

/**
 * Stage 2: MiniSearch BM25 candidate retrieval with domain guards.
 */
export function getMiniSearchCandidates(
  name: string,
  baseName?: string,
  category?: string,
  synonyms?: string[],
  searchQueries?: string[],
  limit = 8
): CanonicalIngredient[] {
  const cleanCategory = normalizeCategory(category);
  const targetMiniSearch = cleanCategory && categoryMiniSearchMap.has(cleanCategory) ? categoryMiniSearchMap.get(cleanCategory)! : null;
  const searchEngine = targetMiniSearch || globalMiniSearch;
  const queriesToTest = buildSearchQueries(name, baseName, synonyms, searchQueries);

  const candidateMap = new Map<string, { item: CanonicalIngredient; score: number }>();
  const lowerQuery = (name + ' ' + (baseName || '')).toLowerCase();

  for (const q of queriesToTest) {
    if (q.length < 2) continue;
    const results = searchEngine.search(q, {
      boost: { name_de: 3.0, search_aliases: 2.5, name_en: 1.0 },
      fuzzy: q.length >= 5 ? 0.2 : false,
      prefix: false,
      combineWith: 'OR',
    });

    for (const r of results.slice(0, limit)) {
      if (!candidateMap.has(r.id)) {
        const item = byId.get(r.id);
        if (item) {
          candidateMap.set(r.id, { item, score: r.score });
        }
      }
    }
  }

  const filtered: CanonicalIngredient[] = [];

  for (const { item } of candidateMap.values()) {
    const candDe = (item.name_de || '').toLowerCase();

    // Never match fitness protein powder to baking leavening agents (Backpulver/Natron)
    const isBakingLeavening = item.bls_code?.startsWith('R42') || candDe.includes('backpulver') || candDe.includes('natron');
    const isLeaveningQuery = /\b(backpulver|natron|baking powder|baking soda|leavening)\b/i.test(lowerQuery);
    if (!isLeaveningQuery && isBakingLeavening) continue;

    // Flour vs Pastry guard
    if (/\b(mehl|flour)\b/i.test(lowerQuery) && (candDe.includes('kuchen') || candDe.includes('torte') || candDe.includes('gebäck') || item.bls_code?.startsWith('D4'))) {
      continue;
    }

    // Spice vs Sauce guard
    const isSpiceQuery = (cleanCategory === 'SPICES_OILS' || /\b(pulver|powder|gewürz|spice)\b/i.test(lowerQuery)) && !/\b(ketchup|sauce|soße|dressing|dip)\b/i.test(lowerQuery);
    if (isSpiceQuery && (candDe.includes('ketchup') || candDe.includes('sauce') || candDe.includes('soße') || candDe.includes('dressing'))) {
      continue;
    }

    // Pesto vs Dried herbs guard
    if (/\bpesto\b/i.test(lowerQuery) && (candDe.includes('getrocknet') || candDe.includes('blatt') || item.category === 'FRUITS_VEGETABLES')) {
      continue;
    }

    // Pulver/Powder guard
    if (/\b(pulver|powder)\b/i.test(lowerQuery) && item.category === 'FRUITS_VEGETABLES' && !candDe.includes('pulver') && !candDe.includes('powder') && !candDe.includes('getrocknet')) {
      continue;
    }

    // Poultry vs Beef/Offal guard
    const isPoultryQuery = /\b(hähnchen|huhn|hühner|geflügel|pute|truthahn|chicken|turkey)\b/i.test(lowerQuery);
    if (isPoultryQuery && (item.bls_code?.startsWith('U') || candDe.includes('leber') || candDe.includes('niere') || candDe.includes('schwein') || candDe.includes('rind'))) {
      continue;
    }

    // Seasoning vs Animal Fat guard
    const isSeasoningQuery = /\b(gewürz|seasoning|rub)\b/i.test(lowerQuery);
    if (isSeasoningQuery && (item.category === 'SPICES_OILS' || item.bls_code?.startsWith('Q')) && (candDe.includes('fett') || candDe.includes('schmalz') || candDe.includes('talg'))) {
      continue;
    }

    // Nutmeg vs Tree Nuts guard
    if (/\b(muskat|muskatnuss|nutmeg)\b/i.test(lowerQuery) && (item.category === 'NUTS_SEEDS' || item.bls_code?.startsWith('H1') || item.bls_code?.startsWith('H2') || candDe.includes('walnuss') || candDe.includes('haselnuss'))) {
      continue;
    }

    // Pure spice/seasoning vs Meat/Fish/Prepared Dishes guard
    const isPureSpiceQuery = /\b(pulver|powder|gewürz|seasoning|rub|salz|salt|flocken|flakes)\b/i.test(lowerQuery) && !/\b(fleisch|meat|fish|fisch|lachs|salmon|currywurst|suppe|soup)\b/i.test(lowerQuery);
    if (isPureSpiceQuery && (item.category === 'MEAT_FISH' || item.category === 'READY_MEALS' || item.bls_code?.startsWith('T') || item.bls_code?.startsWith('U') || item.bls_code?.startsWith('V') || item.bls_code?.startsWith('W') || item.bls_code?.startsWith('X') || item.bls_code?.startsWith('Y') || candDe.includes('geräuchert') || candDe.includes('gebraten') || candDe.includes('gegrillt') || candDe.includes('pommes'))) {
      continue;
    }

    // Broth vs Animal Fat guard
    const isBrothQuery = /\b(brühe|bouillon|broth|stock|fond)\b/i.test(lowerQuery);
    if (isBrothQuery && (item.category === 'SPICES_OILS' || item.bls_code?.startsWith('Q') || candDe.includes('fett') || candDe.includes('talg') || candDe.includes('schmalz'))) {
      continue;
    }

    // Pastry/Cookies vs Meat Substitute guard
    const isPastryQuery = /\b(keks|kuchen|torte|gebäck|cookie|biscuit|pastry)\b/i.test(lowerQuery);
    if (isPastryQuery && (item.bls_code?.startsWith('H91') || candDe.includes('schnitzel') || candDe.includes('bratwurst') || candDe.includes('frikadelle'))) {
      continue;
    }

    // Chili flakes vs Grain Flakes guard
    const isChiliFlakesQuery = /\b(chili|chilikörner|chiliflocken|pepper flakes)\b/i.test(lowerQuery);
    if (isChiliFlakesQuery && (item.category === 'GRAINS_PASTA' || candDe.includes('haferflocken') || candDe.includes('dinkelflocken'))) {
      continue;
    }

    filtered.push(item);
    if (filtered.length >= limit) break;
  }

  return filtered;
}

export interface UnmatchedBatchItem {
  id: string;
  name: string;
  baseName?: string;
  category?: string;
  candidates: CanonicalIngredient[];
}

/**
 * Stage 3: Batch LLM Reranker with Gemini Flash-Lite.
 * Executes ONE single lightweight Multiple-Choice call for all unmatched items in the recipe.
 */
export async function rerankIngredientsBatchWithGemini(
  unmatchedItems: UnmatchedBatchItem[]
): Promise<Map<string, CanonicalIngredient | null>> {
  const resultMap = new Map<string, CanonicalIngredient | null>();
  if (!unmatchedItems || unmatchedItems.length === 0) {
    return resultMap;
  }

  const genAI = getGenAI();
  if (!genAI) {
    // Graceful fallback when no API key is available
    for (const item of unmatchedItems) {
      resultMap.set(item.id, item.candidates[0] || null);
    }
    return resultMap;
  }

  const modelName = config.GEMINI_RERANKER_MODEL || 'gemini-3.1-flash-lite';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          matches: {
            type: FunctionDeclarationSchemaType.ARRAY,
            items: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                id: { type: FunctionDeclarationSchemaType.STRING },
                selectedCode: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description: 'The exact BLS code from the candidate list that is an accurate nutritional food match, or empty/null if none of the candidates match accurately.',
                },
              },
              required: ['id'],
            },
          },
        },
        required: ['matches'],
      },
      temperature: 0,
    },
    systemInstruction: `You are an expert culinary nutrition scientist.
Your task is to match recipe ingredients to their authoritative food database entries (BLS).
For each ingredient in the input list:
- Inspect the recipe ingredient name and baseName.
- Review the provided BLS candidates.
- If one candidate accurately represents the ingredient nutritionally and culinarily (e.g. matching a specific vegetable, cut of meat, dairy staple, grain or oil), select its exact code.
- CRITICAL ANTI-HALLUCINATION RULE: If NONE of the candidates accurately represent the ingredient (e.g., matching a dry spice/powder to a whole fresh fruit or fish, matching an exotic unlisted item to a random food), you MUST set selectedCode to null or empty string. NEVER pick a candidate just because it's in the list. Accuracy is paramount.`,
  });

  const promptPayload = unmatchedItems.map(item => ({
    id: item.id,
    ingredientName: item.name,
    baseName: item.baseName || '',
    category: item.category || '',
    candidates: item.candidates.map(c => ({
      code: c.bls_code || c.id,
      name_de: c.name_de,
      name_en: c.name_en || '',
      category: c.category,
    })),
  }));

  try {
    const promptText = `Match the following ${unmatchedItems.length} ingredients to their best BLS candidate:\n${JSON.stringify(promptPayload, null, 2)}`;
    const res = await model.generateContent(promptText);
    const rawText = res.response.text();
    const parsed = JSON.parse(rawText);

    if (parsed && Array.isArray(parsed.matches)) {
      for (const match of parsed.matches) {
        const item = unmatchedItems.find(u => u.id === match.id);
        if (item && match.selectedCode) {
          const cleanCode = String(match.selectedCode).toLowerCase().trim();
          const canonical = byId.get(cleanCode) || byId.get('bls_' + cleanCode);
          // Verify that the selected code was indeed in this item's candidate list
          const isLegitCandidate = item.candidates.some(
            c => (c.bls_code && c.bls_code.toLowerCase() === cleanCode) || c.id.toLowerCase() === cleanCode
          );
          if (canonical && isLegitCandidate) {
            resultMap.set(match.id, canonical);
            continue;
          }
        }
        resultMap.set(match.id, null);
      }
    }
  } catch (err: any) {
    console.warn(`[ingredientMatcher] Gemini batch rerank failed (${modelName}):`, err.message);
    for (const item of unmatchedItems) {
      resultMap.set(item.id, null);
    }
  }

  // Ensure all items have an entry
  for (const item of unmatchedItems) {
    if (!resultMap.has(item.id)) {
      resultMap.set(item.id, null);
    }
  }

  return resultMap;
}

/**
 * Finds a matching canonical ingredient using Stage 0 Fast-Path -> Stage 1 Alias -> Stage 2 MiniSearch + Gemini Rerank.
 * (Convenience method for standalone lookups / unit tests).
 */
export async function findCanonicalIngredient(
  name: string,
  baseName?: string,
  category?: string,
  synonyms?: string[],
  searchQueries?: string[],
  parentIngredient?: ParentIngredientInfo
): Promise<CanonicalIngredient | null> {
  // 1. Synchronous Fast-Path
  const fast = findFastPathMatch(name, baseName, category, synonyms, searchQueries, parentIngredient);
  if (fast) return fast;

  // 2. MiniSearch BM25 candidates
  const candidates = getMiniSearchCandidates(name, baseName, category, synonyms, searchQueries, 6);
  if (candidates.length === 0) return null;

  // 3. Batch rerank for single item
  const batchItem: UnmatchedBatchItem = {
    id: 'single_item',
    name,
    baseName,
    category,
    candidates,
  };

  const rerankResults = await rerankIngredientsBatchWithGemini([batchItem]);
  return rerankResults.get('single_item') || null;
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
 * computes the recipe-level nutritional values per serving.
 * 
 * Executes Fast-Path instantly in 0 ms, and gathers all remaining unverified items
 * into ONE single batch call to Gemini Flash-Lite for maximum speed and lowest cost.
 */
export async function enrichRecipeWithCanonicalIngredients(recipe: Recipe): Promise<void> {
  if (!recipe || !recipe.ingredients) return;

  const flatItems: Array<{ ing: Ingredient; groupName?: string; id: string }> = [];
  let itemCounter = 0;

  for (const group of recipe.ingredients) {
    if (!group.items) continue;
    for (const ing of group.items) {
      flatItems.push({ ing, groupName: group.name, id: `item_${itemCounter++}` });
    }
  }

  if (flatItems.length === 0) return;

  const matchedCanonicalMap = new Map<string, CanonicalIngredient | null>();
  const unmatchedForBatch: UnmatchedBatchItem[] = [];

  // Phase 1: Fast-Path for all items
  for (const { ing, groupName, id } of flatItems) {
    const effectiveCategory = ing.category || groupName;
    const fastMatch = findFastPathMatch(
      ing.name,
      ing.baseName,
      effectiveCategory,
      ing.synonyms,
      ing.searchQueries,
      ing.parentIngredient
    );

    if (fastMatch) {
      matchedCanonicalMap.set(id, fastMatch);
    } else {
      const candidates = getMiniSearchCandidates(
        ing.name,
        ing.baseName,
        effectiveCategory,
        ing.synonyms,
        ing.searchQueries,
        6
      );
      if (candidates.length > 0) {
        unmatchedForBatch.push({
          id,
          name: ing.name,
          baseName: ing.baseName,
          category: effectiveCategory,
          candidates,
        });
      } else {
        matchedCanonicalMap.set(id, null);
      }
    }
  }

  // Phase 2: Single Batch Reranker Call for all remaining unmatched items
  if (unmatchedForBatch.length > 0) {
    const batchResults = await rerankIngredientsBatchWithGemini(unmatchedForBatch);
    for (const [id, canonical] of batchResults.entries()) {
      matchedCanonicalMap.set(id, canonical);
    }
  }

  // Phase 3: Apply nutritional calculation to all recipe ingredients
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const { ing, id } of flatItems) {
    const match = matchedCanonicalMap.get(id);
    if (!match) {
      ing.isVerified = false;
      totalCalories += ing.calories ?? 0;
      totalProtein += ing.protein ?? 0;
      totalCarbs += ing.carbs ?? 0;
      totalFat += ing.fat ?? 0;
      continue;
    }

    const weightGrams = calculateWeightGrams(ing.amount, ing.unit, match);
    const factor = weightGrams / 100;

    const cal = Math.round(match.nutrients_per_100g.calories * factor);
    const prot = Math.round(match.nutrients_per_100g.protein * factor * 10) / 10;
    const carb = Math.round(match.nutrients_per_100g.carbs * factor * 10) / 10;
    const fat = Math.round(match.nutrients_per_100g.fat * factor * 10) / 10;

    ing.canonicalId = match.id;
    ing.matchedName = match.name_de;
    ing.isVerified = true;
    ing.calories = cal;
    ing.protein = prot;
    ing.carbs = carb;
    ing.fat = fat;

    if (!ing.category || ing.category === 'OTHER') {
      ing.category = match.category;
    }

    totalCalories += cal;
    totalProtein += prot;
    totalCarbs += carb;
    totalFat += fat;
  }

  const servings = recipe.servings > 0 ? recipe.servings : 1;

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
