import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'at.snagbite.app',
  appName: 'Snagbite',
  // Vite's build output directory — Capacitor copies this into the native app.
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      // Self-hosted manual mode: src/utils/otaUpdater.ts checks our backend,
      // downloads from S3 Storage and stages bundles itself.
      autoUpdate: false,
      // Wipe device OTA bundles whenever a native (Play Store) update installs,
      // so a fresh shell never boots stale web assets.
      resetWhenUpdate: true,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      // A staged bundle that doesn't call notifyAppReady() within 10s is
      // rolled back and deleted (anti-brick safety net).
      appReadyTimeout: 10000,
    },
    SplashScreen: {
      // Match the app's brand color (#064e3b). We hide the splash manually from
      // JS once React has mounted, so keep autoHide off.
      launchAutoHide: false,
      backgroundColor: '#064e3b',
      androidSplashResourceName: 'splash',
      showSpinner: true,
    },
  },
};

export default config;
