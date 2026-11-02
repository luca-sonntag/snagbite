import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'shopping_show_package_recommendations';

function getStoredValue(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== 'false';
  } catch {
    return true;
  }
}

let packageRecommendationsState: boolean = getStoredValue();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      packageRecommendationsState = e.newValue !== 'false';
      notify();
    }
  });
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getPackageRecommendationsSnapshot(): boolean {
  return packageRecommendationsState;
}

export function setPackageRecommendationsPreference(value: boolean): void {
  if (packageRecommendationsState === value) return;
  packageRecommendationsState = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable
  }
  notify();
}

export function togglePackageRecommendationsPreference(): boolean {
  const next = !packageRecommendationsState;
  packageRecommendationsState = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // localStorage unavailable
  }
  notify();
  return next;
}

export function useShoppingPreferences() {
  const showPackageRecommendations = useSyncExternalStore(
    subscribe,
    getPackageRecommendationsSnapshot,
    () => true // SSR fallback
  );

  return {
    showPackageRecommendations,
    togglePackageRecommendations: togglePackageRecommendationsPreference,
    setPackageRecommendations: setPackageRecommendationsPreference,
  };
}
