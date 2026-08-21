import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Versioned key: bump the suffix to re-show the guide to everyone after a
// major onboarding revamp. Matches the app's other localStorage-gated
// preferences (theme, recipe_language).
export const ONBOARDING_KEY = 'snagbite_onboarding_v1_seen';

/**
 * First-launch onboarding gate.
 *
 * `localStorage` is the authoritative, offline-first flag (like `useTheme`).
 * On completion we also best-effort mirror the flag into the user's Supabase
 * `user_metadata`, so the guide doesn't reappear after an app reinstall or on
 * a second device where localStorage is empty — that case is suppressed by
 * deriving `shouldShow` from the metadata during render (no effect needed).
 */
export function useOnboarding() {
  const { user, updateUserMetadata } = useAuth();
  const [seen, setSeen] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === 'true'
  );
  const [replaying, setReplaying] = useState(false);

  const metadataCompleted = user?.user_metadata?.onboarding_completed === true;

  // If the user is currently authenticated or has completed metadata, mark onboarding
  // as seen locally so signing out won't mistakenly show the first-launch guide.
  useEffect(() => {
    if (user || metadataCompleted) {
      if (localStorage.getItem(ONBOARDING_KEY) !== 'true') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      }
      setSeen(true);
    }
  }, [user, metadataCompleted]);

  // Show on first launch, unless already completed locally or on another
  // device — but an explicit replay always wins.
  const shouldShow = replaying || (!seen && !metadataCompleted && !user);

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setSeen(true);
    setReplaying(false);
    // Best-effort persistence across reinstalls/devices. Failures are ignored —
    // localStorage already gated it locally.
    updateUserMetadata({ onboarding_completed: true }).catch(() => {});
  }, [updateUserMetadata]);

  const replay = useCallback(() => setReplaying(true), []);

  return { shouldShow, complete, replay };
}
