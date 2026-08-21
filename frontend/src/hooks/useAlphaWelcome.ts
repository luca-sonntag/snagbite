import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Versioned key: bump the suffix to re-show the alpha welcome to everyone after
// a major revision. Mirrors useOnboarding's localStorage-gated approach.
export const ALPHA_WELCOME_KEY = 'snagbite_alpha_welcome_v1_seen';

/**
 * Alpha welcome gate — shown once to alpha testers after their first login.
 *
 * Only fires when the logged-in user's tier is `alpha`. `localStorage` is the
 * authoritative, offline-first flag; on completion we also best-effort mirror
 * it into the user's Supabase `user_metadata`, so the overlay doesn't reappear
 * after a reinstall or on a second device (that case is suppressed by deriving
 * `shouldShow` from the metadata during render).
 */
export function useAlphaWelcome() {
  const { user, updateUserMetadata } = useAuth();
  const [seen, setSeen] = useState(
    () => localStorage.getItem(ALPHA_WELCOME_KEY) === 'true'
  );

  const isAlpha = user?.app_metadata?.tier === 'alpha';
  const metadataSeen = user?.user_metadata?.alpha_welcome_seen === true;

  // Sync locally if seen in metadata on another device
  useEffect(() => {
    if (metadataSeen) {
      if (localStorage.getItem(ALPHA_WELCOME_KEY) !== 'true') {
        localStorage.setItem(ALPHA_WELCOME_KEY, 'true');
      }
      setSeen(true);
    }
  }, [metadataSeen]);

  // Show once for alpha testers, unless already dismissed locally or on
  // another device.
  const shouldShow = isAlpha && !seen && !metadataSeen;

  const complete = useCallback(() => {
    localStorage.setItem(ALPHA_WELCOME_KEY, 'true');
    setSeen(true);
    // Best-effort persistence across reinstalls/devices. Failures are ignored —
    // localStorage already gated it locally.
    updateUserMetadata({ alpha_welcome_seen: true }).catch(() => {});
  }, [updateUserMetadata]);

  return { shouldShow, complete };
}
