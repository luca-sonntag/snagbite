import { useEffect, useRef } from 'react';
import { registerAppStateListener } from '../native';
import { PUSH_RECEIVED_EVENT, type PushReceivedPayload } from '../push';

interface UseSocialLiveSyncProps {
  session: unknown;
  refreshShares: () => Promise<void>;
  refreshFriends: (opts?: { silent?: boolean }) => Promise<void>;
}

const RESUME_THROTTLE_MS = 10_000;

/**
 * Live-sync hook for social data (shared recipes, friend requests, feed events).
 * Reacts to:
 * 1. Foreground push notifications (0ms delay, no polling overhead)
 * 2. App resume / foregrounding (native appStateChange & web visibilitychange)
 */
export function useSocialLiveSync({
  session,
  refreshShares,
  refreshFriends,
}: UseSocialLiveSyncProps) {
  const lastResumeSyncRef = useRef<number>(0);

  // 1. Listen for foreground push notifications
  useEffect(() => {
    if (!session) return;

    const handlePushReceived = (e: Event) => {
      const customEvent = e as CustomEvent<PushReceivedPayload>;
      const detail = customEvent.detail ?? {};
      console.log('[SocialLiveSync] Foreground push received:', detail);

      switch (detail.type) {
        case 'recipe_shared':
          void refreshShares();
          break;
        case 'friend_request':
        case 'friend_accepted':
          void refreshFriends({ silent: true });
          break;
        case 'friend_cooked':
          window.dispatchEvent(new CustomEvent('feed:refresh', { detail: { silent: true } }));
          break;
        default:
          break;
      }
    };

    window.addEventListener(PUSH_RECEIVED_EVENT, handlePushReceived);
    return () => window.removeEventListener(PUSH_RECEIVED_EVENT, handlePushReceived);
  }, [session, refreshShares, refreshFriends]);

  // 2. Lifecycle resume: silent sync when app returns from background/sleep
  useEffect(() => {
    if (!session) return;

    const handleResume = () => {
      const now = Date.now();
      if (now - lastResumeSyncRef.current < RESUME_THROTTLE_MS) return;
      lastResumeSyncRef.current = now;

      console.log('[SocialLiveSync] App resumed -> silent social sync');
      void refreshShares();
      void refreshFriends({ silent: true });
    };

    // Native Capacitor app resume
    const cleanupNative = registerAppStateListener((isActive) => {
      if (isActive) handleResume();
    });

    // Web / PWA tab visibility resume
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanupNative();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, refreshShares, refreshFriends]);
}
