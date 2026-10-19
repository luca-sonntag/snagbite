import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { isNative } from '../native';
import { apiUrl } from '../api';
import { APP_VERSION, APP_BUILD } from '../version';

/**
 * OTA (over-the-air) web-bundle updates via @capgo/capacitor-updater in
 * self-hosted manual mode: the backend's public /api/app-updates/check
 * endpoint decides whether a newer bundle exists, the zip is downloaded
 * and applied immediately with an app loading screen displayed during download.
 *
 * Missing notifyAppReady() within appReadyTimeout auto-reverts a broken bundle.
 * Everything here is inert on web and in dev (live-reload) builds.
 */

const CHANNEL_OVERRIDE_KEY = 'snagbite.otaChannel';
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const CHECK_TIMEOUT_MS = 3500;
const DOWNLOAD_TIMEOUT_MS = 25000;

let initialized = false;
let checkInFlight = false;
let lastCheckAt = 0;
let isUpdatingState = false;

interface CheckResponse {
  success: boolean;
  update: boolean;
  version?: string;
  url?: string;
  checksum?: string;
  minVersionCode?: number;
}

export interface OtaUpdateResult {
  status: 'up-to-date' | 'updated' | 'updating' | 'error' | 'unsupported';
  version?: string;
  error?: string;
}

export const OTA_STATUS_EVENT = 'snagbite:ota-update-status';
export const OTA_READY_EVENT = 'snagbite:ota-update-ready';

export type OtaStatusListener = (isUpdating: boolean) => void;
const statusListeners = new Set<OtaStatusListener>();

export function isOtaUpdating(): boolean {
  return isUpdatingState;
}

export function onOtaStatusChange(listener: OtaStatusListener): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function setUpdating(updating: boolean): void {
  if (isUpdatingState === updating) return;
  isUpdatingState = updating;
  statusListeners.forEach((fn) => fn(updating));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OTA_STATUS_EVENT, { detail: { isUpdating: updating } }));
  }
}

function isOtaEnabled(): boolean {
  if (!isNative()) return false;
  // If running via Capacitor live-reload dev server (e.g. http://192.168.x.x:5173), skip OTA
  if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.port !== '') {
    return false;
  }
  return true;
}

async function resolveChannel(): Promise<'production' | 'alpha' | 'internal'> {
  try {
    const override = localStorage.getItem(CHANNEL_OVERRIDE_KEY);
    if (override === 'production' || override === 'alpha' || override === 'internal') return override;
  } catch {
    // localStorage unavailable
  }

  return 'production';
}

/**
 * Check the backend for a newer web bundle and apply it automatically.
 * While downloading and applying, setUpdating(true) notifies the UI to show the loading screen.
 */
export async function checkAndApplyOtaUpdate(options?: { manual?: boolean }): Promise<OtaUpdateResult> {
  const isManual = options?.manual === true;

  if (!isOtaEnabled()) {
    return { status: 'unsupported' };
  }

  if (checkInFlight) {
    return { status: 'updating' };
  }

  if (!isManual && Date.now() - lastCheckAt < CHECK_INTERVAL_MS) {
    return { status: 'up-to-date' };
  }

  checkInFlight = true;
  lastCheckAt = Date.now();

  try {
    const channel = await resolveChannel();
    const { bundle: currentBundle } = await CapacitorUpdater.current();

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

    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => abortController.abort(), CHECK_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(apiUrl('/api/app-updates/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          versionCode: nativeVersionCode,
          currentBundleVersion: currentBundle.version,
          appVersion: APP_VERSION,
        }),
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(abortTimeout);
    }

    if (!response.ok) {
      console.warn(`[OTA] Update check failed with HTTP ${response.status}`);
      return { status: 'error', error: `HTTP ${response.status}` };
    }

    const result = (await response.json()) as CheckResponse;
    if (!result.success || !result.update || !result.version || !result.url) {
      console.log(`[OTA] Up to date (channel=${channel}, bundle=${currentBundle.version})`);
      return { status: 'up-to-date' };
    }

    console.log(`[OTA] Update available: ${result.version} (channel=${channel}, current=${currentBundle.version})`);

    // Signal UI to show loading screen
    setUpdating(true);

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
      console.log(`[OTA] Downloading ${result.url}...`);
      const downloadPromise = CapacitorUpdater.download({
        url: result.url,
        version: result.version,
        checksum: result.checksum,
      });

      const downloaded = await Promise.race([
        downloadPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OTA bundle download timed out')), DOWNLOAD_TIMEOUT_MS)
        ),
      ]);
      bundleId = downloaded.id;
    }

    console.log(`[OTA] Applying bundle ${bundleId} immediately...`);
    await CapacitorUpdater.set({ id: bundleId });
    return { status: 'updated', version: result.version };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[OTA] Update check or apply failed:', message);
    setUpdating(false);
    return { status: 'error', error: message };
  } finally {
    checkInFlight = false;
  }
}

/**
 * Version of the currently running OTA bundle, or null on stock (Play Store) installs.
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
 * Initialize OTA updates: confirm the current bundle is healthy (notifyAppReady),
 * and register resume listener for throttled checks.
 */
export function initOtaUpdates(): void {
  if (!isOtaEnabled() || initialized) return;
  initialized = true;

  CapacitorUpdater.notifyAppReady()
    .then(() => console.log('[OTA] notifyAppReady confirmed'))
    .catch((err) => console.warn('[OTA] notifyAppReady failed:', err));

  App.addListener('resume', () => {
    void checkAndApplyOtaUpdate();
  });
}
