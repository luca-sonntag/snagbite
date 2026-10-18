import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiUrl } from './api';
import { isNative } from './native';

// ─── Smart AI push notifications (FCM) ────────────────────────────────────────
//
// Remote push is Android-only (Capacitor) and complements the local-notification
// path in native.ts (which handles cooking timers). Registration captures the
// FCM device token and hands it to the backend, which stores it and sends the
// AI-generated pushes. Native Android Service (MyFirebaseMessagingService.java)
// handles fetching the remote PNG icon and rendering the square gradient emoji icon.

const PUSH_CHANNEL_ID = 'ai-suggestions';

let currentToken: string | null = null;
let listenersBound = false;

export const PUSH_RECEIVED_EVENT = 'app:push-received';

/** What a delivered push notification carries in its data payload. */
export interface PushReceivedPayload {
  type?: string;
  jobId?: string;
  recipeId?: string;
  route?: string;
  section?: string;
  remixIdea?: string;
  [key: string]: unknown;
}

/** What a tapped push carries in its data payload (set by the backend worker). */
export interface PushTapPayload extends PushReceivedPayload {}

async function ensureSuggestionsChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await PushNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: 'Recipe suggestions',
      description: 'Personalized recipe ideas from your cookbook',
      importance: 4, // HIGH — heads-up banner
      visibility: 1,
      vibration: true,
    });
  } catch (err) {
    console.warn('Failed to create push channel:', err);
  }
}

/**
 * POST the FCM token to the backend so this device can receive pushes. Requires
 * an access token from the auth context. Best-effort — network failures are
 * logged, not thrown (registration retries on the next app open).
 */
async function sendTokenToBackend(token: string, getAccessToken: () => Promise<string | null>): Promise<void> {
  try {
    const jwt = await getAccessToken();
    if (!jwt) return;
    const res = await fetch(apiUrl('/api/push/tokens'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
    });
    if (!res.ok) console.warn('Failed to register push token:', res.status);
  } catch (err) {
    console.warn('Failed to register push token:', err);
  }
}

/**
 * Request permission and register this device for remote push. Returns `true`
 * when registration was initiated (permission granted). No-op returning `false`
 * on web. Safe to call repeatedly.
 */
export async function enablePushNotifications(
  getAccessToken: () => Promise<string | null>,
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return false;

    await ensureSuggestionsChannel();

    // Bind the token/registration listeners exactly once before registering.
    if (!listenersBound) {
      listenersBound = true;
      PushNotifications.addListener('registration', (token) => {
        currentToken = token.value;
        void sendTokenToBackend(token.value, getAccessToken);
      });
      PushNotifications.addListener('registrationError', (err) => {
        console.warn('Push registration error:', err);
      });
    }

    await PushNotifications.register();
    return true;
  } catch (err) {
    console.warn('enablePushNotifications failed:', err);
    return false;
  }
}

/**
 * Unregister this device: tell the backend to drop the token so no further
 * pushes are sent here. Called when the user disables notifications in Settings.
 */
export async function disablePushNotifications(
  getAccessToken: () => Promise<string | null>,
): Promise<void> {
  if (!isNative()) return;
  const token = currentToken;
  if (!token) return;
  try {
    const jwt = await getAccessToken();
    if (!jwt) return;
    await fetch(apiUrl('/api/push/tokens'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('disablePushNotifications failed:', err);
  }
}

/**
 * Register a handler for taps on a delivered push.
 * Returns a cleanup function. No-op on web.
 */
export function registerPushTapHandler(onTap: (payload: PushTapPayload) => void): () => void {
  if (!isNative()) return () => {};

  const actionHandle = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
      console.log('[push] pushNotificationActionPerformed event:', action);
      const notificationObj = (action.notification ?? {}) as any;
      const data = (notificationObj.data ?? notificationObj.extra ?? action ?? {}) as any;
      const jobId = data.jobId || data.recipeId || (action as any)?.jobId || notificationObj?.jobId;
      onTap({
        ...data,
        jobId: jobId || data.jobId,
      });
    },
  );

  // Check for delivered notifications on launch/mount (handles cold start / killed app taps)
  PushNotifications.getDeliveredNotifications()
    .then((delivered) => {
      if (delivered?.notifications && delivered.notifications.length > 0) {
        console.log('[push] Delivered notifications on mount:', delivered.notifications);
        for (const n of delivered.notifications) {
          const data = (n.data ?? {}) as any;
          const jobId = data.jobId || data.recipeId;
          if (jobId) {
            onTap({ ...data, jobId });
            break;
          }
        }
      }
    })
    .catch((err) => console.warn('[push] Error checking delivered notifications:', err));

  const receivedHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[push] Received foreground push notification:', notification);
    const notificationObj = (notification ?? {}) as any;
    const data = (notificationObj.data ?? notificationObj.extra ?? notification ?? {}) as PushReceivedPayload;
    window.dispatchEvent(new CustomEvent(PUSH_RECEIVED_EVENT, { detail: data }));
  });

  return () => {
    actionHandle.then((h) => h.remove()).catch(() => {});
    receivedHandle.then((h) => h.remove()).catch(() => {});
  };
}
