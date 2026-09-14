import React, { useEffect, useMemo } from 'react';
import { createDevToolsApi } from './devController';
import { useDevOverlays } from './useDevOverlays';
import { DevOverlayHost } from './DevOverlayHost';
import { registerErudaSnippets } from './erudaSnippets';

export const DevTools: React.FC = () => {
  const isDevMode =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && localStorage.getItem('snagbite_dev_tools') === 'true');

  const devApi = useMemo(() => (isDevMode ? createDevToolsApi() : null), [isDevMode]);
  const { activeOverlay, closeDevOverlay } = useDevOverlays();

  useEffect(() => {
    if (!devApi) return;

    window.dev = devApi;
    window.cookbookDev = devApi;

    // Log onboarding tip once when app boots in dev mode
    console.log(
      '%c🛠️ Cookbook DevTools active. %cType %cdev.help()%c or %cdev.show.<name>()%c to test any overlay.',
      'color: #10b981; font-weight: bold;',
      'color: #94a3b8;',
      'color: #3b82f6; font-weight: bold; background: rgba(59,130,246,0.1); padding: 1px 4px; border-radius: 4px;',
      'color: #94a3b8;',
      'color: #3b82f6; font-weight: bold;',
      'color: #94a3b8;'
    );

    return () => {
      delete window.dev;
      delete window.cookbookDev;
    };
  }, [devApi]);

  useEffect(() => {
    if (!isDevMode) return;

    let isMounted = true;

    async function initEruda() {
      try {
        const { default: eruda } = await import('eruda');
        if (!isMounted) return;

        eruda.init({
          tool: ['console', 'network', 'elements', 'resources', 'snippets', 'info'],
          defaults: {
            displaySize: 65,
            transparency: 95,
            theme: 'Dark',
          },
        });

        registerErudaSnippets(eruda);
      } catch (err) {
        console.warn('[DevTools] Failed to initialize Eruda:', err);
      }
    }

    void initEruda();

    return () => {
      isMounted = false;
      void import('eruda')
        .then(({ default: eruda }) => {
          eruda.destroy();
        })
        .catch(() => {});
    };
  }, [isDevMode]);

  if (!isDevMode) return null;

  return <DevOverlayHost activeOverlay={activeOverlay} onClose={closeDevOverlay} />;
};

export default DevTools;
