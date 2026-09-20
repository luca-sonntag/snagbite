import { apiUrl } from '../api';

/**
 * Returns the public image URL for a canonical ingredient icon (e.g. "onion" -> /api/ingredient-icons/onion.webp).
 * Prioritizes English baseName (e.g. "onion", "rolled_oat", "egg", "butter"), falls back to canonicalId.
 * Supports optional synonyms to resolve more specific icons (e.g. "cheese" with ["grated cheese"] -> /api/ingredient-icons/cheese.webp?syn=grated_cheese).
 */
export function getIngredientIconUrl(
  baseName?: string | null,
  canonicalId?: string | null,
  synonyms?: string[] | null
): string | null {
  const target = baseName || canonicalId;
  if (!target) return null;
  const clean = target.trim().toLowerCase().replace(/\s+/g, '_');
  let url = `/api/ingredient-icons/${clean}.webp`;

  if (Array.isArray(synonyms) && synonyms.length > 0) {
    const valid = synonyms
      .map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
      .filter(Boolean)
      .slice(0, 3)
      .join(',');
    if (valid) {
      url += `?syn=${encodeURIComponent(valid)}`;
    }
  }

  return apiUrl(url);
}
