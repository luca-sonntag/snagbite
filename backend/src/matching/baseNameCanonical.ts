/**
 * Deterministic canonicalization of ingredient base names into cache keys.
 *
 * The LLM produces `baseName` as free text, so the same food arrives as
 * "bacon cubes", "Bacon", "bacon" across recipes. That variance is what keeps a
 * learned mapping store from ever hitting. This module collapses those spellings
 * to one key — in code, with no model call, so the result never drifts.
 *
 * Design rule: the two failure directions are NOT symmetric.
 * - Stripping too little → a more specific key → cache miss → resolver runs. Costs a call.
 * - Stripping too much → two different foods share a key → wrong nutrition, stored
 *   globally, for everyone.
 * The removal list below is therefore deliberately conservative: it contains only
 * words describing cut, size or handling, never words that change what the food is.
 * "powder", "flour", "ground", "smoked", "dried" and friends are explicitly NOT
 * removed — "paprika powder" is a different food from "paprika".
 */

/**
 * Cut / size / handling words only. Removing any of these must never change which
 * food is meant. When in doubt, leave a word out of this list.
 */
const NOISE_WORDS = new Set([
  // English — cut, preparation & handling
  'chopped', 'diced', 'sliced', 'minced', 'shredded', 'grated', 'crushed', 'cubed',
  'cube', 'cubes', 'halved', 'quartered', 'drained', 'rinsed', 'washed', 'trimmed',
  'crumbled', 'torn', 'pitted', 'stemmed', 'cut', 'steamed', 'boiled', 'peeled',
  'baked', 'roasted',
  // English — size & quality
  'fresh', 'large', 'small', 'medium', 'big', 'ripe', 'good', 'quality',
  'optional', 'plain',
]);

/**
 * Identity-bearing words. Present as a guard: if one of these is ever added to
 * NOISE_WORDS by accident, canonicalization would silently merge distinct foods.
 * They are filtered back out of the removal set at module load.
 */
const PROTECTED_WORDS = new Set([
  'powder', 'flour', 'oil', 'juice', 'sauce', 'paste', 'milk', 'cheese', 'butter', 'cream',
  'flakes', 'seed', 'seeds', 'meal', 'syrup', 'extract', 'vinegar', 'broth', 'stock',
  'water', 'zest', 'peel', 'ground', 'dried', 'smoked', 'raw', 'cooked',
  'yolk', 'white', 'breast', 'thigh', 'leg', 'wing', 'mince', 'salt',
  'sugar', 'honey', 'wine', 'beer', 'heart', 'liver', 'tongue', 'kidney',
  'chicken', 'beef', 'pork', 'turkey', 'duck', 'lamb', 'veal', 'goose',
]);

for (const word of PROTECTED_WORDS) NOISE_WORDS.delete(word);

/**
 * Top kitchen staples synonym normalization map (100% English).
 * Ensures model variances like "scallion", "oats", "curd"
 * collapse deterministically to their standard canonical baseNames.
 */
const CANONICAL_SYNONYMS: Record<string, string> = {
  'oat': 'rolled oat',
  'oats': 'rolled oat',
  'oat flake': 'rolled oat',
  'oat flakes': 'rolled oat',
  'scallion': 'spring onion',
  'green onion': 'spring onion',
  'salad onion': 'spring onion',
  'garbanzo bean': 'chickpea',
  'garbanzo': 'chickpea',
  'curd cheese': 'quark',
  'ground meat': 'ground beef',
  'sweet pepper': 'bell pepper',
  'bellpepper': 'bell pepper',
  'capsicum': 'bell pepper',
  'black peppercorn': 'black pepper',
  'black peppercorns': 'black pepper',
  'ground black pepper': 'black pepper',
  'heavy whipping cream': 'heavy cream',
  'whipping cream': 'heavy cream',
  'sour cream': 'sour cream',
};

/** Leading articles and quantifiers that carry no food identity. */
const LEADING_FILLER = new Set(['a', 'an', 'the', 'of', 'some']);

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

  // 6. German culinary plurals: -eln (Zwiebeln -> Zwiebel, Röstzwiebeln -> Röstzwiebel, Kartoffeln -> Kartoffel)
  if (lower.endsWith('eln') && lower.length > 4) {
    return lower.slice(0, -1);
  }

  // 7. German culinary plurals: -en / -n after common vowels (Gurken -> Gurke, Tomaten -> Tomate, Erdbeeren -> Erdbeere)
  if (/(?:ke|te|be|re|ne|se|ze|ge|de|fe|le|me)n$/.test(lower) && lower.length > 4) {
    return lower.slice(0, -1);
  }

  return lower;
}

/**
 * Reduces a raw base name to its deterministic cache key.
 *
 * Pure and synchronous: same input always yields the same output, independent of
 * model, prompt or recipe context. An empty or unusable input yields ''.
 */
export function canonicalizeBaseName(raw: string | undefined | null): string {
  if (!raw) return '';

  let text = String(raw)
    .toLowerCase()
    .normalize('NFC')
    // Parenthesised asides never carry the head noun.
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    // Quantities and units glued to the name ("500 g bacon").
    .replace(/\d+([.,]\d+)?/g, ' ')
    // Separators → space. Hyphens included so "cold-pressed" splits into words.
    .replace(/[,;:/\\+*&_."'`´’]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  let words = text.split(' ').filter(Boolean);

  // Drop leading filler, but never reduce the name to nothing.
  while (words.length > 1 && LEADING_FILLER.has(words[0])) words.shift();

  const kept = words.filter(w => !NOISE_WORDS.has(w));
  // If every word was noise the input was pure description — keep the original
  // words rather than emitting an empty key.
  words = kept.length > 0 ? kept : words;

  // Singularize the head noun only. English compounds keep their modifier intact
  // ("chicken breasts" → "chicken breast", never "chicken breas").
  const last = words.length - 1;
  words[last] = toEnglishSingular(words[last]);

  const joined = words.join(' ').trim();
  return CANONICAL_SYNONYMS[joined] || joined;
}

/**
 * Canonical mapping keys under which a resolved mapping is queried and stored.
 *
 * Prioritizes the model's standardized English `baseName` (e.g. "cottage cheese", "rolled oat").
 * Includes `rawName` for bilingual German-English cross-matching and appends canonicalized `synonyms`.
 * Ensures full bidirectional mapping and alias discovery in ingredient_mappings.
 */
export function buildMappingKeys(
  baseName?: string,
  rawName?: string,
  synonyms?: string[],
  parentIngredient?: { name?: string; baseName?: string } | null
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  const addKey = (k?: string) => {
    if (!k) return;
    const clean = canonicalizeBaseName(k);
    if (clean && clean.length >= 2 && !seen.has(clean)) {
      seen.add(clean);
      keys.push(clean);
    }
  };

  const isSpecificModifier =
    Boolean(rawName) &&
    /(?:^|\b)(?:mager|zero|light|diet|skimmed|entrahmt|fettarm)/i.test(rawName!) &&
    (!baseName || !/(?:^|\b)(?:mager|zero|light|diet|skimmed|entrahmt|fettarm)/i.test(baseName));

  if (isSpecificModifier) {
    addKey(rawName);
  } else {
    addKey(baseName);
    addKey(rawName);
  }

  if (parentIngredient) {
    addKey(parentIngredient.baseName);
    addKey(parentIngredient.name);
  }

  if (Array.isArray(synonyms)) {
    for (const syn of synonyms) {
      if (isSpecificModifier) {
        if (/(?:^|\b)(?:mager|zero|light|diet|skimmed|entrahmt|fettarm)/i.test(syn)) {
          addKey(syn);
        }
      } else {
        addKey(syn);
      }
    }
  }

  return keys;
}
