import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { isCatalogListRoute } from './catalogRoutes';

interface UseCatalogScrollRestorationProps {
  /** Current catalog sub-path (`null` for CookbookHome, `'list/...'` for catalog lists). */
  catalogSubPath: string | null;
  /** True when a recipe detail view is open. */
  isViewingRecipe: boolean;
}

export function useCatalogScrollRestoration({
  catalogSubPath,
  isViewingRecipe,
}: UseCatalogScrollRestorationProps) {
  // Disable browser's auto scroll restoration so hash changes don't cause random jumps
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {
        // Ignore if restricted in iframe/webview
      }
    }
  }, []);

  // Store scroll positions keyed by catalog route (e.g. '__home__' or 'list/all')
  const scrollPositionsRef = useRef<Record<string, number>>({});

  // Active catalog key: only valid when NOT viewing a recipe
  const activeCatalogKey =
    !catalogSubPath || isCatalogListRoute(catalogSubPath)
      ? (catalogSubPath ?? '__home__')
      : null;

  const activeCatalogKeyRef = useRef(activeCatalogKey);
  activeCatalogKeyRef.current = activeCatalogKey;

  // Track previous viewing state to detect transitions
  const prevIsViewingRecipeRef = useRef(isViewingRecipe);
  const prevSubPathRef = useRef(catalogSubPath);

  // Explicitly record the current scroll position (e.g. right when a card is clicked)
  const recordCurrentScroll = useCallback(() => {
    const key = activeCatalogKeyRef.current;
    if (key) {
      scrollPositionsRef.current[key] = Math.max(0, window.scrollY);
    }
  }, []);

  // Continuously record scroll position while the user scrolls in the catalog
  useEffect(() => {
    if (isViewingRecipe) return;

    const handleScroll = () => {
      const key = activeCatalogKeyRef.current;
      if (key) {
        scrollPositionsRef.current[key] = Math.max(0, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isViewingRecipe]);

  // Handle scroll position restoration on transitions
  useLayoutEffect(() => {
    const wasViewingRecipe = prevIsViewingRecipeRef.current;
    prevIsViewingRecipeRef.current = isViewingRecipe;

    const prevSubPath = prevSubPathRef.current;
    prevSubPathRef.current = catalogSubPath;

    if (!wasViewingRecipe && isViewingRecipe) {
      // Opening a recipe: detail view starts at the top
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (wasViewingRecipe && !isViewingRecipe) {
      // Returning to catalog from recipe: restore previous scroll position
      const targetKey = activeCatalogKeyRef.current ?? '__home__';
      const targetY = scrollPositionsRef.current[targetKey] ?? 0;

      window.scrollTo({ top: targetY, behavior: 'instant' });

      // Fallback check on next frame in case of asynchronous layout reflow
      const rafId = requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - targetY) > 2) {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        }
      });
      return () => cancelAnimationFrame(rafId);
    } else if (!isViewingRecipe && prevSubPath !== catalogSubPath) {
      // Navigating between list and home: restore position if previously visited, otherwise top (0)
      const targetKey = activeCatalogKeyRef.current ?? '__home__';
      const targetY = scrollPositionsRef.current[targetKey] ?? 0;
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }
  }, [catalogSubPath, isViewingRecipe]);

  return { recordCurrentScroll };
}
