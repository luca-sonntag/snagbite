import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { useI18n } from '../context/I18nContext';
import { checkAndApplyNativeUpdate } from '../utils/nativeAppUpdater';
import {
  checkAndApplyOtaUpdate,
  isOtaUpdating,
  onOtaStatusChange,
} from '../utils/otaUpdater';

export interface UseAppUpdatesResult {
  /** True while an OTA bundle is being downloaded and applied */
  isUpdating: boolean;
  /** Localized status message shown on the app loading screen */
  updateMessage: string;
}

/**
 * Coordinates app updates:
 * - Checks Google Play Store for immediate native updates
 * - Checks Capgo for OTA web bundle updates
 * - Signals the UI to keep or display the app loading screen while an OTA update is applying
 */
export function useAppUpdates(): UseAppUpdatesResult {
  const { t } = useI18n();
  const [isUpdating, setIsUpdating] = useState<boolean>(() => isOtaUpdating());

  const updateMessage = t('app.loading.updatingApp') || 'App-Update wird installiert…';

  useEffect(() => {
    // Synchronize local state with OTA updater status
    const unsubscribe = onOtaStatusChange((updating) => {
      setIsUpdating(updating);
    });

    let isMounted = true;

    // Coordinated update sequence: Play Store first, then OTA
    const performUpdateCheck = async () => {
      try {
        // 1. Google Play Store check (takes priority over web bundles)
        const nativeResult = await checkAndApplyNativeUpdate();
        if (nativeResult.status === 'update-started' || nativeResult.status === 'store-opened') {
          return;
        }

        // 2. OTA bundle check
        if (!isMounted) return;
        await checkAndApplyOtaUpdate();
      } catch (err) {
        console.warn('[Updates] Coordinated update check failed:', err);
      }
    };

    // Run startup check immediately
    void performUpdateCheck();

    // Re-check automatically whenever app resumes from background
    const resumeListenerPromise = App.addListener('resume', () => {
      void performUpdateCheck();
    });

    return () => {
      isMounted = false;
      unsubscribe();
      resumeListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  return {
    isUpdating,
    updateMessage,
  };
}
