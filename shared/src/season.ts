import type { HolidayEvent, Season, SharedRecipe } from './types.js';

/**
 * Northern-hemisphere meteorological seasons (month-based).
 * DACH/Europe audience.
 */
export function getSeason(date: Date): Season {
  const m = date.getUTCMonth(); // 0=Jan
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** Seasonal produce / dish keywords (German + English), matched as substrings. */
export const SEASON_KEYWORDS: Record<Season, string[]> = {
  spring: [
    'spargel', 'asparagus', 'rhabarber', 'rhubarb', 'bärlauch', 'radieschen',
    'radish', 'erdbeere', 'strawberry', 'spinat', 'spinach', 'frühling', 'spring',
    'lamm', 'lamb', 'morchel', 'morel', 'kresse', 'cress'
  ],
  summer: [
    'tomate', 'tomato', 'zucchini', 'aubergine', 'eggplant', 'beere', 'berry',
    'wassermelone', 'watermelon', 'mais', 'corn', 'pfirsich', 'peach', 'grill', 'bbq',
    'salat', 'salad', 'melone', 'melon', 'gazpacho', 'gurke', 'cucumber', 'paprika',
    'sommer', 'summer'
  ],
  autumn: [
    'kürbis', 'pumpkin', 'squash', 'apfel', 'apple', 'pilz', 'mushroom',
    'kastanie', 'chestnut', 'birne', 'pear', 'kohl', 'cabbage', 'rote bete', 'beetroot',
    'zwetschke', 'zwetschge', 'plum', 'herbst', 'autumn', 'maronen', 'feige', 'fig', 'walnuss', 'walnut'
  ],
  winter: [
    'grünkohl', 'kale', 'rosenkohl', 'sprout', 'orange', 'mandarine', 'clementine',
    'zimt', 'cinnamon', 'lebkuchen', 'gingerbread', 'eintopf', 'stew', 'suppe', 'soup',
    'fondue', 'raclette', 'braten', 'roast', 'glühwein', 'winter'
  ],
};

/** Keywords for the currently active season. */
export function seasonKeywords(season: Season): string[] {
  return SEASON_KEYWORDS[season];
}

/**
 * Date-window calendar events and culinary seasons (DACH-flavoured).
 */
export function getActiveHolidays(date: Date): HolidayEvent[] {
  const m = date.getUTCMonth() + 1; // 1=Jan
  const d = date.getUTCDate();
  const events: HolidayEvent[] = [];

  const inWindow = (mm: number, from: number, to: number) => m === mm && d >= from && d <= to;

  // Valentine's Day
  if (inWindow(2, 8, 14)) {
    events.push({
      id: 'valentine',
      label: "Valentine's Day (romantic dinner for two)",
      titleKey: 'catalog.recommendations.holidayValentine',
      defaultTitle: 'Valentinstag: Dinner for Two',
      badgeEmoji: '❤️',
      keywords: ['schokolade', 'chocolate', 'dessert', 'herz', 'romantic', 'pasta', 'steak', 'kuchen', 'cake'],
    });
  }

  // Spargelzeit (April 15 - June 24)
  if ((m === 4 && d >= 15) || m === 5 || (m === 6 && d <= 24)) {
    events.push({
      id: 'asparagus_season',
      label: 'Asparagus season (Spargelzeit)',
      titleKey: 'catalog.recommendations.holidayAsparagus',
      defaultTitle: 'Frische Spargel-Küche',
      badgeEmoji: '🌿',
      keywords: ['spargel', 'asparagus', 'hollandaise', 'schinken', 'kartoffel', 'bärlauch'],
    });
  }

  // Grilling & BBQ season (June 1 - August 31)
  if (m >= 6 && m <= 8) {
    events.push({
      id: 'grill_season',
      label: 'Grilling season (BBQ, salads, outdoor food)',
      titleKey: 'catalog.recommendations.holidayGrill',
      defaultTitle: 'Sommer-Rezepte & Grillen',
      badgeEmoji: '🔥',
      keywords: ['grill', 'bbq', 'steak', 'burger', 'salat', 'salad', 'spieß', 'skewer', 'marinade', 'dip', 'kräuterbutter'],
    });
  }

  // Oktoberfest / Herbstfest (Sept 15 - Oct 10)
  if ((m === 9 && d >= 15) || (m === 10 && d <= 10)) {
    events.push({
      id: 'oktoberfest',
      label: 'Oktoberfest (Bavarian hearty dishes & pretzels)',
      titleKey: 'catalog.recommendations.holidayOktoberfest',
      defaultTitle: 'Bayerische Schmankerl & Brezen',
      badgeEmoji: '🥨',
      keywords: ['brezel', 'pretzel', 'obazda', 'schweinebraten', 'haxe', 'knödel', 'dumpling', 'sauerkraut', 'bier'],
    });
  }

  // Halloween / Pumpkin harvest (Oct 20 - Nov 2)
  if ((m === 10 && d >= 20) || (m === 11 && d <= 2)) {
    events.push({
      id: 'halloween',
      label: 'Halloween & Pumpkin specials',
      titleKey: 'catalog.recommendations.holidayHalloween',
      defaultTitle: 'Kürbis & Herbst-Spezial',
      badgeEmoji: '🎃',
      keywords: ['kürbis', 'pumpkin', 'squash', 'cremesuppe', 'muffin', 'zimt', 'apfel'],
    });
  }

  // Christmas baking & holiday feasts (Dec 1 - Dec 26)
  if (m === 12 && d <= 26) {
    events.push({
      id: 'christmas',
      label: 'Christmas (festive baking & roasts)',
      titleKey: 'catalog.recommendations.holidayChristmas',
      defaultTitle: 'Festliche Weihnachts-Küche',
      badgeEmoji: '🎄',
      keywords: ['keks', 'cookie', 'plätzchen', 'braten', 'roast', 'lebkuchen', 'gingerbread', 'gans', 'goose', 'ente', 'duck', 'zimt', 'cinnamon', 'vanillekipferl'],
    });
  }

  // Silvester / New Year (Dec 28 - Jan 1)
  if ((m === 12 && d >= 28) || (m === 1 && d === 1)) {
    events.push({
      id: 'new_year',
      label: "New Year's Eve (fondue, raclette, party finger food)",
      titleKey: 'catalog.recommendations.holidayNewYear',
      defaultTitle: 'Silvester-Snacks & Party-Food',
      badgeEmoji: '🎉',
      keywords: ['fondue', 'raclette', 'dip', 'fingerfood', 'party', 'bowle', 'snack', 'häppchen', 'blüte', 'crostini'],
    });
  }

  return events;
}

/**
 * Lowercased haystack of a recipe's searchable text: title, tags, and ingredient
 * baseNames and names.
 */
export function recipeHaystack(recipe: SharedRecipe): string {
  const parts: string[] = [recipe.title || ''];
  if (recipe.description) parts.push(recipe.description);
  if (recipe.tags) parts.push(...recipe.tags);
  for (const group of recipe.ingredients || []) {
    for (const item of group.items || []) {
      if (item.baseName) parts.push(item.baseName);
      if (item.name) parts.push(item.name);
    }
  }
  return parts.join(' ').toLowerCase();
}

/** Count how many of `keywords` appear in the recipe's haystack. */
export function countKeywordMatches(recipe: SharedRecipe, keywords: string[]): number {
  const hay = recipeHaystack(recipe);
  let n = 0;
  for (const kw of keywords) {
    const k = kw.trim().toLowerCase();
    if (k && hay.includes(k)) n++;
  }
  return n;
}
