import type { CanonicalIngredient } from '../data/canonicalIngredients.js';

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
    .replace(
      /\b(frisch|frische|frischer|frisches|getrocknet|getrocknete|getrockneter|gemahlen|gemahlene|gehackt|gehackte|gewürfelt|geschnitten|gepresst|gepresste|gepresster|gepresstes|püriert|pürierte|püriertes|geschält|geschälte|geschälter|geschältes|gehobelt|gehobelte|gerieben|geriebener|geriebene|abgetropft|fein|grob|kaltgepresst|bio|ungesüßt|gesüßt|vegan|vegetarisch|optional|nach belieben|zum anbraten|zum garnieren|etwas|prise|ca\.?|warm|kalt|heiß|flüssig|weich|hart|reif|unreif|mittelgroß|groß|klein|dünn|dick)\b/gi,
      ' '
    )
    .replace(
      /\b(fresh|dried|ground|minced|chopped|diced|sliced|pressed|pureed|peeled|shaved|grated|drained|fine|coarse|cold-pressed|organic|unsweetened|sweetened|vegan|vegetarian|optional|to taste|for frying|for garnish|some|pinch|approx\.?|warm|cold|hot|liquid|soft|hard|ripe|unripe|medium|large|small|thin|thick)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export { normalizeUnit } from '@cookbook/shared';

/**
 * Normalizes supermarket category names to match canonical categories.
 */
export function normalizeCategory(cat?: string, validCategories?: Set<string>): string | null {
  if (!cat) return null;
  const upper = cat.toUpperCase().trim();
  if (validCategories && validCategories.has(upper)) return upper;
  const mapping: Record<string, string> = {
    PRODUCE: 'FRUITS_VEGETABLES',
    FRUITS: 'FRUITS_VEGETABLES',
    VEGETABLES: 'FRUITS_VEGETABLES',
    OBST: 'FRUITS_VEGETABLES',
    GEMÜSE: 'FRUITS_VEGETABLES',
    'OBST & GEMÜSE': 'FRUITS_VEGETABLES',
    MOLKEREIPRODUKTE: 'DAIRY',
    MILCHPRODUKTE: 'DAIRY',
    KÄSE: 'DAIRY',
    CHEESE: 'DAIRY',
    FLEISCH: 'MEAT_FISH',
    FISCH: 'MEAT_FISH',
    'FLEISCH & FISCH': 'MEAT_FISH',
    MEAT: 'MEAT_FISH',
    FISH: 'MEAT_FISH',
    SEAFOOD: 'MEAT_FISH',
    GETREIDE: 'GRAINS_PASTA',
    NUDELN: 'GRAINS_PASTA',
    PASTA: 'GRAINS_PASTA',
    GRAINS: 'GRAINS_PASTA',
    BACKEN: 'BAKING_COOKING',
    BACKZUTATEN: 'BAKING_COOKING',
    BAKING: 'BAKING_COOKING',
    SPICES: 'SPICES_OILS',
    OILS: 'SPICES_OILS',
    GEWÜRZE: 'SPICES_OILS',
    ÖLE: 'SPICES_OILS',
    'GEWÜRZE & ÖLE': 'SPICES_OILS',
    SWEETS: 'SWEETS_SNACKS',
    SNACKS: 'SWEETS_SNACKS',
    SÜSSWAREN: 'SWEETS_SNACKS',
    BEVERAGES: 'BEVERAGES',
    GETRÄNKE: 'BEVERAGES',
    DRINKS: 'BEVERAGES',
    CANNED: 'CANNED_PRESERVED',
    KONSERVEN: 'CANNED_PRESERVED',
    BREAD: 'BREAD_BAKERY',
    BROT: 'BREAD_BAKERY',
    BACKWAREN: 'BREAD_BAKERY',
  };
  return mapping[upper] || null;
}

/**
 * Builds candidate search queries from raw name, baseName and synonyms.
 */
export function buildSearchQueries(
  name: string,
  baseName?: string,
  synonyms?: string[]
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
 * Simplicity score for choosing between multiple exact alias matches and ranking raw staples.
 */
export function getSimplicityScore(item: CanonicalIngredient): number {
  const de = (item.name_de || '').toLowerCase();
  const en = (item.name_en || '').toLowerCase();
  let score = 100 - de.length;
  if (de.includes('roh') || en.includes('raw')) score += 40;
  if (de.includes('pulver') && !de.includes('backpulver')) score += 25;
  if (
    de.includes('nature') ||
    de.includes('mager') ||
    en.includes('plain') ||
    en.includes('unsalted') ||
    de.includes('trocken')
  ) {
    score += 20;
  }
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
