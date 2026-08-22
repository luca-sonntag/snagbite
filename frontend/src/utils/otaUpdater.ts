import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { isNative } from '../native';
import { supabase } from '../supabase';
import { apiUrl } from '../api';
import { APP_VERSION, APP_BUILD } from '../version';

/**
 * OTA (over-the-air) web-bundle updates via @capgo/capacitor-updater in
 * self-hosted manual mode: the backend's public /api/app-updates/check
 * endpoint decides whether a newer bundle exists, the zip is downloaded
 * silently from Supabase Storage and staged via next() — it becomes active on
 * the next background/relaunch, never mid-session. Missing notifyAppReady()
 * within appReadyTimeout auto-reverts a broken bundle (see capacitor.config.ts).
 *
 * OTA only ever ships web assets; native plugins/versioning stay untouched.
 * Everything here is inert on web and in dev (live-reload) builds.
 */

/** localStorage override for the update channel (debugging/E2E): 'production' | 'alpha' | 'internal'. */
const CHANNEL_OVERRIDE_KEY = 'snagbite.otaChannel';

/** Minimum time between update checks. */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/** Delay of the deferred first check after boot. */
const INITIAL_CHECK_DELAY_MS = 5 * 1000;

let initialized = false;
let checkInFlight = false;
let lastCheckAt = 0;

interface CheckResponse {
  success: boolean;
  update: boolean;
  version?: string;
  url?: string;
  checksum?: string;
  minVersionCode?: number;
}

function isOtaEnabled(): boolean {
  return isNative() && !import.meta.env.DEV;
}

/**
 * Resolve the update channel: explicit localStorage override first (device
 * debugging), else 'alpha' for alpha-tier users, else 'production'. The tier
 * may not be loaded on the very first check after a cold start — that
 * self-heals on the next resume check.
 */
async function resolveChannel(): Promise<'production' | 'alpha' | 'internal'> {
  try {
    const override = localStorage.getItem(CHANNEL_OVERRIDE_KEY);
    if (override === 'production' || override === 'alpha' || override === 'internal') return override;
  } catch {
    // localStorage unavailable — fall through to tier detection.
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.app_metadata?.tier === 'alpha') return 'alpha';
  } catch {
    // No session yet — default to production.
  }

  return 'production';
}

/**
 * Check the backend for a newer web bundle and silently download + stage it.
 * Throttled and guarded against concurrent runs; all failures are soft (the
 * app just stays on its current bundle until the next check).
 */
async function checkForUpdate(): Promise<void> {
  if (!isOtaEnabled()) return;
  if (checkInFlight) return;
  if (Date.now() - lastCheckAt < CHECK_INTERVAL_MS) return;

  checkInFlight = true;
  lastCheckAt = Date.now();

  try {
    const channel = await resolveChannel();
    // 'builtin' on stock installs, otherwise the running OTA bundle version.
    const { bundle: currentBundle } = await CapacitorUpdater.current();

    // Fetch the true native app build number (versionCode) from Capacitor
    let nativeVersionCode = Number(APP_BUILD);
    try {
      const appInfo = await App.getInfo();
      const parsed = Number(appInfo.build);
      if (!isNaN(parsed) && parsed > 0) {
        nativeVersionCode = parsed;
      }
    } catch {
      // Fallback to static APP_BUILD
    }

    const response = await fetch(apiUrl('/api/app-updates/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        versionCode: nativeVersionCode,
        currentBundleVersion: currentBundle.version,
        appVersion: APP_VERSION,
      }),
    });

    if (!response.ok) {
      console.warn(`[OTA] Update check failed with HTTP ${response.status}`);
      return;
    }

    const result = (await response.json()) as CheckResponse;
    if (!result.success || !result.update || !result.version || !result.url) {
      console.log(`[OTA] Up to date (channel=${channel}, bundle=${currentBundle.version})`);
      return;
    }

    console.log(`[OTA] Update available: ${result.version} (channel=${channel}, current=${currentBundle.version})`);

    // Reuse an already-downloaded bundle if present (e.g. staged earlier but
    // not yet applied), skipping ones that previously failed.
    let bundleId: string | undefined;
    try {
      const { bundles } = await CapacitorUpdater.list();
      const existing = bundles.find(
        (b) => b.version === result.version && b.status === 'success',
      );
      if (existing) {
        console.log(`[OTA] Reusing already-downloaded bundle ${existing.id}`);
        bundleId = existing.id;
      }
    } catch (err) {
      console.warn('[OTA] Listing local bundles failed:', err);
    }

    if (!bundleId) {
      console.log(`[OTA] Downloading ${result.url}`);
      const downloaded = await CapacitorUpdater.download({
        url: result.url,
        version: result.version,
        checksum: result.checksum,
      });
      bundleId = downloaded.id;
    }

    await CapacitorUpdater.next({ id: bundleId });
    console.log(`[OTA] Bundle ${result.version} staged — ready for instant or next relaunch`);

    pendingUpdate = { version: result.version, bundleId };
    window.dispatchEvent(new CustomEvent(OTA_READY_EVENT, { detail: pendingUpdate }));
  } catch (err) {
    console.error('[OTA] Update check failed:', err);
  } finally {
    checkInFlight = false;
  }
}

export interface OtaReadyInfo {
  version: string;
  bundleId: string;
}

export const OTA_READY_EVENT = 'snagbite:ota-update-ready';
let pendingUpdate: OtaReadyInfo | null = null;

export function getPendingOtaUpdate(): OtaReadyInfo | null {
  return pendingUpdate;
}

export async function applyOtaUpdateImmediately(bundleId?: string): Promise<void> {
  if (!isOtaEnabled()) return;
  try {
    const targetId = bundleId || pendingUpdate?.bundleId;
    if (targetId) {
      console.log(`[OTA] Applying bundle ${targetId} immediately via set()...`);
      await CapacitorUpdater.set({ id: targetId });
    } else {
      console.log('[OTA] Reloading app immediately...');
      await CapacitorUpdater.reload();
    }
  } catch (err) {
    console.warn('[OTA] Immediate set failed, falling back to reload():', err);
    try {
      await CapacitorUpdater.reload();
    } catch {}
  }
}

/**
 * Version of the currently running OTA bundle, or null when running the
 * builtin (Play Store) web assets. Used by SettingsView for on-device
 * confirmation that an OTA update landed.
 */
export async function getActiveOtaVersion(): Promise<string | null> {
  if (!isOtaEnabled()) return null;
  try {
    const { bundle } = await CapacitorUpdater.current();
    return bundle.version !== 'builtin' ? bundle.version : null;
  } catch {
    return null;
  }
}

/**
 * Initialize OTA updates: confirm the current bundle is healthy
 * (notifyAppReady), then check for updates ~5s after boot and on every app
 * resume (throttled). No-op on web and in dev builds.
 *
 * Owns its own resume listener on purpose — the RevenueCat one in purchase.ts
 * is only registered after billing init, which needs a signed-in user.
 */
export function initOtaUpdates(): void {
  if (!isOtaEnabled() || initialized) return;
  initialized = true;

  // Anti-brick contract: signal within appReadyTimeout that this bundle boots,
  // otherwise the plugin rolls back to the previous bundle and deletes this
  // one. Must fire regardless of how the rest of the init goes.
  CapacitorUpdater.notifyAppReady()
    .then(() => console.log('[OTA] notifyAppReady confirmed'))
    .catch((err) => console.warn('[OTA] notifyAppReady failed:', err));

  App.addListener('resume', () => {
    void checkForUpdate();
  });

  setTimeout(() => {
    void checkForUpdate();
  }, INITIAL_CHECK_DELAY_MS);
}
