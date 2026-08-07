import { useState, useEffect, useCallback } from 'react';

export type AppTab = 'extract' | 'history' | 'shopping-list' | 'progress' | 'settings' | 'admin' | 'invite';

export interface ParsedRoute {
  /** The active bottom-nav tab */
  tab: AppTab;
  /** Sub-path segment — e.g. jobId for '/#/history/:jobId' or 'recipe' for '/#/extract/recipe' */
  subPath: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseHash(hash: string): ParsedRoute {
  // Strip leading '#' and optional leading '/'
  const path = hash.replace(/^#\/?/, '');
  const [segment, ...rest] = path.split('/');
  const subPath = rest.length > 0 ? rest.join('/') : null;

  switch (segment) {
    case 'extract':
      return { tab: 'extract', subPath };
    case 'shopping-list':
      return { tab: 'shopping-list', subPath };
    case 'progress':
      return { tab: 'progress', subPath };
    case 'invite':
      // Deep link #/invite/<code> — App redirects to the progress/friends tab.
      return { tab: 'invite', subPath };
    case 'settings':
      return { tab: 'settings', subPath };
    case 'admin':
      return { tab: 'admin', subPath };
    case 'history':
    default:
      return { tab: 'history', subPath };
  }
}

function buildHash(tab: AppTab, subPath?: string | null): string {
  if (subPath) return `#/${tab}/${subPath}`;
  return `#/${tab}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHashRouter() {
  const [route, setRoute] = useState<ParsedRoute>(() => {
    // Initialise from current URL hash; default to history tab
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#/') {
      // Default tab on first visit
      return { tab: 'history', subPath: null };
    }
    return parseHash(hash);
  });

  // Sync URL → state on external hash changes (browser back/forward)
  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Write the default hash on mount if the URL has no hash yet
  useEffect(() => {
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.history.replaceState(null, '', buildHash(route.tab, route.subPath));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Navigate to a tab, optionally with a sub-path. Adds a history entry (browser back works). */
  const navigate = useCallback((tab: AppTab, subPath?: string | null) => {
    const newHash = buildHash(tab, subPath);
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
      // hashchange event fires → setRoute + scrollToTop via listener above
    }
  }, []);

  /** Replace current history entry (no back entry added). Useful for redirects. */
  const replace = useCallback((tab: AppTab, subPath?: string | null) => {
    const newHash = buildHash(tab, subPath);
    const basePath = window.location.pathname.endsWith('/share')
      ? window.location.pathname.slice(0, -6)
      : window.location.pathname;
    const cleanBasePath = basePath.endsWith('/') ? basePath : (basePath + '/');
    window.history.replaceState(null, '', cleanBasePath + newHash);
    setRoute(parseHash(newHash));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return {
    tab: route.tab,
    subPath: route.subPath,
    navigate,
    replace,
  };
}
