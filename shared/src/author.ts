/**
 * Utilities for normalizing and formatting creator / author handles and names.
 * Decomposes stylized Unicode characters (e.g. Mathematical Bold, Script, Fraktur,
 * Fullwidth) used by social media creators into standard readable Latin characters.
 */

/**
 * Normalizes an author/creator name or handle by:
 * 1. Decomposing and re-composing styled Unicode characters via NFKC normalization.
 * 2. Trimming whitespace and collapsing multiple inner spaces.
 * 3. Removing leading '@' characters.
 *
 * Returns null if the result is empty or invalid.
 */
export function normalizeAuthorName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null;
  const normalized = name.normalize('NFKC').trim().replace(/\s+/g, ' ');
  const stripped = normalized.replace(/^@+/, '').trim();
  return stripped.length > 0 ? stripped : null;
}

/**
 * Normalizes and formats an author handle with a single leading '@'.
 * Styled Unicode characters (e.g. "@𝐍𝐞𝐫𝐦𝐢𝐧 𝐊𝐚𝐩𝐢𝐬𝐢𝐳") are cleanly normalized to
 * standard Latin typography ("@Nermin Kapisiz").
 *
 * Returns null if the handle is empty or invalid.
 */
export function formatAuthorHandle(name: string | null | undefined): string | null {
  const clean = normalizeAuthorName(name);
  return clean ? `@${clean}` : null;
}
