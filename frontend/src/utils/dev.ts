/**
 * Developer Tools & Debug Utilities
 */

/**
 * Triggers a full recipe re-extraction with Gemini in development mode.
 * Dispatches an event that switches to the extraction view and executes the job.
 */
export function devReExtractRecipe(url: string): void {
  if (!url || typeof window === 'undefined') return;
  console.info('[DEV] Triggering re-extraction for URL:', url);
  window.dispatchEvent(new CustomEvent('app:dev-re-extract', { detail: { url } }));
}
