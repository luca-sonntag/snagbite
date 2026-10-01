import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isNative } from '../native';

/**
 * Google Play Store In-App Updates utility for Android.
 * Enforces immediate full-screen updates when newer store releases are available
 * and resumes developer-triggered updates if previously interrupted.
 */

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const BOOT_CHECK_DELAY_MS = 4000;

let initialized = false;
let checkInFlight = false;
let lastCheckAt = 0;

export interface NativeUpdateResult {
  status: 'up-to-date' | 'update-started' | 'store-opened' | 'in-progress' | 'unsupported' | 'error';
  currentVersionName?: string;
  currentVersionCode?: string;
  availableVersionName?: string;
  availableVersionCode?: string;
  error?: string;
}

function isPlayUpdateSupported(): boolean {
  return isNative() && Capacitor.getPlatform() === 'android';
}

/**
 * Checks for Google Play Store updates and applies or resumes the immediate update flow.
 */
export async function checkAndApplyNativeUpdate(options?: { manual?: boolean }): Promise<NativeUpdateResult> {
  const isManual = options?.manual === true;

  if (!isPlayUpdateSupported()) {
    return { status: 'unsupported' };
  }

  if (checkInFlight) {
    return { status: 'in-progress' };
  }

  if (!isManual && Date.now() - lastCheckAt < CHECK_INTERVAL_MS) {
    return { status: 'up-to-date' };
  }

  checkInFlight = true;
  lastCheckAt = Date.now();

  try {
    const info = await AppUpdate.getAppUpdateInfo();
    const currentVersionName = info.currentVersionName;
    const currentVersionCode = info.currentVersionCode;
    const availableVersionName = info.availableVersionName;
    const availableVersionCode = info.availableVersionCode;

    // 1. Resume in-progress update if user minimized during previous download/install
    if (info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS) {
      console.log('[PlayUpdate] Resuming in-progress immediate update');
      await AppUpdate.performImmediateUpdate();
      return { status: 'update-started', currentVersionName, currentVersionCode, availableVersionName, availableVersionCode };
    }

    // 2. Strict forced immediate update when a new version is published
    if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
      console.log(`[PlayUpdate] Update available: ${availableVersionName || availableVersionCode} (current: ${currentVersionName || currentVersionCode})`);
      if (info.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate();
        return { status: 'update-started', currentVersionName, currentVersionCode, availableVersionName, availableVersionCode };
      }

      // Fallback: If Google Play disallows immediate in-app dialog, redirect to store page
      console.warn('[PlayUpdate] Immediate update not allowed, opening Play Store page');
      await AppUpdate.openAppStore();
      return { status: 'store-opened', currentVersionName, currentVersionCode, availableVersionName, availableVersionCode };
    }

    return { status: 'up-to-date', currentVersionName, currentVersionCode, availableVersionName, availableVersionCode };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[PlayUpdate] In-app update check failed:', message);
    return { status: 'error', error: message };
  } finally {
    checkInFlight = false;
  }
}

/**
 * Initializes listeners for boot check and app resume.
 */
export function initNativeAppUpdates(): void {
  if (!isPlayUpdateSupported() || initialized) return;
  initialized = true;

  // Check on app resume: immediately resume in-flight updates or throttle periodic checks
  App.addListener('resume', async () => {
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      if (info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS) {
        console.log('[PlayUpdate] App resumed with update in progress, re-launching prompt');
        await AppUpdate.performImmediateUpdate();
        return;
      }
    } catch {
      // Ignore background check errors
    }

    void checkAndApplyNativeUpdate();
  });

  // Delayed check after cold boot
  setTimeout(() => {
    void checkAndApplyNativeUpdate();
  }, BOOT_CHECK_DELAY_MS);
}
