import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SendIntent } from 'send-intent';
import { parseSharedUrl } from './utils/shareUrl';

const BRAND_COLOR = '#064e3b';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Theme the native status bar to match the app's brand color.
 * Safe to call on web (no-ops off native).
 */
export async function initNativeUi(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark }); // dark background -> light icons
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: BRAND_COLOR });
    }
  } catch (err) {
    console.warn('StatusBar setup failed:', err);
  }
}

/**
 * Hide the native splash screen when the web layer is ready and synced.
 * Safe to call on web (no-ops off native).
 */
export async function hideSplashScreen(): Promise<void> {
  if (!isNative()) return;
  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn('Failed to hide splash screen:', err);
  }
}

// ─── Local Notifications ──────────────────────────────────────────────────────

const TIMER_NOTIFICATION_ID = 1;
const TIMER_CHANNEL_ID = 'cooking-timers';

// Guard so we only create the channel once per app run.
let channelReady: Promise<void> | null = null;

/**
 * Create the high-importance Android notification channel used for timer
 * alerts. HIGH importance is what makes the notification pop up as a heads-up
 * banner (with sound + vibration) instead of appearing silently in the shade.
 * No-op on iOS/web. Channel settings are locked by Android after creation, so
 * changing importance later requires a new channel id.
 */
async function ensureTimerChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  if (!channelReady) {
    channelReady = LocalNotifications.createChannel({
      id: TIMER_CHANNEL_ID,
      name: 'Cooking timers',
      description: 'Alerts when a cooking timer finishes',
      importance: 5, // MAX — heads-up banner
      visibility: 1, // public — show on lock screen
      sound: undefined, // default notification sound
      vibration: true,
      lights: true,
    }).catch((err) => {
      console.warn('Failed to create notification channel:', err);
      channelReady = null; // allow a retry on the next attempt
    });
  }
  await channelReady;
}

/**
 * Ask the OS for permission to post local notifications (Android 13+ / iOS).
 * No-op returning `false` on web — callers fall back to the Web Notification API.
 */
export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch (err) {
    console.warn('LocalNotifications permission request failed:', err);
    return false;
  }
}

/**
 * Show an immediate native local notification for a finished cooking timer.
 * The recipe/step are stored in `extra` so a tap can route back to the step.
 * Returns `false` if not on native or if delivery failed (caller may fall back).
 */
export async function sendNativeNotification(
  title: string,
  body: string,
  recipeId?: string,
  stepNum?: number,
  notificationId: number = TIMER_NOTIFICATION_ID,
  extraData?: Record<string, any>,
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const granted = await requestNativeNotificationPermission();
    if (!granted) return false;

    await ensureTimerChannel();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId: TIMER_CHANNEL_ID,
          // Status-bar (small) icon only — a monochrome silhouette of the app
          // logo. Android tints small icons to a single color, so this is the
          // app's own mark, not a generic glyph. No largeIcon: we intentionally
          // don't want a big icon on the right of the notification.
          smallIcon: 'ic_stat_icon',
          ongoing: false,
          extra: { recipeId, stepNum, ...extraData },
        },
      ],
    });
    return true;
  } catch (err) {
    console.error('sendNativeNotification failed:', err);
    return false;
  }
}

/**
 * Check whether our timer notification is still sitting in the system tray.
 * Returns `true` if present, `false` if the user has cleared/dismissed it — or
 * on web, where there is no persistent tray. Used to reconcile timer state when
 * the app returns to the foreground: a notification the user swiped away means
 * "end the timer".
 */
export async function isTimerNotificationDelivered(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { notifications } = await LocalNotifications.getDeliveredNotifications();
    return notifications.some((n) => n.id === TIMER_NOTIFICATION_ID);
  } catch (err) {
    console.warn('getDeliveredNotifications failed:', err);
    // Assume it's still there so we don't dismiss a timer on a transient error.
    return true;
  }
}

/**
 * Remove our timer notification from the system tray (if present). Called when
 * a finished timer is dismissed inside the app so the tray stays in sync — the
 * app only ever posts this single timer notification, so clearing all delivered
 * ones is safe. No-op on web.
 */
export async function clearTimerNotification(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.removeAllDeliveredNotifications();
  } catch (err) {
    console.warn('removeAllDeliveredNotifications failed:', err);
  }
}

/**
 * Register a handler for taps on native local notifications. Invokes `onTap`
 * with the recipe/step stored in the notification's `extra`. Returns a cleanup
 * function. No-op on web.
 */
export function registerNotificationTap(
  onTap: (recipeId?: string, stepNum?: number, extra?: Record<string, any>) => void,
): () => void {
  if (!isNative()) return () => { };

  try {
    const handlePromise = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action) => {
        console.log('[native] localNotificationActionPerformed event:', action);
        const extra = (action.notification?.extra ?? (action.notification as any)?.data ?? {}) as {
          recipeId?: string;
          jobId?: string;
          stepNum?: number;
          route?: string;
          action?: string;
        };
        onTap(extra.recipeId || extra.jobId, extra.stepNum, extra);
      },
    );

    return () => {
      handlePromise.then((handle) => handle.remove()).catch(() => { });
    };
  } catch (err) {
    console.warn('Failed to register notification tap listener:', err);
    return () => { };
  }
}

/**
 * Register a listener for Capacitor App state changes (app backgrounded / foregrounded).
 * Invokes `onChange(isActive)` whenever the app state changes. Returns a cleanup function.
 * No-op on web.
 */
export function registerAppStateListener(
  onChange: (isActive: boolean) => void,
): () => void {
  if (!isNative()) return () => { };

  try {
    const handlePromise = App.addListener('appStateChange', (state) => {
      onChange(state.isActive);
    });

    return () => {
      handlePromise.then((handle) => handle.remove()).catch(() => { });
    };
  } catch (err) {
    console.warn('Failed to register appStateChange listener:', err);
    return () => { };
  }
}

// ─── Hardware / Swipe Back Button ────────────────────────────────────────────

/**
 * Register a handler for the Android hardware back-button and the edge
 * swipe-back gesture. Without this, Capacitor immediately exits the app
 * whenever the WebView has no more native history entries.
 *
 * The callback receives no arguments and must return `true` if it handled
 * the action (navigated within the app) or `false` if we are already at the
 * root and the app should exit.
 *
 * Returns a cleanup function that removes the listener.
 * No-op on non-native platforms.
 */
export function registerBackButtonHandler(
  onBack: () => boolean,
): () => void {
  if (!isNative()) return () => { };

  try {
    const handlePromise = App.addListener('backButton', (_ev) => {
      const handled = onBack();
      if (!handled) {
        // Nothing left to navigate back to — exit gracefully.
        App.exitApp();
      }
    });

    return () => {
      handlePromise.then((handle) => handle.remove()).catch(() => { });
    };
  } catch (err) {
    console.warn('Failed to register backButton handler:', err);
    return () => { };
  }
}

let lastProcessedPayload: string | null = null;

/**
 * Register a handler for Android share intents (ACTION_SEND). Invokes `onUrl`
 * with the first URL found in the shared text. Handles both cold starts and
 * shares received while the app is already running. Returns a cleanup function.
 */
export function registerShareIntent(onUrl: (url: string) => void): () => void {
  if (!isNative()) return () => { };

  const handle = async (isNewIntentEvent: boolean) => {
    try {
      const result = await SendIntent.checkSendIntentReceived();
      // Shared plain text arrives in `title`; `url` is set for shared links.
      const payload = (result as { url?: string; title?: string })?.url
        ?? (result as { title?: string })?.title;
      if (!payload) return;

      // If this is not a new intent event, and the payload is the same as the last one, ignore.
      if (!isNewIntentEvent && payload === lastProcessedPayload) {
        return;
      }
      lastProcessedPayload = payload;

      const decoded = decodeURIComponent(payload);
      const url = parseSharedUrl(decoded);
      if (url) onUrl(url);
    } catch {
      // No pending intent — ignore.
    }
  };

  // Cold start (app launched via share)
  handle(false);

  // Warm shares (app already open, event triggered by onNewIntent)
  const eventHandler = () => handle(true);
  window.addEventListener('sendIntentReceived', eventHandler);
  return () => window.removeEventListener('sendIntentReceived', eventHandler);
}

/**
 * Register a listener for Capacitor App URL open events (Deep Links & App Links).
 * Handles URLs opened while app is running or on cold start.
 */
export function registerAppUrlOpen(onUrl: (url: string) => void): () => void {
  if (!isNative()) return () => { };

  try {
    const handlePromise = App.addListener('appUrlOpen', (data) => {
      if (data?.url) {
        onUrl(data.url);
      }
    });

    return () => {
      handlePromise.then((handle) => handle.remove()).catch(() => { });
    };
  } catch (err) {
    console.warn('Failed to register appUrlOpen listener:', err);
    return () => { };
  }
}
