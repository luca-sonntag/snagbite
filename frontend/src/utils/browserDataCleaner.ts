import { clearImageCache } from './imageStore';

/**
 * Robustly deletes all local browser data:
 * - IndexedDB (image cache and any active databases)
 * - Cache Storage (PWA / Service Worker offline assets)
 * - Service Worker registrations
 * - Session Storage & Local Storage
 * - Accessible cookies
 */
export async function clearAllBrowserData(): Promise<void> {
  // 1. Evict image cache (memory + IndexedDB)
  try {
    await clearImageCache();
  } catch (err) {
    console.warn('[clearBrowserData] clearImageCache failed:', err);
  }

  // 2. Delete all IndexedDB databases
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      if (typeof window.indexedDB.databases === 'function') {
        const dbs = await window.indexedDB.databases();
        await Promise.all(
          dbs.map((dbInfo) => {
            if (!dbInfo.name) return Promise.resolve();
            return new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(dbInfo.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            });
          })
        );
      } else {
        // Fallback for browsers without indexedDB.databases()
        await new Promise<void>((resolve) => {
          const req = window.indexedDB.deleteDatabase('recipe-image-cache');
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        });
      }
    }
  } catch (err) {
    console.warn('[clearBrowserData] IndexedDB wipe failed:', err);
  }

  // 3. Clear Cache Storage
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
    }
  } catch (err) {
    console.warn('[clearBrowserData] CacheStorage wipe failed:', err);
  }

  // 4. Unregister Service Workers
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch (err) {
    console.warn('[clearBrowserData] ServiceWorker unregister failed:', err);
  }

  // 5. Clear Storage APIs
  try {
    sessionStorage.clear();
  } catch {}

  try {
    localStorage.clear();
  } catch {}

  // 6. Expire cookies
  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
      }
    }
  } catch (err) {
    console.warn('[clearBrowserData] Cookie wipe failed:', err);
  }
}
