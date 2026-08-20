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
 * Resolves the raw parent ingredient if explicitly provided by AI schema.
 */
export function getParentIngredient(item: { parentIngredient?: ParentIngredientInfo }): ParentIngredientInfo | null {
  if (item.parentIngredient?.name && item.parentIngredient?.baseName) {
    return item.parentIngredient;
  }
  return null;
}

/**
 * Computes the authoritative universal base key used for grouping items on the shopping list.
 * 100% language-agnostic by using the AI's English singular baseName contract.
 */
export function normalizeFoodBaseKey(item: {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
}): string {
  const parent = getParentIngredient(item);
  const rawKey = parent?.baseName || item.baseName || item.name;
  return toEnglishSingular(normalizeIngredientName(rawKey));
}

/**
 * Resolves the display name for a shopping list item cleanly without language dictionaries.
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
