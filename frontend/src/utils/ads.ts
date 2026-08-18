import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  RewardAdPluginEvents,
  InterstitialAdPluginEvents,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { isNative } from '../native';
import { APP_OPEN_MIN_INTERVAL_MS } from '../env';

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

/** Google's public TEST interstitial ad unit ID (used for the app-open ad). */
const TEST_INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712';

const CONFIGURED_BANNER_AD_ID = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined;
const CONFIGURED_REWARDED_AD_ID = import.meta.env.VITE_ADMOB_REWARDED_ID as string | undefined;
const CONFIGURED_INTERSTITIAL_AD_ID = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID as string | undefined;

/**
 * Comma-separated AdMob test-device IDs (from the "Use setTestDeviceIds(...)"
 * logcat line on first ad load). Registering a device makes AdMob serve *test*
 * ads to it even with the real ad unit IDs configured — so you can verify the
 * production config/consent/fill and safely tap ads without risking the account.
 * Leave unset in production.
 */
const CONFIGURED_TEST_DEVICES = (import.meta.env.VITE_ADMOB_TEST_DEVICES as string | undefined)
  ?.split(',')
  .map((id) => id.trim())
  .filter(Boolean) ?? [];

/** Real ad unit if configured in environment, otherwise Google's test unit. */
const BANNER_AD_ID = CONFIGURED_BANNER_AD_ID || TEST_BANNER_AD_ID;
const REWARDED_AD_ID = CONFIGURED_REWARDED_AD_ID || TEST_REWARDED_AD_ID;
const INTERSTITIAL_AD_ID = CONFIGURED_INTERSTITIAL_AD_ID || TEST_INTERSTITIAL_AD_ID;

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

/**
 * Delay before the banner actually reappears on resume. The bottom bar (and the
 * longer bulk-select action bar) slides back in with a CSS transition; showing
 * the banner earlier makes it pop in before the bar has settled. Sized to cover
 * the longest slide-in so the ad reveals cleanly once the bar is in place.
 * Hiding stays instant.
 */
export const RESUME_DELAY_MS = 500;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;

function clearResumeTimer(): void {
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
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
      await AdMob.initialize({
        initializeForTesting: IS_TESTING,
        // Real ad IDs but registered test devices → SDK serves safe test ads.
        ...(CONFIGURED_TEST_DEVICES.length > 0 && { testingDevices: CONFIGURED_TEST_DEVICES }),
      });

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

  // If a banner is already in memory (shown or hidden): keep it when it matches
  // the requested size, but replace it on a size change. A size change means a
  // slot handoff (bottom-bar BANNER ↔ extraction-form MREC) and only one native
  // banner can exist — so tear the old one down and load the new size fresh.
  if (bannerShown || isBannerCurrentlyHidden) {
    if (size === lastBannerSize) return;
    await removeAdBanner();
  }

  const margin = Math.max(0, Math.round(bottomMarginDp));

  // Remember placement so a stale-destroyed banner can reload at the same spot.
  lastBannerMargin = margin;
  lastBannerSize = size;
  // A fresh show cancels any pending stale-destroy/resume and clears the flag.
  clearStaleHideTimer();
  clearResumeTimer();
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
  clearResumeTimer();
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
  // Cancel any pending (delayed) resume so re-hiding wins immediately.
  clearResumeTimer();
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

/**
 * Resume/unhide the active banner after an overlay closes. Deferred by
 * RESUME_DELAY_MS so the banner reveals only once the bottom bar's slide-up
 * transition has settled (avoids the ad popping in mid-animation). A re-hide
 * during the delay cancels the pending resume.
 */
export async function resumeAdBanner(): Promise<void> {
  if (!isNative()) return;
  clearStaleHideTimer();
  clearResumeTimer();
  resumeTimer = setTimeout(() => {
    resumeTimer = null;
    void doResumeAdBanner();
  }, RESUME_DELAY_MS);
}

/** Perform the actual resume/reload once the resume delay elapses. */
async function doResumeAdBanner(): Promise<void> {
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

/* -------------------------------------------------------------------------- */
/* App-Open Ad (full-screen interstitial shown on app launch)                 */
/* -------------------------------------------------------------------------- */

/**
 * The @capacitor-community/admob v8 plugin has no dedicated App-Open format, so
 * the "fullscreen banner after launch" is implemented as an INTERSTITIAL shown
 * once the app is ready. It stays unobtrusive for free users via three guards:
 *   1. First-launch exclusion — never shown on the very first app session.
 *   2. Open cadence — shown on every APP_OPEN_SHOW_EVERY_N_OPENS-th eligible
 *      open. An "open" is a cold start or a resume after a long background; the
 *      caller decides which resumes qualify (see APP_OPEN_RESUME_MIN_BG in
 *      App.tsx) before invoking this. Both trigger types share one counter.
 *   3. Time floor — never two app-open ads within APP_OPEN_MIN_INTERVAL_MS, so
 *      the cadence can't stack two ads close together.
 * All three are persisted in localStorage so they survive across cold starts.
 */

/** Show the app-open ad on every Nth eligible open (cold start or qualifying resume). */
const APP_OPEN_SHOW_EVERY_N_OPENS = 3;
// The time floor (min gap between two app-open ads) lives in ../env as
// APP_OPEN_MIN_INTERVAL_MS so it can be overridden for testing. Default 4h.
/** Running count of eligible opens since the last shown app-open ad. */
const APP_OPEN_OPEN_COUNT_KEY = 'snagbite:appOpenAd:openCount';
/** Timestamp (ms) of the last app-open ad attempt; drives the time floor. */
const APP_OPEN_LAST_SHOWN_KEY = 'snagbite:appOpenAd:lastShownAt';
/** Set the first time an app-open ad would be eligible; that first time is skipped. */
const APP_OPEN_FIRST_LAUNCH_KEY = 'snagbite:appOpenAd:firstLaunchSeen';

/**
 * Show the app-open ad only when we have a real interstitial unit configured,
 * or when running test builds (test unit serves safe test ads). In a production
 * build without VITE_ADMOB_INTERSTITIAL_ID we skip entirely rather than serving
 * Google's test interstitial to real users.
 */
const APP_OPEN_ENABLED = IS_TESTING || !!CONFIGURED_INTERSTITIAL_AD_ID;

/** Guards against overlapping interstitial requests. */
let appOpenInFlight = false;

/* -------------------------------------------------------------------------- */
/* Interstitial preloading                                                    */
/* -------------------------------------------------------------------------- */
/* The plugin fetches an interstitial only when `prepareInterstitial` is       */
/* called, and that fill request is a network round-trip (1–3s). Doing it      */
/* inline at show-time makes the ad appear seconds after the trigger. Instead   */
/* we let callers preload it ahead of the trigger, so `showInterstitial` fires  */
/* on an already-loaded ad. Google interstitials expire ~1h after load, so a    */
/* preloaded ad is treated as stale before that and re-fetched.                 */

let interstitialReady = false;
let interstitialPreparing: Promise<void> | null = null;
let interstitialPreparedAt = 0;
/** Refresh a preloaded interstitial a little before Google's ~1h expiry. */
const INTERSTITIAL_TTL_MS = 55 * 60 * 1000;

function interstitialFresh(): boolean {
  return interstitialReady && Date.now() - interstitialPreparedAt < INTERSTITIAL_TTL_MS;
}

/**
 * Prepare (fetch) an app-open interstitial ahead of time so a later
 * `maybeShowAppOpenAd()` can show it instantly instead of waiting on a fill
 * request. Idempotent and concurrency-safe: a no-op if a fresh ad is already
 * loaded or a prepare is already in flight. No-op on web / when the app-open ad
 * is disabled / when consent was declined. Callers should preload only when a
 * show is actually imminent (see `appOpenAdWouldShow`) to avoid burning fill
 * requests on opens that won't display an ad.
 */
export async function preloadAppOpenAd(): Promise<void> {
  if (!isNative()) return;
  if (!APP_OPEN_ENABLED) return;
  if (interstitialFresh()) return;
  if (interstitialPreparing) return interstitialPreparing;

  // Assign the promise synchronously so a second caller can't double-prepare.
  interstitialPreparing = (async () => {
    try {
      await initAds();
      if (!canRequestAds) return;
      console.log('[AdMob] preloading app-open interstitial...');
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_AD_ID,
        isTesting: IS_TESTING,
        npa: !personalizedAllowed,
      });
      interstitialReady = true;
      interstitialPreparedAt = Date.now();
    } catch (err) {
      console.warn('[AdMob] interstitial preload failed:', err);
      interstitialReady = false;
    } finally {
      interstitialPreparing = null;
    }
  })();
  return interstitialPreparing;
}

/**
 * Read-only check of whether the NEXT `maybeShowAppOpenAd()` would actually show
 * an ad: first-launch already passed, the shared open-counter is about to reach
 * N, and the time floor is clear. Does NOT mutate the counter — it mirrors the
 * gating in `maybeShowAppOpenAd` so callers can preload only when a show is
 * imminent. Keep the two in sync.
 */
export function appOpenAdWouldShow(): boolean {
  if (!isNative() || !APP_OPEN_ENABLED) return false;
  try {
    if (!localStorage.getItem(APP_OPEN_FIRST_LAUNCH_KEY)) return false;
    const count = Number(localStorage.getItem(APP_OPEN_OPEN_COUNT_KEY) || 0) + 1;
    const last = Number(localStorage.getItem(APP_OPEN_LAST_SHOWN_KEY) || 0);
    const intervalPassed = !last || Date.now() - last >= APP_OPEN_MIN_INTERVAL_MS;
    return count >= APP_OPEN_SHOW_EVERY_N_OPENS && intervalPassed;
  } catch {
    return false;
  }
}

/**
 * Show a full-screen interstitial "app-open" ad for free users, respecting the
 * first-launch exclusion and the frequency cap. No-op on web, when consent was
 * declined, or when an interstitial is already in flight. The caller is
 * responsible for the user-level gating (free tier, no onboarding, no running
 * extraction) — this function only enforces the ad-level policy.
 *
 * Resolves `true` if an ad was shown and dismissed, `false` otherwise.
 */
export async function maybeShowAppOpenAd(): Promise<boolean> {
  if (!isNative()) return false;
  if (!APP_OPEN_ENABLED) return false;
  if (appOpenInFlight) return false;

  // Never show a full-screen interstitial while a banner is live (shown or kept
  // hidden in memory). During an extraction the MREC banner is on screen and is
  // torn down the moment it finishes — showing an interstitial into that
  // banner-teardown + activity transition crashes the app. If any banner is
  // active, skip the app-open ad entirely.
  if (bannerShown || isBannerCurrentlyHidden) return false;

  await initAds();
  if (!canRequestAds) return false;

  // First-launch exclusion: the first time we'd ever be eligible, record it and
  // skip — so a brand-new user is never greeted by a full-screen ad.
  try {
    if (!localStorage.getItem(APP_OPEN_FIRST_LAUNCH_KEY)) {
      localStorage.setItem(APP_OPEN_FIRST_LAUNCH_KEY, String(Date.now()));
      return false;
    }
    // Unified cadence + time floor. Count every eligible open (cold start or a
    // qualifying resume the caller let through) and show only once we've reached
    // the Nth open AND enough time has passed since the last ad. Counting
    // up-front means no-fills still advance the cadence and a rapid relaunch is
    // counted rather than firing another ad.
    const count = Number(localStorage.getItem(APP_OPEN_OPEN_COUNT_KEY) || 0) + 1;
    const last = Number(localStorage.getItem(APP_OPEN_LAST_SHOWN_KEY) || 0);
    const intervalPassed = !last || Date.now() - last >= APP_OPEN_MIN_INTERVAL_MS;
    if (count < APP_OPEN_SHOW_EVERY_N_OPENS || !intervalPassed) {
      // Not yet — keep the counter armed (it stays >= N while the floor blocks).
      localStorage.setItem(APP_OPEN_OPEN_COUNT_KEY, String(count));
      return false;
    }
    // Nth open reached and the time floor is clear — reset the counter and stamp
    // the attempt time up-front (so the floor covers no-fills too), then show.
    localStorage.setItem(APP_OPEN_OPEN_COUNT_KEY, '0');
    localStorage.setItem(APP_OPEN_LAST_SHOWN_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — fail closed (don't risk an uncapped ad).
    return false;
  }

  appOpenInFlight = true;

  return new Promise<boolean>(async (resolve) => {
    let settled = false;
    let dismissedHandle: any = null;
    let failedHandle: any = null;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      dismissedHandle?.remove?.().catch(() => {});
      failedHandle?.remove?.().catch(() => {});
      appOpenInFlight = false;
      resolve(result);
    };

    try {
      dismissedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('[AdMob] app-open interstitial dismissed');
        finish(true);
      });
      failedHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (err: unknown) => {
        console.warn('[AdMob] app-open interstitial failed to show:', err);
        finish(false);
      });

      // Prefer a preloaded ad (instant show). If a preload is still in flight,
      // wait for it; if none is loaded/fresh, prepare inline as a fallback.
      if (interstitialPreparing) await interstitialPreparing;
      if (!interstitialFresh()) {
        console.log('[AdMob] preparing app-open interstitial (no warm preload)...');
        await AdMob.prepareInterstitial({
          adId: INTERSTITIAL_AD_ID,
          isTesting: IS_TESTING,
          npa: !personalizedAllowed,
        });
        interstitialPreparedAt = Date.now();
      }
      interstitialReady = false; // consume — a shown interstitial can't be reused

      console.log('[AdMob] showing app-open interstitial...');
      await AdMob.showInterstitial();
    } catch (err) {
      // Includes the no-fill / failed-to-load case (prepareInterstitial rejects).
      console.warn('[AdMob] app-open interstitial flow failed:', err);
      finish(false);
    }
  });
}
