import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'shopping_show_package_recommendations';
const EVENT_NAME = 'shopping-preferences-changed';

export function useShoppingPreferences() {
  const [showPackageRecommendations, setShowPackageRecommendations] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  const setPackageRecommendations = useCallback((value: boolean) => {
    setShowPackageRecommendations(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const togglePackageRecommendations = useCallback(() => {
    setShowPackageRecommendations((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setShowPackageRecommendations(e.newValue !== 'false');
      }
    };
    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setShowPackageRecommendations(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_NAME, handleCustom);
    };
  }, []);

  return {
    showPackageRecommendations,
    togglePackageRecommendations,
    setPackageRecommendations,
  };
}
