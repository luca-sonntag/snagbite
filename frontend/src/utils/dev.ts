import { useState, useEffect } from 'react';

/**
 * Developer Tools & Debug Utilities
 */

export const DEV_TOOLS_STORAGE_KEY = 'snagbite_dev_tools';
export const DEV_TOOLS_TOGGLE_EVENT = 'app:dev-tools-toggle';

/**
 * Checks whether the local storage flag for dev tools is active.
 */
export function isDevToolsFlagEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEV_TOOLS_STORAGE_KEY) === 'true';
}

/**
 * Updates the dev tools flag in local storage and dispatches a toggle event.
 */
export function setDevToolsFlagEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(DEV_TOOLS_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(DEV_TOOLS_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(DEV_TOOLS_TOGGLE_EVENT, { detail: { enabled } }));
}

/**
 * Hook to determine whether developer tools (Eruda, overlays) should be active.
 * - Always active in local dev mode (import.meta.env.DEV)
 * - In production: active only if the authenticated user is an admin AND has enabled the dev tools toggle.
 */
export function useDevToolsActive(isAdmin: boolean): boolean {
  const isDevEnv = import.meta.env.DEV;

  const [active, setActive] = useState<boolean>(() => {
    if (isDevEnv) return true;
    return isAdmin && isDevToolsFlagEnabled();
  });

  useEffect(() => {
    if (isDevEnv) {
      setActive(true);
      return;
    }

    const updateState = () => {
      setActive(isAdmin && isDevToolsFlagEnabled());
    };

    updateState();

    window.addEventListener(DEV_TOOLS_TOGGLE_EVENT, updateState);
    window.addEventListener('storage', updateState);

    return () => {
      window.removeEventListener(DEV_TOOLS_TOGGLE_EVENT, updateState);
      window.removeEventListener('storage', updateState);
    };
  }, [isAdmin, isDevEnv]);

  return active;
}

/**
 * Triggers a full recipe re-extraction with Gemini in development mode.
 * Dispatches an event that switches to the extraction view and executes the job.
 */
export function devReExtractRecipe(url: string, force = true): void {
  if (!url || typeof window === 'undefined') return;
  console.info('[DEV] Triggering re-extraction for URL:', url, 'force:', force);
  window.dispatchEvent(new CustomEvent('app:dev-re-extract', { detail: { url, force } }));
}
