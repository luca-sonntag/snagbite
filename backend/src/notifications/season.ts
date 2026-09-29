import type { Recipe } from '../types.js';
import type { Season, HolidayEvent } from './types.js';

/**
 * Northern-hemisphere meteorological seasons (month-based). Snagbite's audience
 * is DACH/Europe, so we don't parametrise the hemisphere yet.
 */
export function getSeason(date: Date): Season {
  const m = date.getUTCMonth(); // 0=Jan
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** Seasonal produce / dish keywords (German + English), matched as substrings. */
const SEASON_KEYWORDS: Record<Season, string[]> = {
  spring: ['spargel', 'asparagus', 'rhabarber', 'rhubarb', 'bärlauch', 'radieschen',
    'radish', 'erdbeere', 'strawberry', 'spinat', 'spinach', 'frühling'],
  summer: ['tomate', 'tomato', 'zucchini', 'aubergine', 'eggplant', 'beere', 'berry',
    'wassermelone', 'watermelon', 'mais', 'corn', 'pfirsich', 'peach', 'grill', 'bbq',
    'salat', 'salad', 'melone', 'melon', 'gazpacho'],
  autumn: ['kürbis', 'pumpkin', 'squash', 'apfel', 'apple', 'pilz', 'mushroom',
    'kastanie', 'chestnut', 'birne', 'pear', 'kohl', 'cabbage', 'rote bete', 'beetroot',
    'zwetschke', 'plum', 'herbst'],
  winter: ['grünkohl', 'kale', 'rosenkohl', 'sprout', 'orange', 'mandarine', 'clementine',
    'zimt', 'cinnamon', 'lebkuchen', 'gingerbread', 'eintopf', 'stew', 'suppe', 'soup',
    'fondue', 'raclette', 'braten', 'roast', 'glühwein'],
};

/** Keywords for the currently active season. */
export function seasonKeywords(season: Season): string[] {
  return SEASON_KEYWORDS[season];
}

/**
 * Date-window calendar events. Kept intentionally small and DACH-flavoured;
 * Easter and other movable feasts are omitted (they need a calendar library).
 */
export function getActiveHolidays(date: Date): HolidayEvent[] {
  const m = date.getUTCMonth() + 1; // 1=Jan
  const d = date.getUTCDate();
  const events: HolidayEvent[] = [];

  const inWindow = (mm: number, from: number, to: number) => m === mm && d >= from && d <= to;

  if (inWindow(2, 8, 14)) {
    events.push({
      id: 'valentine',
      label: "Valentine's Day (romantic dinner for two)",
      keywords: ['schokolade', 'chocolate', 'dessert', 'herz', 'romantic', 'pasta', 'steak', 'kuchen', 'cake'],
    });
  }
  if (inWindow(12, 20, 26)) {
    events.push({
      id: 'christmas',
      label: 'Christmas (festive baking & roasts)',
      keywords: ['keks', 'cookie', 'plätzchen', 'braten', 'roast', 'lebkuchen', 'gingerbread', 'gans', 'goose', 'zimt', 'cinnamon'],
    });
  }
  // Silvester / New Year: late Dec into Jan 1.
  if ((m === 12 && d >= 28) || (m === 1 && d === 1)) {
    events.push({
      id: 'new_year',
      label: "New Year's Eve (fondue, raclette, party finger food)",
      keywords: ['fondue', 'raclette', 'dip', 'fingerfood', 'party', 'bowle', 'snack', 'häppchen'],
    });
  }
  // Grilling season, weekends handled elsewhere — this is the broad summer nudge.
  if (m >= 6 && m <= 8) {
    events.push({
      id: 'grill_season',
      label: 'Grilling season (BBQ, salads, outdoor food)',
      keywords: ['grill', 'bbq', 'steak', 'burger', 'salat', 'salad', 'spieß', 'skewer', 'marinade'],
    });
  }

  return events;
}

/**
 * Lowercased haystack of a recipe's searchable text: title, tags, and ingredient
 * baseNames. Used for keyword matching by seasonal / holiday / ingredient types.
 */
export function recipeHaystack(recipe: Recipe): string {
  const parts: string[] = [recipe.title || ''];
  if (recipe.tags) parts.push(...recipe.tags);
  for (const item of recipe.ingredients || []) {
    if (item.baseName) parts.push(item.baseName);
    if (item.name) parts.push(item.name);
  }
  return parts.join(' ').toLowerCase();
}

/** Count how many of `keywords` appear in the recipe's haystack. */
export function countKeywordMatches(recipe: Recipe, keywords: string[]): number {
  const hay = recipeHaystack(recipe);
  let n = 0;
  for (const kw of keywords) {
    if (hay.includes(kw)) n++;
  }
  return n;
}
