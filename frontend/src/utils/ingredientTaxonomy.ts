import type { ParentIngredientInfo } from '../types';

/**
 * Safely converts an English plural food noun to its singular form.
 * Preserves nouns ending in -ss, -us, -is, -se, -cous (e.g. cheese, hummus, asparagus, couscous).
 */
export function toEnglishSingular(word: string): string {
  if (!word || word.length <= 2) return word;
  const lower = word.toLowerCase().trim();
  if (/(?:ss|us|is|cous|se)$/.test(lower)) return lower;
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('oes')) return lower.slice(0, -2);
  if (lower.endsWith('leaves')) return lower.slice(0, -3) + 'f';
  if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1);
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
 * Normalizes measurement unit strings.
 */
export function normalizeUnit(rawUnit?: string): string {
  return (rawUnit || '').trim();
}

/**
 * Resolves the raw parent ingredient if explicitly provided by AI schema.
 */
export function getParentIngredient(item: { parentIngredient?: ParentIngredientInfo }): ParentIngredientInfo | null {
  return item.parentIngredient?.name && item.parentIngredient?.baseName ? item.parentIngredient : null;
}

/**
 * Computes the authoritative universal base key used for grouping items on the shopping list.
 * 100% language-agnostic by relying on the AI singular baseName contract.
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
 * Resolves the display name for a shopping list item cleanly.
 */
export function getIngredientDisplayName(
  item: { name: string; baseName?: string; parentIngredient?: ParentIngredientInfo }
): string {
  const parent = getParentIngredient(item);
  if (parent?.name) {
    return parent.name;
  }
  return normalizeIngredientName(item.name) || item.baseName || '';
}
