import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { isNative } from '../native';

/**
 * Google AdMob integration for the freemium extraction ad.
 *
 * Mirrors the native-gated init pattern in `utils/purchase.ts`: every export is
 * a no-op off native (web), so callers don't need their own platform guards.
 *
 * The plugin cannot render "native advanced" ads, so we show a MEDIUM_RECTANGLE
 * (300×250) banner overlay and let the React `ExtractionAdCard` draw the styled
 * card frame around it. The banner is only ever shown during an active
 * extraction for free users, and removed the moment that screen unmounts.
 */

/** Google's public TEST banner ad unit (valid for all banner sizes incl. MREC). */
const TEST_BANNER_AD_ID = 'ca-app-pub-3940256099942544/6300978111';

const CONFIGURED_BANNER_AD_ID = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined;

/** Real ad unit if configured, otherwise Google's test unit. */
const BANNER_AD_ID = CONFIGURED_BANNER_AD_ID || TEST_BANNER_AD_ID;

/**
 * Serve test ads unless a real ad unit id is configured. Requesting live ads on
 * an unregistered/dev build is an AdMob policy violation, so we stay in test
 * mode until `VITE_ADMOB_BANNER_ID` is set for a production build.
 */
const IS_TESTING = !CONFIGURED_BANNER_AD_ID;

let initialized = false;
let initPromise: Promise<void> | null = null;
/** Whether an ad may be requested at all (false only if consent was declined). */
let canRequestAds = true;
/** Whether the user consented to personalized ads; otherwise we request npa. */
let personalizedAllowed = true;
/** Track whether a banner is currently on screen so we can reposition cleanly. */
let bannerShown = false;

/**
 * Initialize the AdMob SDK once and run the EU consent (UMP) flow. Idempotent
 * and concurrency-safe. Safe to call on web (no-op). `at.snagbite.app` targets
 * EEA users, so GDPR consent must be resolved before the first ad request.
 */
export async function initAds(): Promise<void> {
  if (!isNative()) return;
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await AdMob.initialize({ initializeForTesting: IS_TESTING });

      // EU consent / UMP. Failing open to non-personalized ads keeps the app
      // compliant even if the consent form can't be shown for any reason.
      try {
        const info = await AdMob.requestConsentInfo();
        let status = info.status;
        canRequestAds = info.canRequestAds ?? true;

        if (info.isConsentFormAvailable && status === AdmobConsentStatus.REQUIRED) {
          const after = await AdMob.showConsentForm();
          status = after.status;
          canRequestAds = after.canRequestAds ?? true;
        }

        personalizedAllowed =
          status === AdmobConsentStatus.OBTAINED ||
          status === AdmobConsentStatus.NOT_REQUIRED;
      } catch (consentErr) {
        console.warn('[AdMob] consent flow failed; using non-personalized ads:', consentErr);
        personalizedAllowed = false;
      }

      initialized = true;
    } catch (err) {
      console.error('[AdMob] initialize failed:', err);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Show the extraction MEDIUM_RECTANGLE banner anchored `marginTopPx` from the
 * top of the webview so it lines up with the `ExtractionAdCard` slot. Any
 * existing banner is removed first so this doubles as a reposition. No-op on web
 * or if the user declined consent.
 */
export async function showExtractionBanner(marginTopPx: number): Promise<void> {
  if (!isNative()) return;
  await initAds();
  if (!canRequestAds) return;

  // Remove any previous banner so repositioning (e.g. rotation) is clean.
  if (bannerShown) {
    try {
      await AdMob.removeBanner();
    } catch {
      /* nothing to remove */
    }
    bannerShown = false;
  }

  try {
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: BannerAdSize.MEDIUM_RECTANGLE,
      position: BannerAdPosition.TOP_CENTER,
      margin: Math.max(0, Math.round(marginTopPx)),
      isTesting: IS_TESTING,
      npa: !personalizedAllowed,
    });
    bannerShown = true;
  } catch (err) {
    console.warn('[AdMob] showBanner failed:', err);
  }
}

/** Destroy the extraction banner. Safe to call when none is shown / on web. */
export async function removeExtractionBanner(): Promise<void> {
  if (!isNative()) return;
  try {
    await AdMob.removeBanner();
  } catch {
    /* nothing to remove */
  }
  bannerShown = false;
}

/**
 * Subscribe to banner size changes (fired once the ad loads with its real
 * rendered size). Returns an unsubscribe function. No-op on web.
 */
export async function addBannerSizeListener(
  cb: (size: { width: number; height: number }) => void,
): Promise<() => void> {
  if (!isNative()) return () => {};
  const handle = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) =>
    cb({ width: size.width, height: size.height }),
  );
  return () => {
    handle.remove().catch(() => {});
  };
}
