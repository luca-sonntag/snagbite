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
 * Dynamically normalizes an ingredient name for grouping without hardcoded dictionaries or language-specific rules.
 * Removes parenthetical descriptions and trailing comma modifiers.
 */
export function normalizeIngredientName(rawName: string): string {
  if (!rawName) return '';

  let name = rawName.trim();

  // 1. Remove parenthetical descriptions, e.g. "Zwiebel (gewürfelt)" -> "Zwiebel"
  name = name.replace(/\s*\([^)]*\)/g, '').trim();

  // 2. Remove trailing comma modifiers, e.g. "Zwiebel, fein gewürfelt" -> "Zwiebel"
  const commaIndex = name.indexOf(',');
  if (commaIndex !== -1) {
    name = name.slice(0, commaIndex).trim();
  }

  // 3. Lowercase & trim
  return name.toLowerCase().trim();
}

/**
 * Normalizes measurement units so equivalent variations match in aggregation keys.
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

interface DerivedTaxonomyRule {
  targetNames: string[];
  targetBaseNames: string[];
  parent: ParentIngredientInfo;
}

/**
 * Rules for derived component parts that are NOT bought separately in grocery stores.
 */
const KNOWN_DERIVED_RULES: DerivedTaxonomyRule[] = [
  {
    targetNames: ['eigelb', 'eiweiß', 'eigelbe', 'eiweiße'],
    targetBaseNames: ['egg yolk', 'egg white', 'egg-yolk', 'egg-white'],
    parent: { name: 'Ei', baseName: 'egg', unit: 'Stück' },
  },
  {
    targetNames: ['zitronenabrieb', 'zitronenschale', 'zitronensaft', 'zitronenabrieb (bio)'],
    targetBaseNames: ['lemon zest', 'lemon juice', 'lemon peel'],
    parent: { name: 'Zitrone', baseName: 'lemon', unit: 'Stück' },
  },
  {
    targetNames: ['orangenabrieb', 'orangenschale', 'orangensaft'],
    targetBaseNames: ['orange zest', 'orange juice', 'orange peel'],
    parent: { name: 'Orange', baseName: 'orange', unit: 'Stück' },
  },
  {
    targetNames: ['limettenabrieb', 'limettenschale', 'limettensaft'],
    targetBaseNames: ['lime zest', 'lime juice', 'lime peel'],
    parent: { name: 'Limette', baseName: 'lime', unit: 'Stück' },
  },
  {
    targetNames: ['knoblauchzehe', 'knoblauchzehen'],
    targetBaseNames: ['garlic clove', 'garlic cloves'],
    parent: { name: 'Knoblauch', baseName: 'garlic', unit: 'Zehe' },
  },
];

interface FoodNameMapping {
  baseName: string;
  singularName: string;
  pluralName: string;
}

/**
 * Mapping for primary grocery items (singular and plural forms) to universal English baseName and localized display names.
 */
const KNOWN_FOOD_MAP: Record<string, FoodNameMapping> = {
  // Eggs
  'ei': { baseName: 'egg', singularName: 'Ei', pluralName: 'Eier' },
  'eier': { baseName: 'egg', singularName: 'Ei', pluralName: 'Eier' },
  'hühnerei': { baseName: 'egg', singularName: 'Ei', pluralName: 'Eier' },
  'hühnereier': { baseName: 'egg', singularName: 'Ei', pluralName: 'Eier' },
  'egg': { baseName: 'egg', singularName: 'Ei', pluralName: 'Eier' },
  'eggs': { baseName: 'egg', singularName: 'Ei', pluralName: 'Eier' },

  // Onions
  'zwiebel': { baseName: 'onion', singularName: 'Zwiebel', pluralName: 'Zwiebeln' },
  'zwiebeln': { baseName: 'onion', singularName: 'Zwiebel', pluralName: 'Zwiebeln' },
  'gemüsezwiebel': { baseName: 'onion', singularName: 'Zwiebel', pluralName: 'Zwiebeln' },
  'gemüsezwiebeln': { baseName: 'onion', singularName: 'Zwiebel', pluralName: 'Zwiebeln' },
  'rote zwiebel': { baseName: 'onion', singularName: 'Rote Zwiebel', pluralName: 'Rote Zwiebeln' },
  'rote zwiebeln': { baseName: 'onion', singularName: 'Rote Zwiebel', pluralName: 'Rote Zwiebeln' },
  'weiße zwiebel': { baseName: 'onion', singularName: 'Weiße Zwiebel', pluralName: 'Weiße Zwiebeln' },
  'weiße zwiebeln': { baseName: 'onion', singularName: 'Weiße Zwiebel', pluralName: 'Weiße Zwiebeln' },
  'schalotte': { baseName: 'onion', singularName: 'Schalotte', pluralName: 'Schalotten' },
  'schalotten': { baseName: 'onion', singularName: 'Schalotte', pluralName: 'Schalotten' },
  'onion': { baseName: 'onion', singularName: 'Zwiebel', pluralName: 'Zwiebeln' },
  'onions': { baseName: 'onion', singularName: 'Zwiebel', pluralName: 'Zwiebeln' },

  // Tomatoes
  'tomate': { baseName: 'tomato', singularName: 'Tomate', pluralName: 'Tomaten' },
  'tomaten': { baseName: 'tomato', singularName: 'Tomate', pluralName: 'Tomaten' },
  'strauchtomate': { baseName: 'tomato', singularName: 'Strauchtomate', pluralName: 'Strauchtomaten' },
  'strauchtomaten': { baseName: 'tomato', singularName: 'Strauchtomate', pluralName: 'Strauchtomaten' },
  'romatomate': { baseName: 'tomato', singularName: 'Romatomate', pluralName: 'Romatomaten' },
  'romatomaten': { baseName: 'tomato', singularName: 'Romatomate', pluralName: 'Romatomaten' },
  'kirschtomate': { baseName: 'tomato', singularName: 'Kirschtomate', pluralName: 'Kirschtomaten' },
  'kirschtomaten': { baseName: 'tomato', singularName: 'Kirschtomate', pluralName: 'Kirschtomaten' },
  'cherrytomate': { baseName: 'tomato', singularName: 'Cherrytomate', pluralName: 'Cherrytomaten' },
  'cherrytomaten': { baseName: 'tomato', singularName: 'Cherrytomate', pluralName: 'Cherrytomaten' },
  'fleischtomate': { baseName: 'tomato', singularName: 'Fleischtomate', pluralName: 'Fleischtomaten' },
  'fleischtomaten': { baseName: 'tomato', singularName: 'Fleischtomate', pluralName: 'Fleischtomaten' },
  'tomato': { baseName: 'tomato', singularName: 'Tomate', pluralName: 'Tomaten' },
  'tomatoes': { baseName: 'tomato', singularName: 'Tomate', pluralName: 'Tomaten' },

  // Potatoes
  'kartoffel': { baseName: 'potato', singularName: 'Kartoffel', pluralName: 'Kartoffeln' },
  'kartoffeln': { baseName: 'potato', singularName: 'Kartoffel', pluralName: 'Kartoffeln' },
  'speisekartoffel': { baseName: 'potato', singularName: 'Kartoffel', pluralName: 'Kartoffeln' },
  'speisekartoffeln': { baseName: 'potato', singularName: 'Kartoffel', pluralName: 'Kartoffeln' },
  'süßkartoffel': { baseName: 'potato', singularName: 'Süßkartoffel', pluralName: 'Süßkartoffeln' },
  'süßkartoffeln': { baseName: 'potato', singularName: 'Süßkartoffel', pluralName: 'Süßkartoffeln' },
  'potato': { baseName: 'potato', singularName: 'Kartoffel', pluralName: 'Kartoffeln' },
  'potatoes': { baseName: 'potato', singularName: 'Kartoffel', pluralName: 'Kartoffeln' },

  // Carrots
  'karotte': { baseName: 'carrot', singularName: 'Karotte', pluralName: 'Karotten' },
  'karotten': { baseName: 'carrot', singularName: 'Karotte', pluralName: 'Karotten' },
  'möhre': { baseName: 'carrot', singularName: 'Möhre', pluralName: 'Möhren' },
  'möhren': { baseName: 'carrot', singularName: 'Möhre', pluralName: 'Möhren' },
  'carrot': { baseName: 'carrot', singularName: 'Karotte', pluralName: 'Karotten' },
  'carrots': { baseName: 'carrot', singularName: 'Karotte', pluralName: 'Karotten' },

  // Garlic
  'knoblauch': { baseName: 'garlic', singularName: 'Knoblauch', pluralName: 'Knoblauch' },
  'garlic': { baseName: 'garlic', singularName: 'Knoblauch', pluralName: 'Knoblauch' },

  // Cucumber
  'gurke': { baseName: 'cucumber', singularName: 'Gurke', pluralName: 'Gurken' },
  'gurken': { baseName: 'cucumber', singularName: 'Gurke', pluralName: 'Gurken' },
  'salatgurke': { baseName: 'cucumber', singularName: 'Salatgurke', pluralName: 'Salatgurken' },
  'salatgurken': { baseName: 'cucumber', singularName: 'Salatgurke', pluralName: 'Salatgurken' },
  'cucumber': { baseName: 'cucumber', singularName: 'Gurke', pluralName: 'Gurken' },
  'cucumbers': { baseName: 'cucumber', singularName: 'Gurke', pluralName: 'Gurken' },

  // Citrus
  'zitrone': { baseName: 'lemon', singularName: 'Zitrone', pluralName: 'Zitronen' },
  'zitronen': { baseName: 'lemon', singularName: 'Zitrone', pluralName: 'Zitronen' },
  'lemon': { baseName: 'lemon', singularName: 'Zitrone', pluralName: 'Zitronen' },
  'lemons': { baseName: 'lemon', singularName: 'Zitrone', pluralName: 'Zitronen' },
  'limette': { baseName: 'lime', singularName: 'Limette', pluralName: 'Limetten' },
  'limetten': { baseName: 'lime', singularName: 'Limette', pluralName: 'Limetten' },
  'lime': { baseName: 'lime', singularName: 'Limette', pluralName: 'Limetten' },
  'limes': { baseName: 'lime', singularName: 'Limette', pluralName: 'Limetten' },
  'orange': { baseName: 'orange', singularName: 'Orange', pluralName: 'Orangen' },
  'orangen': { baseName: 'orange', singularName: 'Orange', pluralName: 'Orangen' },
  'oranges': { baseName: 'orange', singularName: 'Orange', pluralName: 'Orangen' },

  // Apples / Fruits
  'apfel': { baseName: 'apple', singularName: 'Apfel', pluralName: 'Äpfel' },
  'äpfel': { baseName: 'apple', singularName: 'Apfel', pluralName: 'Äpfel' },
  'apple': { baseName: 'apple', singularName: 'Apfel', pluralName: 'Äpfel' },
  'apples': { baseName: 'apple', singularName: 'Apfel', pluralName: 'Äpfel' },
  'avocado': { baseName: 'avocado', singularName: 'Avocado', pluralName: 'Avocados' },
  'avocados': { baseName: 'avocado', singularName: 'Avocado', pluralName: 'Avocados' },
  'banane': { baseName: 'banana', singularName: 'Banane', pluralName: 'Bananen' },
  'bananen': { baseName: 'banana', singularName: 'Banane', pluralName: 'Bananen' },
  'banana': { baseName: 'banana', singularName: 'Banane', pluralName: 'Bananen' },
  'bananas': { baseName: 'banana', singularName: 'Banane', pluralName: 'Bananen' },

  // Mushrooms
  'champignon': { baseName: 'mushroom', singularName: 'Champignon', pluralName: 'Champignons' },
  'champignons': { baseName: 'mushroom', singularName: 'Champignon', pluralName: 'Champignons' },
  'pilz': { baseName: 'mushroom', singularName: 'Pilz', pluralName: 'Pilze' },
  'pilze': { baseName: 'mushroom', singularName: 'Pilz', pluralName: 'Pilze' },
  'mushroom': { baseName: 'mushroom', singularName: 'Champignon', pluralName: 'Champignons' },
  'mushrooms': { baseName: 'mushroom', singularName: 'Champignon', pluralName: 'Champignons' },

  // Berries
  'erdbeere': { baseName: 'strawberry', singularName: 'Erdbeere', pluralName: 'Erdbeeren' },
  'erdbeeren': { baseName: 'strawberry', singularName: 'Erdbeere', pluralName: 'Erdbeeren' },
  'strawberry': { baseName: 'strawberry', singularName: 'Erdbeere', pluralName: 'Erdbeeren' },
  'strawberries': { baseName: 'strawberry', singularName: 'Erdbeere', pluralName: 'Erdbeeren' },
  'himbeere': { baseName: 'raspberry', singularName: 'Himbeere', pluralName: 'Himbeeren' },
  'himbeeren': { baseName: 'raspberry', singularName: 'Himbeere', pluralName: 'Himbeeren' },
  'raspberry': { baseName: 'raspberry', singularName: 'Himbeere', pluralName: 'Himbeeren' },
  'raspberries': { baseName: 'raspberry', singularName: 'Himbeere', pluralName: 'Himbeeren' },
  'blaubeere': { baseName: 'blueberry', singularName: 'Blaubeere', pluralName: 'Blaubeeren' },
  'blaubeeren': { baseName: 'blueberry', singularName: 'Blaubeere', pluralName: 'Blaubeeren' },
  'heidelbeere': { baseName: 'blueberry', singularName: 'Heidelbeere', pluralName: 'Heidelbeeren' },
  'heidelbeeren': { baseName: 'blueberry', singularName: 'Heidelbeere', pluralName: 'Heidelbeeren' },
  'blueberry': { baseName: 'blueberry', singularName: 'Blaubeere', pluralName: 'Blaubeeren' },
  'blueberries': { baseName: 'blueberry', singularName: 'Blaubeere', pluralName: 'Blaubeeren' },

  // Staples
  'nudel': { baseName: 'pasta', singularName: 'Nudeln', pluralName: 'Nudeln' },
  'nudeln': { baseName: 'pasta', singularName: 'Nudeln', pluralName: 'Nudeln' },
  'pasta': { baseName: 'pasta', singularName: 'Pasta', pluralName: 'Pasta' },
  'haferflocke': { baseName: 'oats', singularName: 'Haferflocken', pluralName: 'Haferflocken' },
  'haferflocken': { baseName: 'oats', singularName: 'Haferflocken', pluralName: 'Haferflocken' },
  'oat': { baseName: 'oats', singularName: 'Haferflocken', pluralName: 'Haferflocken' },
  'oats': { baseName: 'oats', singularName: 'Haferflocken', pluralName: 'Haferflocken' },
};

/**
 * Resolves the raw parent ingredient for grocery store shopping list aggregation.
 * Checks explicit `ingredient.parentIngredient` first, then taxonomy rules for derived parts, then regex heuristics.
 * Returns null if the ingredient is already a primary grocery product.
 */
export function getParentIngredient(ing: {
  name: string;
  baseName?: string;
  unit?: string;
  parentIngredient?: ParentIngredientInfo;
}): ParentIngredientInfo | null {
  // 1. Explicitly provided parent from AI
  if (ing.parentIngredient?.baseName && ing.parentIngredient?.name) {
    return ing.parentIngredient;
  }

  const cleanName = normalizeIngredientName(ing.name);
  const cleanBaseName = toEnglishSingular((ing.baseName || '').toLowerCase().trim());

  // 2. Known explicit derived rule matching (e.g. Eigelb -> Ei, Zitronenabrieb -> Zitrone)
  for (const rule of KNOWN_DERIVED_RULES) {
    if (
      rule.targetNames.includes(cleanName) ||
      (cleanBaseName && rule.targetBaseNames.includes(cleanBaseName))
    ) {
      return {
        ...rule.parent,
        unit: rule.parent.unit || ing.unit
      };
    }
  }

  // 3. Regex Heuristics for derived parts
  // e.g. "Zitronensaft" -> "Zitrone"
  const suffixMatch = cleanName.match(/^(.+?)(abrieb|schale|saft)$/i);
  if (suffixMatch && suffixMatch[1].length >= 3) {
    const rawRoot = suffixMatch[1];
    const capitalizedName = rawRoot.charAt(0).toUpperCase() + rawRoot.slice(1);
    return {
      name: capitalizedName,
      baseName: rawRoot,
      unit: 'Stück',
    };
  }

  // e.g. "Knoblauchzehe" / "Knoblauchzehen"
  const zeheMatch = cleanName.match(/^(.+?)zehe(n)?$/i);
  if (zeheMatch && zeheMatch[1].length >= 3) {
    const rawRoot = zeheMatch[1];
    const capitalizedName = rawRoot.charAt(0).toUpperCase() + rawRoot.slice(1);
    return {
      name: capitalizedName,
      baseName: rawRoot,
      unit: 'Zehe',
    };
  }

  return null;
}

/**
 * Computes the authoritative universal base key used for grouping items on the shopping list.
 * Unifies AI baseNames, parent ingredients, and German manual inputs into singular English keys.
 */
export function normalizeFoodBaseKey(ing: {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
}): string {
  // 1. Explicit parent baseName
  if (ing.parentIngredient?.baseName) {
    return toEnglishSingular(ing.parentIngredient.baseName);
  }

  // 2. Derived parent
  const parent = getParentIngredient(ing);
  if (parent?.baseName) {
    return toEnglishSingular(parent.baseName);
  }

  // 3. Explicit ingredient baseName
  if (ing.baseName) {
    return toEnglishSingular(ing.baseName);
  }

  // 4. Known German/English canonical food map lookup
  const cleanName = normalizeIngredientName(ing.name);
  if (KNOWN_FOOD_MAP[cleanName]) {
    return KNOWN_FOOD_MAP[cleanName].baseName;
  }

  // 5. Fallback: clean normalized name
  return cleanName;
}

/**
 * Selects the appropriate localized display name for a shopping list item,
 * adapting singular/plural forms based on the total quantity when applicable.
 */
export function getIngredientDisplayName(
  item: { name: string; baseName?: string; parentIngredient?: ParentIngredientInfo },
  amount?: number
): string {
  const isPlural = typeof amount === 'number' && amount > 1;

  // 1. Explicit or derived parent
  const parent = getParentIngredient(item);
  if (parent) {
    const cleanParentName = normalizeIngredientName(parent.name);
    if (KNOWN_FOOD_MAP[cleanParentName]) {
      return isPlural ? KNOWN_FOOD_MAP[cleanParentName].pluralName : KNOWN_FOOD_MAP[cleanParentName].singularName;
    }
    return parent.name;
  }

  // 2. Lookup in food map by clean German name
  const cleanName = normalizeIngredientName(item.name);
  if (KNOWN_FOOD_MAP[cleanName]) {
    return isPlural ? KNOWN_FOOD_MAP[cleanName].pluralName : KNOWN_FOOD_MAP[cleanName].singularName;
  }

  // 3. Lookup in food map by English baseName
  if (item.baseName) {
    const cleanBase = toEnglishSingular(item.baseName);
    if (KNOWN_FOOD_MAP[cleanBase]) {
      return isPlural ? KNOWN_FOOD_MAP[cleanBase].pluralName : KNOWN_FOOD_MAP[cleanBase].singularName;
    }
  }

  // 4. Clean up original name (strip trailing commas/parentheses) and capitalize
  if (item.name) {
    const clean = item.name.replace(/\s*\([^)]*\)/g, '').split(',')[0].trim();
    if (clean) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  // 5. Fallback to baseName capitalized
  if (item.baseName) {
    return item.baseName.charAt(0).toUpperCase() + item.baseName.slice(1);
  }

  return item.name || '';
}
