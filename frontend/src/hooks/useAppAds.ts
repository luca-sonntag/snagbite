import { useEffect, useRef, useState } from 'react';
import { APP_OPEN_RESUME_MIN_BG_MS } from '../env';
import { registerAppStateListener, clearRecipeReadyNotification } from '../native';
import {
  hasCompletedFirstExtraction,
  markFirstExtractionCompleted,
  hasSeenPreAdNotice,
  triggerPreAdNotice,
} from '../utils/ads';
import type { UseAppAdsProps } from '../types/app';

export function useAppAds({
  user,
  authLoading,
  isPremium,
  isPending,
  progress,
  recipe,
  showOnboarding,
  savedRecipesCount = 0,
  historyLoaded = false,
  onShowPreAdNotice,
}: UseAppAdsProps) {
  const [showExtractionAd, setShowExtractionAd] = useState(false);
  const wasPendingRef = useRef(false);
  const isPendingRef = useRef(isPending);
  isPendingRef.current = isPending;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isGraceExtractionRef = useRef(false);
  const appOpenAttemptedRef = useRef(false);
  const appBackgroundedAtRef = useRef<number | null>(null);
  const appOpenBlockedRef = useRef(true);
  appOpenBlockedRef.current = isPremium || isPending || !!recipe || showOnboarding;

  // Mark first-extraction grace period as used for existing users who already have saved recipes
  useEffect(() => {
    if (historyLoaded && savedRecipesCount > 0 && !isPending) {
      markFirstExtractionCompleted();
    }
  }, [historyLoaded, savedRecipesCount, isPending]);

  // Two-stage extraction ad sequence:
  // 1. Fullscreen Interstitial shown at the start of extraction.
  // 2. Seamless handoff to MREC Banner (ExtractionAdSheet) for the remaining extraction time.
  const runExtractionAdFlow = async () => {
    try {
      const { maybeShowExtractionInterstitialAd } = await import('../utils/ads');
      await maybeShowExtractionInterstitialAd();
    } catch (err) {
      console.warn('[useAppAds] extraction interstitial error:', err);
    }

    if (isPendingRef.current && !isGraceExtractionRef.current) {
      const currentProgress = progressRef.current;
      const isAlmostDone =
        currentProgress?.stage === 'finalizing' || (currentProgress?.percent ?? 0) >= 95;
      if (!isAlmostDone) {
        setShowExtractionAd(true);
      }
    }
  };

  // Gate foreground extraction ads:
  // 1st ever extraction -> 100% ad-free & consent-free grace period (Wow-Moment first)
  // 2nd+ extraction -> PreAdTransparencySheet priming (if not seen) -> Interstitial -> MREC Ad
  useEffect(() => {
    if (!isPending || isPremium) {
      if (wasPendingRef.current && !isPending) {
        markFirstExtractionCompleted();
        isGraceExtractionRef.current = false;
      }
      wasPendingRef.current = isPending;
      setShowExtractionAd(false);
      return;
    }

    if (!wasPendingRef.current) {
      wasPendingRef.current = true;
      const alreadyCompletedFirst = hasCompletedFirstExtraction() || savedRecipesCount > 0;

      if (!alreadyCompletedFirst) {
        isGraceExtractionRef.current = true;
        setShowExtractionAd(false);
        return;
      }

      isGraceExtractionRef.current = false;
    }

    if (isGraceExtractionRef.current) {
      setShowExtractionAd(false);
      return;
    }

    if (!hasSeenPreAdNotice()) {
      setShowExtractionAd(false);
      const proceedWithExtractionAd = () => {
        if (wasPendingRef.current && !isGraceExtractionRef.current) {
          void runExtractionAdFlow();
        }
      };
      if (onShowPreAdNotice) onShowPreAdNotice(proceedWithExtractionAd);
      else triggerPreAdNotice(proceedWithExtractionAd);
      return;
    }

    void runExtractionAdFlow();
  }, [isPending, isPremium, savedRecipesCount, onShowPreAdNotice]);

  const executeAppOpenFlow = () => {
    if (appOpenBlockedRef.current) return;

    import('../utils/ads')
      .then(({ maybeShowAppOpenAd, appOpenAdWouldShow }) => {
        if (appOpenBlockedRef.current) return;

        // Free-tier gating: If user hasn't seen the pre-ad transparency notice yet,
        // show the notice before ever initializing AdMob / showing an app-open ad.
        if (!isPremium && !hasSeenPreAdNotice()) {
          if (appOpenAdWouldShow()) {
            const proceedWithAd = () => {
              if (appOpenBlockedRef.current) return;
              maybeShowAppOpenAd().catch((err) => console.error('Failed to show app-open ad after notice:', err));
            };

            if (onShowPreAdNotice) {
              onShowPreAdNotice(proceedWithAd);
            } else {
              triggerPreAdNotice(proceedWithAd);
            }
            return;
          }
        }

        maybeShowAppOpenAd().catch((err) => console.error('Failed to load ads module:', err));
      })
      .catch((err) => console.error('Failed to load ads module:', err));
  };

  // Initialize RevenueCat billing once user is resolved.
  // AdMob initialization (+ EU UMP consent) is intentionally deferred until the first ad is due.
  useEffect(() => {
    if (authLoading || !user) return;

    import('../utils/purchase')
      .then(({ initBilling }) => {
        initBilling(user.id);
      })
      .catch((err) => console.error('Failed to load billing module:', err));
  }, [authLoading, user]);

  // App-Open ad: a full-screen interstitial shown ONCE on a neutral cold start
  useEffect(() => {
    if (authLoading || !user || showOnboarding) return;
    if (appOpenAttemptedRef.current) return;
    appOpenAttemptedRef.current = true;
    if (appOpenBlockedRef.current) return;

    import('../utils/ads')
      .then(({ appOpenAdWouldShow, preloadAppOpenAd }) => {
        // Only preload upfront if the user has already confirmed the pre-ad notice,
        // so preloading never triggers UMP consent before our priming sheet.
        if (appOpenAdWouldShow() && hasSeenPreAdNotice()) {
          preloadAppOpenAd();
        }
      })
      .catch(() => {});

    const id = setTimeout(() => {
      executeAppOpenFlow();
    }, 1200);

    return () => clearTimeout(id);
  }, [authLoading, user, showOnboarding, isPremium]);

  // App-Open ad on RESUME
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = registerAppStateListener((isActive) => {
      if (!isActive) {
        appBackgroundedAtRef.current = Date.now();
        return;
      }
      clearRecipeReadyNotification();
      const bgAt = appBackgroundedAtRef.current;
      appBackgroundedAtRef.current = null;
      if (bgAt == null || Date.now() - bgAt < APP_OPEN_RESUME_MIN_BG_MS) return;
      if (appOpenBlockedRef.current) return;

      import('../utils/ads')
        .then(({ appOpenAdWouldShow, preloadAppOpenAd }) => {
          if (appOpenAdWouldShow() && hasSeenPreAdNotice()) {
            preloadAppOpenAd();
          }
        })
        .catch(() => {});

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        executeAppOpenFlow();
      }, 1200);
    });

    return () => {
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [isPremium]);

  return { showExtractionAd };
}
