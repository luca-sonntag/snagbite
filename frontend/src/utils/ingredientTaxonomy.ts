import type { ParentIngredientInfo } from '../types';

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
 * Strips parenthetical descriptions and trailing comma modifiers.
 */
export function normalizeIngredientName(rawName: string): string {
  if (!rawName) return '';
  return rawName.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim();
}

/**
 * Normalizes measurement units so equivalent unit variations match cleanly during aggregation.
 */
export function normalizeUnit(rawUnit?: string): string {
  if (!rawUnit) return 'Stück';
  const clean = rawUnit.toLowerCase().trim();

  if (!clean || clean === 'stück' || clean === 'stueck' || clean === 'stk' || clean === 'stk.' || clean === 'st.' || clean === 'st' || clean === 'pcs' || clean === 'piece' || clean === 'pieces') {
    return 'Stück';
  }
  if (clean === 'g' || clean === 'gramm' || clean === 'grams' || clean === 'gr' || clean === 'gr.') {
    return 'g';
  }
  if (clean === 'kg' || clean === 'kilogramm' || clean === 'kilo') {
    return 'kg';
  }
  if (clean === 'ml' || clean === 'milliliter') {
    return 'ml';
  }
  if (clean === 'l' || clean === 'liter' || clean === 'litre') {
    return 'l';
  }
  if (clean === 'el' || clean === 'tbsp' || clean === 'esslöffel') {
    return 'EL';
  }
  if (clean === 'tl' || clean === 'tsp' || clean === 'teelöffel') {
    return 'TL';
  }
  if (clean === 'zehe' || clean === 'zehen' || clean === 'clove' || clean === 'cloves') {
    return 'Zehe';
  }
  if (clean === 'dose' || clean === 'dosen' || clean === 'can' || clean === 'cans') {
    return 'Dose';
  }
  if (clean === 'prise' || clean === 'prisen' || clean === 'pinch' || clean === 'pinches') {
    return 'Prise';
  }
  if (clean === 'scheibe' || clean === 'scheiben' || clean === 'slice' || clean === 'slices') {
    return 'Scheibe';
  }
  if (clean === 'bund' || clean === 'bunch') {
    return 'Bund';
  }
  if (clean === 'packung' || clean === 'packungen' || clean === 'pkg' || clean === 'pkg.' || clean === 'pck') {
    return 'Packung';
  }

  return rawUnit.trim();
}

/**
 * Universal canonical map for staple grocery foods in German and English.
 * Bridges plural/singular and German/English inputs to a universal canonical key.
 */
const CANONICAL_FOOD_KEYS: Record<string, string> = {
  // Eggs & Egg parts
  'ei': 'egg',
  'eier': 'egg',
  'hühnerei': 'egg',
  'hühnereier': 'egg',
  'eigelb': 'egg',
  'eiweiß': 'egg',
  'eigelbe': 'egg',
  'eiweiße': 'egg',
  'egg': 'egg',
  'eggs': 'egg',
  'egg yolk': 'egg',
  'egg white': 'egg',
  'uova': 'egg',
  'uovo': 'egg',
  'oeuf': 'egg',
  'oeufs': 'egg',
  'huevo': 'egg',
  'huevos': 'egg',

  // Alliums
  'zwiebel': 'onion',
  'zwiebeln': 'onion',
  'gemüsezwiebel': 'onion',
  'gemüsezwiebeln': 'onion',
  'rote zwiebel': 'onion',
  'rote zwiebeln': 'onion',
  'weiße zwiebel': 'onion',
  'weiße zwiebeln': 'onion',
  'schalotte': 'onion',
  'schalotten': 'onion',
  'onion': 'onion',
  'onions': 'onion',
  'cipolla': 'onion',
  'cipolle': 'onion',
  'oignon': 'onion',
  'oignons': 'onion',
  'cebolla': 'onion',
  'cebollas': 'onion',
  'knoblauch': 'garlic',
  'knoblauchzehe': 'garlic',
  'knoblauchzehen': 'garlic',
  'garlic': 'garlic',
  'garlic clove': 'garlic',
  'garlic cloves': 'garlic',
  'aglio': 'garlic',
  'ail': 'garlic',
  'ajo': 'garlic',

  // Solanaceae & Roots
  'tomate': 'tomato',
  'tomaten': 'tomato',
  'strauchtomate': 'tomato',
  'strauchtomaten': 'tomato',
  'romatomate': 'tomato',
  'romatomaten': 'tomato',
  'kirschtomate': 'tomato',
  'kirschtomaten': 'tomato',
  'cherrytomate': 'tomato',
  'cherrytomaten': 'tomato',
  'fleischtomate': 'tomato',
  'fleischtomaten': 'tomato',
  'tomato': 'tomato',
  'tomatoes': 'tomato',
  'pomodoro': 'tomato',
  'pomodori': 'tomato',
  'kartoffel': 'potato',
  'kartoffeln': 'potato',
  'speisekartoffel': 'potato',
  'speisekartoffeln': 'potato',
  'süßkartoffel': 'potato',
  'süßkartoffeln': 'potato',
  'potato': 'potato',
  'potatoes': 'potato',
  'patata': 'potato',
  'patate': 'potato',
  'karotte': 'carrot',
  'karotten': 'carrot',
  'möhre': 'carrot',
  'möhren': 'carrot',
  'carrot': 'carrot',
  'carrots': 'carrot',
  'gurke': 'cucumber',
  'gurken': 'cucumber',
  'salatgurke': 'cucumber',
  'salatgurken': 'cucumber',
  'cucumber': 'cucumber',
  'cucumbers': 'cucumber',
  'paprika': 'bell pepper',
  'paprikas': 'bell pepper',
  'spitzpaprika': 'bell pepper',
  'gemüsepaprika': 'bell pepper',
  'bell pepper': 'bell pepper',
  'bell peppers': 'bell pepper',

  // Citrus & Fruits
  'zitrone': 'lemon',
  'zitronen': 'lemon',
  'zitronensaft': 'lemon',
  'zitronenabrieb': 'lemon',
  'zitronenschale': 'lemon',
  'lemon': 'lemon',
  'lemons': 'lemon',
  'lemon juice': 'lemon',
  'lemon zest': 'lemon',
  'limette': 'lime',
  'limetten': 'lime',
  'limettensaft': 'lime',
  'limettenabrieb': 'lime',
  'lime': 'lime',
  'limes': 'lime',
  'orange': 'orange',
  'orangen': 'orange',
  'orangensaft': 'orange',
  'orangenabrieb': 'orange',
  'oranges': 'orange',
  'apfel': 'apple',
  'äpfel': 'apple',
  'apple': 'apple',
  'apples': 'apple',
  'avocado': 'avocado',
  'avocados': 'avocado',
  'banane': 'banana',
  'bananen': 'banana',
  'banana': 'banana',
  'bananas': 'banana',

  // Fungi & Berries
  'champignon': 'mushroom',
  'champignons': 'mushroom',
  'pilz': 'mushroom',
  'pilze': 'mushroom',
  'mushroom': 'mushroom',
  'mushrooms': 'mushroom',
  'erdbeere': 'strawberry',
  'erdbeeren': 'strawberry',
  'strawberry': 'strawberry',
  'strawberries': 'strawberry',
  'himbeere': 'raspberry',
  'himbeeren': 'raspberry',
  'raspberry': 'raspberry',
  'raspberries': 'raspberry',
  'blaubeere': 'blueberry',
  'blaubeeren': 'blueberry',
  'heidelbeere': 'blueberry',
  'heidelbeeren': 'blueberry',
  'blueberry': 'blueberry',
  'blueberries': 'blueberry',

  // Grains & Dairy
  'nudel': 'pasta',
  'nudeln': 'pasta',
  'pasta': 'pasta',
  'haferflocke': 'oats',
  'haferflocken': 'oats',
  'oat': 'oats',
  'oats': 'oats',
  'butter': 'butter',
  'mozzarella': 'mozzarella',
  'gouda': 'gouda',
  'parmesan': 'parmesan',
  'frischkäse': 'cream cheese',
  'cream cheese': 'cream cheese',
  'hafermilch': 'oat milk',
  'oat milk': 'oat milk',
  'milch': 'milk',
  'milk': 'milk',
};

/**
 * Normalizes any food term (German or English, singular or plural) to its canonical base key.
 */
export function toFoodCanonicalKey(rawText: string): string {
  if (!rawText) return '';
  const clean = normalizeIngredientName(rawText).toLowerCase().trim();

  // 1. Exact canonical mapping (bridges German, plural forms and English)
  if (CANONICAL_FOOD_KEYS[clean]) {
    return CANONICAL_FOOD_KEYS[clean];
  }

  // 2. Strip common superficial adjectives (e.g. "Mozzarella light" -> "mozzarella")
  const stripped = clean
    .replace(/\b(light|mager|fettarm|gerieben|gehackt|gewürfelt|fein|grob|frisch|bio|mini|groß|klein)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (stripped && CANONICAL_FOOD_KEYS[stripped]) {
    return CANONICAL_FOOD_KEYS[stripped];
  }

  // 3. English singular conversion
  const singularEnglish = toEnglishSingular(stripped || clean);
  if (CANONICAL_FOOD_KEYS[singularEnglish]) {
    return CANONICAL_FOOD_KEYS[singularEnglish];
  }

  // 4. Fallback to singular English or clean text
  return singularEnglish;
}

/**
 * Resolves the raw parent ingredient for derived components.
 */
export function getParentIngredient(item: {
  name?: string;
  baseName?: string;
  unit?: string;
  parentIngredient?: ParentIngredientInfo;
}): ParentIngredientInfo | null {
  // 1. Explicit AI parent provided
  if (item.parentIngredient?.name && item.parentIngredient?.baseName) {
    const parentKey = toFoodCanonicalKey(item.parentIngredient.baseName);
    const itemKey = toFoodCanonicalKey(item.baseName || item.name || '');

    // Prevent old stale self-parents from corrupting grouping if name matches
    if (parentKey === itemKey && !['eigelb', 'eiweiß', 'zitronensaft', 'zitronenabrieb', 'limettensaft', 'knoblauchzehe'].includes((item.name || '').toLowerCase())) {
      return null;
    }
    return item.parentIngredient;
  }

  // 2. Derived component rules (e.g. Eigelb -> Ei, Zitronenabrieb -> Zitrone)
  const cleanName = (item.name || '').toLowerCase().trim();
  if (['eigelb', 'eiweiß', 'eigelbe', 'eiweiße'].includes(cleanName)) {
    return { name: 'Ei', baseName: 'egg', unit: 'Stück' };
  }
  if (['zitronenabrieb', 'zitronenschale', 'zitronensaft'].includes(cleanName)) {
    return { name: 'Zitrone', baseName: 'lemon', unit: 'Stück' };
  }
  if (['limettenabrieb', 'limettenschale', 'limettensaft'].includes(cleanName)) {
    return { name: 'Limette', baseName: 'lime', unit: 'Stück' };
  }
  if (['knoblauchzehe', 'knoblauchzehen'].includes(cleanName)) {
    return { name: 'Knoblauch', baseName: 'garlic', unit: 'Zehe' };
  }

  return null;
}

/**
 * Computes the authoritative universal base key used for grouping items on the shopping list.
 * Unifies English baseNames, German ingredient names, and derived parents into identical keys.
 */
export function normalizeFoodBaseKey(item: {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
}): string {
  const parent = getParentIngredient(item);
  const rawKey = parent?.baseName || item.baseName || item.name;
  return toFoodCanonicalKey(rawKey);
}

/**
 * Resolves the display name for a shopping list item cleanly.
 */
export function getIngredientDisplayName(
  item: { name: string; baseName?: string; parentIngredient?: ParentIngredientInfo }
): string {
  const parent = getParentIngredient(item);
  if (parent?.name) {
    return parent.name;
  }
  const clean = normalizeIngredientName(item.name);
  if (clean) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  if (item.baseName) {
    return item.baseName.charAt(0).toUpperCase() + item.baseName.slice(1);
  }
  return item.name || '';
}
