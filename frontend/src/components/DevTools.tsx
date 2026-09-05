import React, { useEffect } from 'react';

export const DevTools: React.FC = () => {
  useEffect(() => {
    // Only initialize in development mode
    if (!import.meta.env.DEV) return;

    let isMounted = true;

    async function initEruda() {
      try {
        const { default: eruda } = await import('eruda');
        if (!isMounted) return;

        eruda.init({
          tool: ['console', 'network', 'elements', 'resources', 'info'],
          defaults: {
            displaySize: 65,
            transparency: 95,
            theme: 'Dark',
          },
        });
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
  }, []);

  return null;
};

export default DevTools;
