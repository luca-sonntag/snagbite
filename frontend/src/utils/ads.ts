import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  RewardAdPluginEvents,
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

/** Google's public TEST rewarded video ad unit ID. */
const TEST_REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917';

const CONFIGURED_BANNER_AD_ID = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined;
const CONFIGURED_REWARDED_AD_ID = import.meta.env.VITE_ADMOB_REWARDED_ID as string | undefined;

/** Real ad unit if configured in environment, otherwise Google's test unit. */
const BANNER_AD_ID = CONFIGURED_BANNER_AD_ID || TEST_BANNER_AD_ID;
const REWARDED_AD_ID = CONFIGURED_REWARDED_AD_ID || TEST_REWARDED_AD_ID;

/**
 * Serve test ads unless a real ad unit id is configured in environment.
 * Requesting live ads on an unregistered/dev build is an AdMob policy violation,
 * so we stay in test mode until `VITE_ADMOB_BANNER_ID` is provided.
 */
const IS_TESTING = !CONFIGURED_BANNER_AD_ID;

let initialized = false;
let initPromise: Promise<void> | null = null;
/** Whether an ad may be requested at all (false only if consent was declined). */
let canRequestAds = true;
/** Whether the user consented to personalized ads; otherwise we request npa. */
let personalizedAllowed = true;
/** Track whether a banner is currently on screen. */
let bannerShown = false;

/**
 * After the banner has been continuously hidden this long, destroy it so the
 * next resume loads a *fresh* ad — yielding a new (viewable) impression instead
 * of resuming a stale creative. Short hides (quick overlays/sheets) resume
 * instantly as before; only long hides (e.g. a lengthy stay in settings) reload.
 */
const STALE_HIDE_MS = 60_000;
let staleHideTimer: ReturnType<typeof setTimeout> | null = null;
/** Set when the stale timer destroyed the banner; resume then reloads fresh. */
let bannerDestroyedWhileHidden = false;
/** Last placement passed to showAdBanner, reused to reload after stale-destroy. */
let lastBannerMargin = 0;
let lastBannerSize: BannerAdSize = BannerAdSize.MEDIUM_RECTANGLE;

function clearStaleHideTimer(): void {
  if (staleHideTimer) {
    clearTimeout(staleHideTimer);
    staleHideTimer = null;
  }
}

/** Check whether a banner is already active in memory. */
export function isAdLoaded(): boolean {
  return bannerShown;
}

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
 * Show the ad banner anchored to the bottom-centre of the screen and
 * align it with the React ad slot using a measured bottom margin.
 */
export async function showAdBanner(
  bottomMarginDp: number,
  size: BannerAdSize = BannerAdSize.MEDIUM_RECTANGLE,
): Promise<void> {
  if (!isNative()) return;
  await initAds();
  if (!canRequestAds) return;

  // Strict guard: Never re-call showBanner if a banner is already active in memory.
  if (bannerShown) return;

  const margin = Math.max(0, Math.round(bottomMarginDp));

  // Remember placement so a stale-destroyed banner can reload at the same spot.
  lastBannerMargin = margin;
  lastBannerSize = size;
  // A fresh show cancels any pending stale-destroy and clears the reload flag.
  clearStaleHideTimer();
  bannerDestroyedWhileHidden = false;

  try {
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: size,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin,
      isTesting: IS_TESTING,
      npa: !personalizedAllowed,
    });
    bannerShown = true;
    console.log(
      `[AdMob] showBanner requested (BOTTOM_CENTER, size=${size}, margin=${margin}, ` +
        `testing=${IS_TESTING}, npa=${!personalizedAllowed})`,
    );
  } catch (err) {
    console.warn('[AdMob] showBanner failed:', err);
  }
}

/** Track whether a banner is currently hidden via hideBanner. */
let isBannerCurrentlyHidden = false;

/** Destroy the ad banner. Safe to call when none is shown / on web. */
export async function removeAdBanner(): Promise<void> {
  if (!isNative()) return;
  clearStaleHideTimer();
  bannerDestroyedWhileHidden = false;
  if (!bannerShown && !isBannerCurrentlyHidden) return;
  try {
    await AdMob.removeBanner();
    console.log('[AdMob] removeBanner requested');
  } catch {
    /* nothing to remove */
  }
  bannerShown = false;
  isBannerCurrentlyHidden = false;
}

/** Temporarily hide the active banner without destroying it (e.g. while an overlay is open). */
export async function hideAdBanner(): Promise<void> {
  if (!isNative()) return;
  if (!bannerShown) return;
  if (isBannerCurrentlyHidden) return;
  isBannerCurrentlyHidden = true;

  // Arm the stale-destroy: if the banner stays hidden past STALE_HIDE_MS, tear
  // it down so the next resume reloads a fresh ad (new impression).
  clearStaleHideTimer();
  staleHideTimer = setTimeout(() => {
    staleHideTimer = null;
    console.log(`[AdMob] banner hidden >${STALE_HIDE_MS}ms — destroying for fresh impression`);
    void removeAdBanner().then(() => {
      bannerDestroyedWhileHidden = true;
    });
  }, STALE_HIDE_MS);

  try {
    await AdMob.hideBanner();
    console.log('[AdMob] hideBanner requested');
  } catch (err) {
    console.warn('[AdMob] hideBanner failed:', err);
  }
}

/** Resume/unhide the active banner after an overlay closes. */
export async function resumeAdBanner(): Promise<void> {
  if (!isNative()) return;
  clearStaleHideTimer();

  // Hidden long enough that the stale timer destroyed the banner — reload a
  // fresh ad at the last placement instead of resuming a gone/stale one.
  if (bannerDestroyedWhileHidden) {
    bannerDestroyedWhileHidden = false;
    await showAdBanner(lastBannerMargin, lastBannerSize);
    return;
  }

  if (!bannerShown || !isBannerCurrentlyHidden) return;
  isBannerCurrentlyHidden = false;
  try {
    await AdMob.resumeBanner();
    console.log('[AdMob] resumeBanner requested');
  } catch (err) {
    console.warn('[AdMob] resumeBanner failed:', err);
  }
}


/**
 * Subscribe to banner size changes (fired once the ad loads with its real
 * rendered size). Returns an unsubscribe function. No-op on web.
 */
export async function addBannerSizeListener(
  cb: (size: { width: number; height: number }) => void,
): Promise<() => void> {
  if (!isNative()) return () => {};
  const handle = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: { width: number; height: number }) =>
    cb({ width: size.width, height: size.height }),
  );
  return () => {
    handle.remove().catch(() => {});
  };
}

/**
 * Subscribe to banner load success/failure so the UI can reveal the card only
 * once a real ad is on screen (and stay hidden if none fills). Returns an
 * unsubscribe function. No-op on web.
 */
export async function addBannerLoadListener(
  onChange: (status: 'loaded' | 'failed') => void,
): Promise<() => void> {
  if (!isNative()) return () => {};
  const loaded = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
    console.log('[AdMob] banner loaded');
    onChange('loaded');
  });
  const failed = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err: unknown) => {
    console.warn('[AdMob] banner failed to load:', err);
    onChange('failed');
  });
  return () => {
    loaded.remove().catch(() => {});
    failed.remove().catch(() => {});
  };
}

/**
 * Show a Rewarded Video Ad.
 * Returns a promise that resolves to `true` if the user successfully completed
 * watching the video ad and earned the reward, or `false` if dismissed/failed/cancelled.
 *
 * In web / non-native environment, simulates a rewarded video delay (2s) and returns `true`
 * so the feature can be tested in browser development mode.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!isNative()) {
    console.log('[AdMob] Web dev mode: simulating rewarded video ad (2s)...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return true;
  }

  await initAds();
  if (!canRequestAds) {
    console.warn('[AdMob] cannot request ads (consent declined)');
    return false;
  }

  return new Promise<boolean>(async (resolve) => {
    let earned = false;
    let rewardedHandle: any = null;
    let dismissedHandle: any = null;
    let failedHandle: any = null;

    const cleanup = () => {
      rewardedHandle?.remove?.().catch(() => {});
      dismissedHandle?.remove?.().catch(() => {});
      failedHandle?.remove?.().catch(() => {});
    };

    const EVENT_REWARDED = typeof RewardAdPluginEvents !== 'undefined' ? RewardAdPluginEvents.Rewarded : 'onRewardedVideoAdReward';
    const EVENT_DISMISSED = typeof RewardAdPluginEvents !== 'undefined' ? RewardAdPluginEvents.Dismissed : 'onRewardedVideoAdDismissed';
    const EVENT_FAILED_TO_SHOW = typeof RewardAdPluginEvents !== 'undefined' ? RewardAdPluginEvents.FailedToShow : 'onRewardedVideoAdFailedToShow';

    try {
      rewardedHandle = await AdMob.addListener(EVENT_REWARDED as any, (reward: unknown) => {
        console.log('[AdMob] user earned reward:', reward);
        earned = true;
      });

      dismissedHandle = await AdMob.addListener(EVENT_DISMISSED as any, () => {
        console.log('[AdMob] rewarded ad dismissed. earned =', earned);
        cleanup();
        resolve(earned);
      });

      failedHandle = await AdMob.addListener(EVENT_FAILED_TO_SHOW as any, (err: unknown) => {
        console.warn('[AdMob] rewarded ad failed to show:', err);
        cleanup();
        resolve(false);
      });

      console.log('[AdMob] preparing rewarded video ad...');
      await AdMob.prepareRewardVideoAd({
        adId: REWARDED_AD_ID,
        isTesting: IS_TESTING,
        npa: !personalizedAllowed,
      });

      console.log('[AdMob] showing rewarded video ad...');
      await AdMob.showRewardVideoAd();
    } catch (err) {
      console.error('[AdMob] error during rewarded ad flow:', err);
      cleanup();
      resolve(false);
    }
  });
}
