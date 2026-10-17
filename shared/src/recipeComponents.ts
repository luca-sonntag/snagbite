const GENERIC_SECTIONS = new Set([
  'zutaten',
  'hauptzutaten',
  'ingredients',
  'main',
  'general',
  'basis',
  'default',
  'allgemein',
]);

/**
 * Normalizes a section name: trims whitespace and returns undefined if empty,
 * generic container label, or matching the ingredient's own category classification.
 *
 * @param section The raw section string (e.g. "Buns", "Sauce")
 * @param ingredientCategory Optional category of the ingredient to prevent duplicate department echoing
 */
export function sanitizeSectionName(
  section?: string | null,
  ingredientCategory?: string | null
): string | undefined {
  if (!section || typeof section !== 'string') return undefined;
  const trimmed = section.trim();
  if (trimmed.length === 0) return undefined;

  const lower = trimmed.toLowerCase();
  if (GENERIC_SECTIONS.has(lower)) {
    return undefined;
  }

  if (ingredientCategory && typeof ingredientCategory === 'string') {
    const catLower = ingredientCategory.trim().toLowerCase();
    const cleanSection = lower.replace(/[^a-z0-9äöüß]/g, '');
    const cleanCategory = catLower.replace(/[^a-z0-9äöüß]/g, '');
    if (cleanSection === cleanCategory) {
      return undefined;
    }
  }

  return trimmed;
}
