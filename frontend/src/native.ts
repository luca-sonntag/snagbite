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

export const TIMER_NOTIFICATION_ID = 1;
export const RECIPE_READY_NOTIFICATION_ID = 2;
export const EXTRACTION_INTERRUPTED_NOTIFICATION_ID = 3;

const TIMER_CHANNEL_ID = 'cooking-timers';
const RECIPE_CHANNEL_ID = 'recipe-extractions';

// Guards so channels are created once per app run.
let timerChannelReady: Promise<void> | null = null;
let recipeChannelReady: Promise<void> | null = null;

/**
 * Check whether the app is currently running in the background.
 * Uses Capacitor App.getState() on native devices and document.visibilityState on web.
 */
export async function isAppInBackground(): Promise<boolean> {
  if (isNative()) {
    try {
      const state = await App.getState();
      return !state.isActive;
    } catch {
      return document.visibilityState !== 'visible';
    }
  }
  return document.visibilityState !== 'visible';
}

/**
 * Create the high-importance Android notification channel used for timer
 * alerts. HIGH importance is what makes the notification pop up as a heads-up
 * banner (with sound + vibration) instead of appearing silently in the shade.
 * No-op on iOS/web.
 */
async function ensureTimerChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  if (!timerChannelReady) {
    timerChannelReady = LocalNotifications.createChannel({
      id: TIMER_CHANNEL_ID,
      name: 'Cooking timers',
      description: 'Alerts when a cooking timer finishes',
      importance: 5, // MAX — heads-up banner
      visibility: 1, // public — show on lock screen
      sound: undefined, // default notification sound
      vibration: true,
      lights: true,
    }).catch((err) => {
      console.warn('Failed to create timer notification channel:', err);
      timerChannelReady = null; // allow a retry on the next attempt
    });
  }
  await timerChannelReady;
}

/**
 * Create the Android notification channel used for recipe completion alerts.
 */
async function ensureRecipeChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  if (!recipeChannelReady) {
    recipeChannelReady = LocalNotifications.createChannel({
      id: RECIPE_CHANNEL_ID,
      name: 'Recipe extractions',
      description: 'Alerts when recipe extraction is complete',
      importance: 4, // HIGH
      visibility: 1, // public — show on lock screen
      sound: undefined,
      vibration: true,
      lights: true,
    }).catch((err) => {
      console.warn('Failed to create recipe notification channel:', err);
      recipeChannelReady = null;
    });
  }
  await recipeChannelReady;
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
  channelId: string = TIMER_CHANNEL_ID,
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const granted = await requestNativeNotificationPermission();
    if (!granted) return false;

    if (channelId === TIMER_CHANNEL_ID) {
      await ensureTimerChannel();
    } else if (channelId === RECIPE_CHANNEL_ID) {
      await ensureRecipeChannel();
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId,
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
 * Remove our timer notification from the system tray (if present).
 */
export async function clearTimerNotification(): Promise<void> {
  if (!isNative()) return;
  try {
    const { notifications } = await LocalNotifications.getDeliveredNotifications();
    const delivered = notifications.filter((n) => n.id === TIMER_NOTIFICATION_ID);
    if (delivered.length > 0) {
      await LocalNotifications.removeDeliveredNotifications({ notifications: delivered });
    }
    await LocalNotifications.cancel({
      notifications: [{ id: TIMER_NOTIFICATION_ID }],
    });
  } catch (err) {
    console.warn('clearTimerNotification failed:', err);
  }
}

/**
 * Remove any recipe ready notification from the system tray.
 */
export async function clearRecipeReadyNotification(): Promise<void> {
  if (!isNative()) return;
  try {
    const { notifications } = await LocalNotifications.getDeliveredNotifications();
    const delivered = notifications.filter((n) => n.id === RECIPE_READY_NOTIFICATION_ID);
    if (delivered.length > 0) {
      await LocalNotifications.removeDeliveredNotifications({ notifications: delivered });
    }
    await LocalNotifications.cancel({
      notifications: [{ id: RECIPE_READY_NOTIFICATION_ID }],
    });
  } catch (err) {
    console.warn('clearRecipeReadyNotification failed:', err);
  }
}

/**
 * Send a notification when recipe extraction finishes.
 * - Only sends if the app is currently in the background.
 * - Removes/overwrites any previous recipe ready notification so that ONLY ONE
 *   notification of this type exists in the system tray at any time.
 */
export async function sendRecipeReadyNotification(
  title: string,
  body: string,
  recipeId?: string,
): Promise<boolean> {
  if (!isNative()) return false;

  const inBackground = await isAppInBackground();
  if (!inBackground) return false;

  // Clear existing recipe ready notification first to ensure single instance
  await clearRecipeReadyNotification();

  return sendNativeNotification(
    title,
    body,
    recipeId,
    undefined,
    RECIPE_READY_NOTIFICATION_ID,
    { route: 'recipe', recipeId },
    RECIPE_CHANNEL_ID,
  );
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
    // Cold start: App launched while process was closed/killed
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        onUrl(launchUrl.url);
      }
    }).catch(() => { });

    // Warm start: App already running when URL is opened
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
