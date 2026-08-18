import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Sparkles, BookOpen, ShoppingCart, User, Trophy } from 'lucide-react';

import type { Job } from './types';
import { apiUrl } from './api';
import { registerShareIntent, registerNotificationTap, hideSplashScreen, registerBackButtonHandler, registerAppUrlOpen, registerAppStateListener } from './native';
import { APP_OPEN_RESUME_MIN_BG_MS } from './env';
import { registerPushTapHandler, enablePushNotifications } from './push';
import { parseSharedUrl } from './utils/shareUrl';
import ExtractForm, { type ExtractMode } from './components/ExtractForm';
import ActiveExtractions from './components/ActiveExtractions';
import ExtractionAnimation from './components/ExtractionAnimation';
import ErrorBanner from './components/ErrorBanner';
import { isCatalogListRoute } from './components/SavedCatalog/catalogRoutes';
import AuthForm from './components/AuthForm';
import TimerBanner from './components/TimerBanner';
import OtaUpdateBanner from './components/OtaUpdateBanner';
import TrialBanner from './components/TrialBanner';
import NotificationPrompt from './components/NotificationPrompt';

// Heavy views are code-split so they aren't parsed on cold start — the initial
// bundle only needs the default extract tab. Each mounts on first visit (then
// stays mounted to preserve its state) via the `visitedViews` gate below.
const RecipeDetails = lazy(() => import('./components/RecipeDetails'));
const SavedCatalog = lazy(() => import('./components/SavedCatalog/index'));
const ShoppingList = lazy(() => import('./components/ShoppingList'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const ProgressView = lazy(() => import('./components/ProgressView'));
const PremiumModal = lazy(() => import('./components/PremiumModal'));
const WelcomeGuide = lazy(() => import('./components/WelcomeGuide'));
const AlphaWelcome = lazy(() => import('./components/AlphaWelcome'));

import { useRecipeExtraction } from './hooks/useRecipeExtraction';
import { useShoppingList } from './hooks/useShoppingList';
import { useDialog } from './context/DialogContext';
import { useI18n } from './context/I18nContext';
import { useAuth } from './context/AuthContext';
import { useSocial } from './context/SocialContext';
import { useGamification } from './context/GamificationContext';
import { useHashRouter } from './hooks/useHashRouter';
import { EXTRACTION_COMPLETE_EVENT, OPEN_RECIPE_EVENT, useExtractionJobs } from './context/ExtractionJobsContext';
import { useMobileNavigationBack } from './hooks/useMobileNavigationBack';
import { deleteCachedImage } from './utils/imageStore';
import { useTimerManager } from './hooks/useTimerManager';
import { useOnboarding } from './hooks/useOnboarding';
import { useAlphaWelcome } from './hooks/useAlphaWelcome';

// Module-level flag to ensure the Web Share Target is only processed once per page load.
// This prevents re-triggering the interceptor when the user's auth state or metadata updates.
let isWebShareProcessed = false;

/** Lightweight fallback while a lazily-loaded view chunk resolves (first visit only). */
function ViewFallback() {
  return (
    <div className="w-full flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  const dialog = useDialog();
  const { t } = useI18n();
  const { user, isPremium, loading: authLoading, getAccessToken } = useAuth();
  const { snapshot: gamificationSnapshot } = useGamification();
  const { incomingRequests } = useSocial();
  const userLevel = gamificationSnapshot?.stats?.level ?? null;
  const incomingRequestsCount = incomingRequests.length;

  // ── URL-based routing ────────────────────────────────────────────────────
  const { tab: activeView, subPath, navigate, replace } = useHashRouter();

  // Invite deep link (#/invite/<code>): capture the code, then redirect to the
  // friends section of the progress tab (the 'invite' tab has no view of its own).
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  useEffect(() => {
    if (activeView === 'invite') {
      if (subPath) setPendingInviteCode(subPath.toUpperCase());
      navigate('progress');
    }
  }, [activeView, subPath, navigate]);

  // History & multi-view states
  const [history, setHistory] = useState<Job[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [isCatalogSelectMode, setIsCatalogSelectMode] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const { pendingNavigation, dismissAllFinished } = useTimerManager();

  // Track which tabs have been opened at least once. The heavy tab views are
  // code-split and only mounted after their first visit (then kept mounted to
  // preserve state), so their chunks stay out of the cold-start path.
  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => new Set([activeView]));
  useEffect(() => {
    setVisitedViews(prev => (prev.has(activeView) ? prev : new Set(prev).add(activeView)));
  }, [activeView]);

  // Mount the (lazy) premium modal only once it's first opened, then keep it
  // mounted so its close transition still runs.
  const [premiumModalLoaded, setPremiumModalLoaded] = useState(false);
  useEffect(() => {
    if (isPremiumModalOpen) setPremiumModalLoaded(true);
  }, [isPremiumModalOpen]);

  // First-launch onboarding gate (also re-openable from Settings)
  const {
    shouldShow: showOnboarding,
    complete: completeOnboarding,
    replay: replayOnboarding,
  } = useOnboarding();

  // Alpha tester welcome — shown once after first login (post-auth gate).
  const {
    shouldShow: showAlphaWelcome,
    complete: completeAlphaWelcome,
  } = useAlphaWelcome();

  // The catalog's sub-path carries two things: a recipe id (detail view) or a
  // `list...` route (level 2 of the cookbook). See SavedCatalog/catalogRoutes.
  const isCatalogList = activeView === 'history' && isCatalogListRoute(subPath);

  // Derived: which saved job is currently open (from URL sub-path)
  const selectedJob: Job | null =
    activeView === 'history' && subPath && !isCatalogListRoute(subPath) && historyLoaded
      ? (history.find(j => j.id === subPath) ?? null)
      : null;

  // Remembers the catalog level a recipe was opened from, so closing the detail
  // view returns there: the list route it came from, or `null` for the cookbook
  // home. Only updated while no recipe is open, so the value survives the
  // detail view itself.
  const catalogReturnRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeView !== 'history' || selectedJob) return;
    catalogReturnRef.current = isCatalogList ? subPath : null;
  }, [activeView, selectedJob, isCatalogList, subPath]);

  // Setter for selected job — navigates via URL
  const setSelectedJob = useCallback((job: Job | null) => {
    if (job) {
      navigate('history', job.id);
    } else {
      navigate('history', catalogReturnRef.current);
    }
  }, [navigate]);

  const navigateCatalog = useCallback((catalogSubPath?: string | null) => {
    navigate('history', catalogSubPath ?? null);
  }, [navigate]);

  // Custom Hooks for Recipe Extraction and Shopping List
  const {
    aggregatedList,
    activeRecipes,
    removeRecipeFromList,
    addRecipeIngredients,
    addCustomItem,
    toggleItemIds,
    deleteItemIds,
    toggleItemGroup,
    deleteItemGroup,
    clearAll,
    clearChecked
  } = useShoppingList();

  // Tracks the jobId of a just-completed extraction so the history validity
  // effect doesn't clear its subPath before the history state catches up.
  const newlyExtractedJobIdRef = useRef<string | null>(null);
  const [isCatalogSheetOpen, setIsCatalogSheetOpen] = useState(false);

  // Remembers the last open state of the history tab (recipe detail or list),
  // so the bottom-nav "Recipes" button returns to the recipe that was open
  // when the user switched to another tab (e.g. the shopping list) instead of
  // always landing on the full recipe list.
  const lastHistorySubPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeView === 'history') {
      lastHistorySubPathRef.current = subPath;
    }
  }, [activeView, subPath]);

  // Tracks auth transitions so we can land on the catalog after an interactive
  // login without hijacking cold-start deep links (notification taps, shared
  // recipe URLs). `authSettledRef` guards the very first settled auth state.
  const authSettledRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // The sticky top region (safe-area filler + timer banner) grows and shrinks
  // at runtime, so views that want to pin something *below* it can't hardcode a
  // `top` offset. We measure the real element and publish its height as the
  // global `--app-sticky-top` variable (see index.css for the fallback).
  // A callback ref (instead of useRef) re-runs the effect once the element
  // actually mounts, which matters because the auth gate returns early.
  const [stickyTopEl, setStickyTopEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    if (!stickyTopEl) {
      root.style.removeProperty('--app-sticky-top');
      return;
    }
    const publish = () => {
      root.style.setProperty('--app-sticky-top', `${stickyTopEl.offsetHeight}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(stickyTopEl);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--app-sticky-top');
    };
  }, [stickyTopEl]);

  // Fetch recipe extraction history (using JWT).
  // Bounded with a timeout: on a cold app start the access token may be
  // expired, so getAccessToken() can trigger a network refresh before the
  // request even goes out. Without a cap, a stalled connection at launch
  // left the catalog spinning forever instead of failing visibly.
  const fetchHistory = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(apiUrl('/api/jobs'), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistory(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      clearTimeout(timeout);
      setHistoryLoaded(true);
    }
  }, [getAccessToken]);

  const handleExtractionSuccess = useCallback((jobId: string) => {
    newlyExtractedJobIdRef.current = jobId;
    navigate('history', jobId);
    fetchHistory();
  }, [fetchHistory, navigate]);

  const {
    isPending,
    jobStatus,
    jobError,
    jobErrorCode,
    jobErrorParams,
    recipe,
    setRecipe,
    progress,
    url,
    setUrl,
    urlError,
    setUrlError,
    validateUrl,
    triggerExtraction,
    photos,
    setPhotos,
    isUploadingPhotos,
    triggerPhotoExtraction,
    limitStatus,
    fetchLimitStatus,
    claimRewardedCredit
  } = useRecipeExtraction(getAccessToken, handleExtractionSuccess);

  // Which input channel the Extract tab is showing (shared link vs. own photos).
  const [extractMode, setExtractMode] = useState<ExtractMode>('link');

  // Background extractions (premium multi-job flow). While at least one is
  // running the Extract tab hides the form and shows the big ExtractionAnimation
  // for the most recently started job, with the per-job boxes below it.
  const { jobs: extractionJobs } = useExtractionJobs();
  const runningExtractions = extractionJobs.filter(j => j.status !== 'completed' && j.status !== 'failed');
  const latestRunning = runningExtractions.length ? runningExtractions[runningExtractions.length - 1] : null;

  const isViewingRecipe = !!selectedJob || (activeView === 'extract' && !!recipe);

  // Mobile back button & swipe gestures for newly extracted recipe details
  useMobileNavigationBack(activeView === 'extract' && !!recipe, () => {
    setRecipe(null);
    setUrl('');
    navigate('extract');
  });

  // Android hardware back-button & edge swipe-back gesture (Capacitor native).
  // Without this listener, Capacitor exits the app instead of navigating back.
  // Priority order:
  //   1. history + selectedJob open → go back to recipe list
  //   2. extract + recipe shown   → go back to extract form
  //   3. any non-root tab         → go to history (root tab)
  //   4. root (history, no job)   → return false → Capacitor calls exitApp()
  useEffect(() => {
    return registerBackButtonHandler(() => {
      // If a fullscreen image gallery is open, let the popstate handler close it
      if (window.history.state && window.history.state.galleryOpen) {
        window.history.back();
        return true;
      }
      if (activeView === 'history' && selectedJob) {
        // Back out of a recipe into the list it was opened from (or the home).
        navigate('history', catalogReturnRef.current);
        return true;
      }
      if (isCatalogList) {
        navigate('history');
        return true;
      }
      if (activeView === 'extract' && recipe) {
        setRecipe(null);
        setUrl('');
        navigate('extract');
        return true;
      }
      if (activeView !== 'history') {
        navigate('history');
        return true;
      }
      // Already at root — let Capacitor exit the app.
      return false;
    });
    // Note: activeView, selectedJob and recipe are intentionally in the dep array
    // so the handler always closes over the latest state.
  }, [activeView, selectedJob, isCatalogList, recipe, navigate, setRecipe, setUrl]);

  // Fetch history on load. Waits for AuthContext's own initial getSession()
  // to settle first (authLoading) instead of firing immediately on mount —
  // otherwise this call and AuthContext's race to refresh the access token
  // concurrently on a cold start, doubling up on network work exactly when
  // connectivity is least reliable. If there's no user, skip the request
  // entirely rather than letting fetchHistory resolve a null token.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHistoryLoaded(true);
      return;
    }
    fetchHistory();

    // Initialize RevenueCat billing for the logged-in user
    import('./utils/purchase').then(({ initBilling }) => {
      initBilling(user.id);
    }).catch(err => console.error('Failed to load billing module:', err));

    // Initialize AdMob (+ EU consent) once so the extraction ad can render for
    // free users. No-op on web and idempotent across re-runs.
    import('./utils/ads').then(({ initAds }) => {
      initAds();
    }).catch(err => console.error('Failed to load ads module:', err));
  }, [authLoading, user, fetchHistory]);

  // App-Open ad: a full-screen interstitial shown ONCE on a neutral cold start
  // for free users, a short beat after the app is ready so it never covers the
  // splash/first paint. `maybeShowAppOpenAd` enforces the first-launch exclusion
  // + frequency cap and additionally bails if any banner is live (no-op on web).
  //
  // The one-shot is *consumed* the first time the app is ready (past onboarding),
  // regardless of what's on screen. This is deliberate: the primary flow is
  // sharing a reel, which cold-starts the app straight into an extraction. We
  // must never let the interstitial fire when that extraction finishes — showing
  // it into the MREC banner teardown + recipe-view transition crashes the app.
  // So if we didn't land on a neutral screen, we skip the ad for this session
  // entirely instead of deferring it.
  const appOpenAttemptedRef = useRef(false);
  // Timestamp (ms) of the last time the app went to the background; used to tell
  // a real "new session" resume from a brief app-switch (see resume effect).
  const appBackgroundedAtRef = useRef<number | null>(null);
  // Always-fresh snapshot of the gates, re-checked when the deferred timer fires
  // (an extraction/recipe may have started during the 1.2s delay).
  const appOpenBlockedRef = useRef(true);
  appOpenBlockedRef.current = isPremium || isPending || !!recipe || showOnboarding;
  useEffect(() => {
    if (authLoading || !user) return;
    if (showOnboarding) return; // first-launch guide up (ad is excluded on 1st launch anyway)
    if (appOpenAttemptedRef.current) return;
    appOpenAttemptedRef.current = true; // consume the single per-session chance now
    if (appOpenBlockedRef.current) return; // didn't cold-start on a neutral screen → skip

    // Warm up the interstitial now (only if this open will actually show one),
    // so the 1.2s beat below overlaps the fill request and the ad shows instantly.
    import('./utils/ads')
      .then(({ appOpenAdWouldShow, preloadAppOpenAd }) => {
        if (appOpenAdWouldShow()) preloadAppOpenAd();
      })
      .catch(() => {});

    const id = setTimeout(() => {
      if (appOpenBlockedRef.current) return; // state changed during the delay
      import('./utils/ads')
        .then(({ maybeShowAppOpenAd }) => maybeShowAppOpenAd())
        .catch(err => console.error('Failed to load ads module:', err));
    }, 1200);
    return () => clearTimeout(id);
  }, [authLoading, user, showOnboarding]);

  // App-Open ad on RESUME. The cold-start effect above only fires on a true
  // process start, so a device that keeps the app in the background for days
  // would never see an app-open ad. We also treat a resume after a long
  // background (>= APP_OPEN_RESUME_MIN_BG_MS) as an eligible "open" and run the
  // same policy — maybeShowAppOpenAd shares ONE counter + time floor across cold
  // starts and resumes, so this never doubles up. Brief app-switches never
  // qualify. The crash guards still apply: maybeShowAppOpenAd bails while a
  // banner is live, and appOpenBlockedRef skips any non-neutral screen (recipe
  // open, extraction running, premium) — re-checked when the deferred timer fires.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = registerAppStateListener((isActive) => {
      if (!isActive) {
        appBackgroundedAtRef.current = Date.now();
        return;
      }
      // Foregrounded. Only a resume after a long background counts as an "open".
      const bgAt = appBackgroundedAtRef.current;
      appBackgroundedAtRef.current = null;
      if (bgAt == null || Date.now() - bgAt < APP_OPEN_RESUME_MIN_BG_MS) return;
      if (appOpenBlockedRef.current) return; // resumed onto a non-neutral screen

      // Warm the interstitial during the 1.2s beat so the resume ad is instant.
      import('./utils/ads')
        .then(({ appOpenAdWouldShow, preloadAppOpenAd }) => {
          if (appOpenAdWouldShow()) preloadAppOpenAd();
        })
        .catch(() => {});

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (appOpenBlockedRef.current) return; // state changed during the delay
        import('./utils/ads')
          .then(({ maybeShowAppOpenAd }) => maybeShowAppOpenAd())
          .catch(err => console.error('Failed to load ads module:', err));
      }, 1200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, []);

  // Initial sync on startup/login
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setInitialSyncDone(true);
      return;
    }

    let active = true;
    const sync = async () => {
      try {
        await fetchLimitStatus();
      } catch (e) {
        console.warn('Startup sync failed:', e);
      } finally {
        if (active) {
          setInitialSyncDone(true);
        }
      }
    };
    sync();
    return () => { active = false; };
  }, [authLoading, user, fetchLimitStatus]);


  // After an interactive login, always land on the catalog (history) tab.
  // Only fires on a genuine logged-out → logged-in transition, not on the
  // initial session restore at cold start — so deep links (shared recipe
  // URLs, notification taps) still resolve to their target. A pending Web
  // Share deep link takes precedence and is left to its own handler below.
  useEffect(() => {
    if (authLoading) return;
    const currentId = user?.id ?? null;

    if (!authSettledRef.current) {
      // First settled auth state (cold start): record without redirecting.
      authSettledRef.current = true;
      prevUserIdRef.current = currentId;
      return;
    }

    const prevId = prevUserIdRef.current;
    prevUserIdRef.current = currentId;

    if (!prevId && currentId) {
      const params = new URLSearchParams(window.location.search);
      const hasSharePayload = params.get('text') || params.get('url') || params.get('title');
      if (!hasSharePayload) {
        replace('history');
      }
    }
  }, [authLoading, user, replace]);

  // Fetch rate limit status when entering the extract tab (refresh)
  useEffect(() => {
    if (initialSyncDone && activeView === 'extract' && user) {
      fetchLimitStatus();
    }
  }, [activeView, user, fetchLimitStatus, initialSyncDone]);

  // Hide the native splash as soon as the web layer has mounted — NOT when auth
  // settles. Waiting for auth kept the native splash up for the whole
  // getSession() (+ token refresh) round-trip. During authLoading the app now
  // shows its own brand-matched loader (see the auth gate), so the handoff is
  // seamless and the auth round-trip no longer counts toward splash time.
  useEffect(() => {
    hideSplashScreen();
  }, []);

  // After history loads, check if current URL references a valid jobId and keep it,
  // or clear the subPath if the jobId no longer exists.
  useEffect(() => {
    if (!historyLoaded) return;
    if (activeView === 'history' && subPath && !isCatalogListRoute(subPath)) {
      const exists = history.some(j => j.id === subPath);
      if (exists) {
        // Clear the guard once the job is confirmed in history.
        if (newlyExtractedJobIdRef.current === subPath) {
          newlyExtractedJobIdRef.current = null;
        }
      } else if (subPath !== newlyExtractedJobIdRef.current) {
        // Only clear stale subPaths — never clear a newly-extracted job
        // that hasn't landed in history state yet.
        replace('history');
      }
    }
  }, [historyLoaded, history, activeView, subPath, replace]);

  // Listen to state-based pending navigation (handles timing/mount delays)
  useEffect(() => {
    if (pendingNavigation) {
      const targetId = pendingNavigation.recipeId;

      // 1. Check if the target is the currently active/extracted recipe
      if (recipe && (recipe.id === targetId || recipe.title === targetId)) {
        navigate('extract');
        return;
      }

      // 2. Check if the recipe exists in history
      const matchedJob = history.find(j => j.id === targetId || (j.recipe && j.recipe.title === targetId));
      if (matchedJob) {
        navigate('history', matchedJob.id);
      }
    }
  }, [pendingNavigation, recipe, history, navigate]);

  // Listen for timer click navigation events to route to the correct tab and set selected recipe
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId: string; stepNum: number }>;
      if (customEvent.detail && customEvent.detail.recipeId) {
        const targetId = customEvent.detail.recipeId;

        // 1. Check if the target is the currently active/extracted recipe
        if (recipe && (recipe.id === targetId || recipe.title === targetId)) {
          navigate('extract');
          return;
        }

        // 2. Check if the recipe exists in history
        const matchedJob = history.find(j => j.id === targetId || (j.recipe && j.recipe.title === targetId));
        if (matchedJob) {
          navigate('history', matchedJob.id);
        }
      }
    };
    window.addEventListener('app:navigate-to-timer-step', handleNavigate);
    return () => window.removeEventListener('app:navigate-to-timer-step', handleNavigate);
  }, [recipe, history, navigate]);

  // Listen for taps on native local notifications (Capacitor Android/iOS)
  useEffect(() => {
    return registerNotificationTap((recipeId, stepNum, extra) => {
      if (extra?.route === 'extract' || extra?.action === 'interrupted') {
        navigate('extract');
      } else if (recipeId) {
        if (stepNum !== undefined) {
          window.dispatchEvent(
            new CustomEvent('app:navigate-to-timer-step', {
              detail: { recipeId, stepNum },
            })
          );
        } else {
          navigate('history', recipeId);
        }
      }
      // Tapping the notification ends the finished timer(s) and stops the alarm.
      dismissAllFinished();
    });
  }, [dismissAllFinished, navigate]);

  // Smart AI push notifications: route taps into the app. A push carries a
  // `jobId` (open that recipe), a `route` (e.g. the extract tab for reactivation
  // nudges), or neither (just open the app).
  useEffect(() => {
    return registerPushTapHandler((payload) => {
      const targetJobId = payload.jobId || (payload as any).recipeId;
      if (targetJobId) {
        navigate('history', targetJobId);
      } else if (payload.route === 'extract') {
        navigate('extract');
      } else {
        navigate('history');
      }
    });
  }, [navigate]);

  // Re-register this device for remote push whenever a signed-in user has
  // notifications enabled (refreshes the FCM token server-side on each launch).
  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.notifications_enabled === true) {
      void enablePushNotifications(getAccessToken);
    }
  }, [user, getAccessToken]);

  // Lock navigation to 'extract' tab while a Free user extraction is in-flight
  useEffect(() => {
    if (isPending && !isPremium && activeView !== 'extract') {
      replace('extract');
    }
  }, [isPending, isPremium, activeView, replace]);

  // Register Android hardware back-button handler (swallow back presses during Free extraction)
  useEffect(() => {
    return registerBackButtonHandler(() => {
      if (isPending && !isPremium) {
        return true;
      }
      if (selectedJob) {
        setSelectedJob(null);
        return true;
      }
      if (activeView !== 'history') {
        navigate('history');
        return true;
      }
      return false;
    });
  }, [isPending, isPremium, selectedJob, activeView, navigate, setSelectedJob]);

  // Allow Settings to re-open the onboarding guide via a decoupled event,
  // avoiding threading the hook's state through props into SettingsView.
  useEffect(() => {
    const handler = () => replayOnboarding();
    window.addEventListener('app:replay-onboarding', handler);
    return () => window.removeEventListener('app:replay-onboarding', handler);
  }, [replayOnboarding]);

  // Background extractions (premium multi-job flow) live in ExtractionJobsContext.
  // When one completes we refresh history so the recipe is present; when the user
  // taps a finished card we open that recipe (nothing auto-navigates on its own).
  useEffect(() => {
    const onComplete = () => { fetchHistory(); };
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ jobId: string }>).detail;
      if (detail?.jobId) handleExtractionSuccess(detail.jobId);
    };
    window.addEventListener(EXTRACTION_COMPLETE_EVENT, onComplete);
    window.addEventListener(OPEN_RECIPE_EVENT, onOpen);
    return () => {
      window.removeEventListener(EXTRACTION_COMPLETE_EVENT, onComplete);
      window.removeEventListener(OPEN_RECIPE_EVENT, onOpen);
    };
  }, [fetchHistory, handleExtractionSuccess]);

  const handleDeleteJob = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm({
      title: t('app.dialog.deleteRecipe.title'),
      message: t('app.dialog.deleteRecipe.message'),
      confirmLabel: t('app.dialog.deleteRecipe.confirm'),
      cancelLabel: t('app.dialog.deleteRecipe.cancel'),
      status: 'danger'
    });
    if (!confirmed) {
      return;
    }

    try {
      const job = history.find(j => j.id === id);
      if (job?.recipe) {
        const r = job.recipe;
        const imagesToDelete = r.imageUrls && r.imageUrls.length > 0
          ? r.imageUrls
          : (r.imageUrl ? [r.imageUrl] : []);

        for (const imgUrl of imagesToDelete) {
          await deleteCachedImage(imgUrl);
        }
      }

      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(apiUrl(`/api/jobs/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchHistory();
        if (selectedJob?.id === id) {
          navigate('history');
        }
      } else {
        dialog.alert({
          title: t('app.dialog.deleteError.title'),
          message: t('app.dialog.deleteError.message'),
          status: 'danger'
        });
      }
    } catch (err) {
      console.error('Error deleting recipe:', err);
      dialog.alert({
        title: t('app.dialog.connectionError.title'),
        message: t('app.dialog.connectionError.message'),
        status: 'danger'
      });
    }
  };

  // Web Share Target Interceptor
  useEffect(() => {
    if (authLoading || !user) return;
    if (isWebShareProcessed) return;
    isWebShareProcessed = true;

    const params = new URLSearchParams(window.location.search);
    const text = params.get('text');
    const urlParam = params.get('url');
    const title = params.get('title');

    if (text || urlParam || title) {
      const combinedSearch = [text, urlParam, title].filter(Boolean).join(' ');
      const extractedUrl = parseSharedUrl(combinedSearch);
      if (extractedUrl) {
        // Clear query parameters, strip /share pathname, and switch to extract view
        replace('extract');
        setUrl(extractedUrl);
        const isBlocked = limitStatus && (limitStatus.cookbookFull || (limitStatus.limit >= 0 && limitStatus.remaining <= 0));
        if (!isBlocked) {
          triggerExtraction(extractedUrl);
        }
      } else {
        // Clear query parameters anyway so they don't linger in the browser address bar
        replace(activeView);
      }
    }
  }, [authLoading, user, replace, setUrl, triggerExtraction, activeView, limitStatus]);

  // Native (Capacitor) share intent: route a shared Instagram link into the
  // same extraction flow as the Web Share Target above.
  useEffect(() => {
    if (authLoading || !user) return;
    return registerShareIntent((sharedUrl) => {
      replace('extract');
      setUrl(sharedUrl);
      const isBlocked = limitStatus && (limitStatus.cookbookFull || (limitStatus.limit >= 0 && limitStatus.remaining <= 0));
      if (!isBlocked) {
        triggerExtraction(sharedUrl);
      }
    });
  }, [authLoading, user, replace, setUrl, triggerExtraction, limitStatus]);

  // Handle Capacitor native App Links / Deep Links (e.g. snagbite://invite/CODE or https://snagbite.app/invite/CODE)
  useEffect(() => {
    return registerAppUrlOpen((openUrl) => {
      try {
        const urlObj = new URL(openUrl);
        let targetHash: string | null = null;

        if (urlObj.protocol === 'snagbite:' || urlObj.protocol === 'at.snagbite.app:') {
          const codeParam = urlObj.searchParams.get('code');
          const host = urlObj.hostname;
          const path = urlObj.pathname.replace(/^\/+/, '');
          if (codeParam) {
            targetHash = `#/invite/${codeParam}`;
          } else if (host === 'invite') {
            targetHash = path ? `#/invite/${path}` : '#/progress';
          } else if (path.startsWith('invite/')) {
            targetHash = `#/${path}`;
          } else {
            const full = [host, path].filter(Boolean).join('/');
            if (full) targetHash = `#/${full}`;
          }
        } else if (urlObj.hash && urlObj.hash !== '#' && urlObj.hash !== '#/') {
          targetHash = urlObj.hash;
        } else if (urlObj.pathname && urlObj.pathname !== '/' && !urlObj.pathname.endsWith('.html')) {
          targetHash = `#${urlObj.pathname}`;
        }

        if (targetHash) {
          if (window.location.hash === targetHash) {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          } else {
            window.location.hash = targetHash;
          }
        }
      } catch (err) {
        console.warn('Failed to parse openUrl:', err);
      }
    });
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (extractMode === 'photo') {
      triggerPhotoExtraction();
      return;
    }
    triggerExtraction(url);
  };



  // ── Auth gate ────────────────────────────────────────────────────────────
  // Only block on auth settling — NOT on the initial limit-status sync. That
  // sync is a network call; gating the whole app on it just swaps the splash
  // for a full-screen spinner for a second or two. `limitStatus` is nullable
  // everywhere (the quota line simply doesn't render until it arrives), so we
  // show the app immediately and let the sync populate in the background.
  if (authLoading) {
    // Brand-matched loader (same #064e3b background + spinner as the native
    // splash) so hiding the splash on mount hands off without a visible flash.
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#064e3b]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/70 border-t-transparent" />
      </div>
    );
  }

  // First-launch onboarding is shown BEFORE the login screen. WelcomeGuide is a
  // self-contained full-screen portal overlay, and useOnboarding's gate works
  // without a logged-in user (localStorage is the authoritative flag).
  if (!user && showOnboarding) {
    return (
      <Suspense fallback={null}>
        <WelcomeGuide onClose={completeOnboarding} />
      </Suspense>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center transition-colors duration-300">
      {/* Sticky top region: safe-area inset + timer banner share one sticky
          container so they stack without a gap or overlapping each other when
          pinned. */}
      <div ref={setStickyTopEl} className="sticky top-0 z-40 w-full">
        {/* Status bar background filler for devices with safe-area-inset-top (e.g. Android 15 Edge-to-Edge) */}
        <div className="w-full h-[var(--safe-area-inset-top)] bg-[#064e3b]" />

        {activeView === 'extract' && !isPending && !recipe && (
          <header className="w-full bg-gray-50/85 dark:bg-gray-950/85 backdrop-blur-md transition-colors duration-300">
            <div className="relative w-full max-w-md mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="flex-shrink-0">
                  <img src="/logo-login.png" alt="App Logo" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white m-0 leading-none">
                    {t('form.headerTitle') || t('app.title')}
                  </h1>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-none">
                    {t('form.headerSubtitle')}
                  </p>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Active Cooking Timers Banner */}
        <TimerBanner />

        {/* Instant OTA Update Consent Banner */}
        <OtaUpdateBanner />
      </div>

      {/* Main content body */}
      <main className={`w-full max-w-md mx-auto px-4 mt-1 flex-1 flex flex-col gap-6 ${
        (activeView === 'extract' && isPending && !recipe)
          ? 'pb-6 my-auto justify-center'
          : isViewingRecipe || (activeView === 'history' && isCatalogSelectMode)
            ? 'pb-48'
            : !isPremium && activeView !== 'settings'
              ? 'pb-44'
              : 'pb-24'
        } ${(!isViewingRecipe && activeView !== 'extract') ? 'pt-4' : ''}`}>

        {/* One-time trial banner for free users */}
        {!(isPending && !isPremium) && <TrialBanner onOpenPremium={() => setIsPremiumModalOpen(true)} />}

        {/* Soft opt-in notification prompt (triggered after N saved recipes) */}
        {!(isPending && !isPremium) && <NotificationPrompt savedCount={history.length} />}

        {/* ALWAYS-MOUNTED VIEWS — hidden via HTML `hidden` attribute (display:none)
            instead of conditional rendering. This preserves component state,
            scroll positions, and avoids costly re-mounts on every tab switch. */}

        {/* EXTRACT TAB */}
        <div
          hidden={activeView !== 'extract'}
          aria-hidden={activeView !== 'extract' || undefined}
          className={activeView === 'extract' ? `flex-1 flex flex-col min-h-0 ${isPending ? 'justify-center my-auto' : ''}` : ''}
        >
          {recipe ? (
            /* Recipe Detail View — hides extract inputs once extraction is done */
            <Suspense fallback={<ViewFallback />}>
            <RecipeDetails
              key={recipe.id || recipe.title}
              recipe={recipe}
              onAddIngredients={addRecipeIngredients}
              reelUrl={url}
              onBack={() => {
                setRecipe(null);
                setUrl('');
                navigate('extract');
              }}
              onNavigateToShoppingList={() => navigate('shopping-list')}
              shoppingListCount={aggregatedList.unchecked.length}
              onRemixSuccess={(newRecipe) => setRecipe(newRecipe)}
              onReplaceCurrent={(newRecipe) => {
                setRecipe(newRecipe);
                fetchHistory();
              }}
              isParentAvailable={recipe?.parentJobId ? history.some(j => j.id === recipe?.parentJobId) : false}
              parentRecipeTitle={recipe?.parentRecipeTitle || (recipe?.parentJobId ? history.find(j => j.id === recipe.parentJobId)?.recipe?.title : null)}
              onNavigateToRecipe={(recipeId) => {
                const parentJob = history.find(j => j.id === recipeId);
                if (parentJob) {
                  navigate('history', parentJob.id);
                  setRecipe(null);
                  setUrl('');
                }
              }}
            />
            </Suspense>
          ) : latestRunning ? (
            /* Premium background extraction running: keep the animation (newest
               job) on top, the per-job boxes below, and hide the form. Further
               extractions are started via the native share intent. */
            <div className="flex flex-col gap-6">
              <ExtractionAnimation
                key={latestRunning.id}
                url={latestRunning.sourceLabel}
                isPending
                jobStatus={latestRunning.status}
                progress={latestRunning.progress}
                variant={latestRunning.mode === 'photo' ? 'photo' : 'link'}
              />
              <ActiveExtractions />
              <ErrorBanner
                isPending={false}
                jobStatus={jobStatus}
                jobError={jobError}
                jobErrorCode={jobErrorCode}
                jobErrorParams={jobErrorParams}
                onRetry={() => extractMode === 'photo' ? triggerPhotoExtraction() : triggerExtraction(url)}
              />
            </div>
          ) : (
            /* Extraction Form & Error Banner */
            <ExtractForm
              isActive={activeView === 'extract' && !recipe}
              url={url}
              setUrl={setUrl}
              urlError={urlError}
              setUrlError={setUrlError}
              validateUrl={validateUrl}
              isPending={isPending}
              handleFormSubmit={handleFormSubmit}
              limitStatus={limitStatus}
              jobStatus={jobStatus}
              progress={progress}
              mode={extractMode}
              setMode={setExtractMode}
              photos={photos}
              setPhotos={setPhotos}
              isUploadingPhotos={isUploadingPhotos}
              claimRewardedCredit={claimRewardedCredit}
              errorBanner={
                (extractionJobs.length > 0 || (jobStatus === 'failed' && jobErrorCode !== 'RATE_LIMIT_EXCEEDED')) ? (
                  <div className="flex flex-col gap-3">
                    {extractionJobs.length > 0 && <ActiveExtractions />}
                    <ErrorBanner
                      isPending={isPending}
                      jobStatus={jobStatus}
                      jobError={jobError}
                      jobErrorCode={jobErrorCode}
                      jobErrorParams={jobErrorParams}
                      onRetry={() => extractMode === 'photo' ? triggerPhotoExtraction() : triggerExtraction(url)}
                    />
                  </div>
                ) : null
              }
            />
          )}
        </div>

        {/* HISTORY / SAVED RECIPES TAB */}
        <div hidden={activeView !== 'history'} aria-hidden={activeView !== 'history' || undefined}>
          {visitedViews.has('history') && (
          <Suspense fallback={<ViewFallback />}>
          <SavedCatalog
            history={history}
            historyLoaded={historyLoaded}
            selectedJob={selectedJob}
            setSelectedJob={setSelectedJob}
            handleDeleteJob={handleDeleteJob}
            onAddIngredients={addRecipeIngredients}
            fetchHistory={fetchHistory}
            getAccessToken={getAccessToken}
            onNavigateToShoppingList={() => {
              navigate('shopping-list');
            }}
            shoppingListCount={aggregatedList.unchecked.length}
            onRemixSuccess={async (newRecipe, newJobId) => {
              await fetchHistory();
              if (newJobId) {
                navigate('history', newJobId);
              } else {
                // To immediately show the new recipe, we can switch to extraction view
                setRecipe(newRecipe);
                setUrl('');
                navigate('extract');
              }
            }}
            onReplaceCurrent={() => {
              fetchHistory();
            }}
            onSelectModeChange={setIsCatalogSelectMode}
            onOverlaySheetChange={setIsCatalogSheetOpen}
            catalogSubPath={subPath}
            onNavigateCatalog={navigateCatalog}
            limitStatus={limitStatus}
          />
          </Suspense>
          )}
        </div>

        {/* SHOPPING LIST TAB */}
        <div hidden={activeView !== 'shopping-list'} aria-hidden={activeView !== 'shopping-list' || undefined}>
          {visitedViews.has('shopping-list') && (
          <Suspense fallback={<ViewFallback />}>
          <ShoppingList
            aggregatedList={aggregatedList}
            activeRecipes={activeRecipes}
            history={history}
            onSelectRecipe={(jobId) => {
              navigate('history', jobId);
            }}
            onRemoveRecipe={removeRecipeFromList}
            addCustomItem={addCustomItem}
            toggleItemIds={toggleItemIds}
            deleteItemIds={deleteItemIds}
            toggleItemGroup={toggleItemGroup}
            deleteItemGroup={deleteItemGroup}
            clearAll={clearAll}
            clearChecked={clearChecked}
          />
          </Suspense>
          )}
        </div>

        {/* PROGRESS TAB */}
        <div hidden={activeView !== 'progress'} aria-hidden={activeView !== 'progress' || undefined}>
          {visitedViews.has('progress') && (
          <Suspense fallback={<ViewFallback />}>
          <ProgressView
            pendingInviteCode={pendingInviteCode}
            onInviteConsumed={() => setPendingInviteCode(null)}
            onSelectRecipe={(jobId) => {
              navigate('history', jobId);
            }}
          />
          </Suspense>
          )}
        </div>

        {/* SETTINGS TAB */}
        <div hidden={activeView !== 'settings'} aria-hidden={activeView !== 'settings' || undefined}>
          {visitedViews.has('settings') && (
          <Suspense fallback={<ViewFallback />}>
          <SettingsView />
          </Suspense>
          )}
        </div>
      </main>

      {/* Global Premium Modal (shared by TrialBanner and other components) */}
      {premiumModalLoaded && (
        <Suspense fallback={null}>
          <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />
        </Suspense>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {(() => {
        const isBottomBarHidden =
          (activeView === 'history' && (isCatalogSelectMode || isCatalogSheetOpen)) ||
          (isPending && !isPremium) ||
          isPremiumModalOpen;
        const bottomBarClasses = `fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ease-in-out px-3 pb-[calc(0.75rem_+_var(--safe-area-inset-bottom))] ${isBottomBarHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`;

        return (
          <div className={bottomBarClasses}>
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-100 dark:border-gray-800/80 shadow-[0_8px_28px_rgba(0,0,0,0.12)] w-full max-w-md mx-auto flex flex-col rounded-3xl overflow-hidden">

              <div className="w-full flex justify-around items-center pt-3 pb-3 px-3">
              {/* Extract / New Recipe Tab */}
              <button
                onClick={() => navigate('extract')}
                className={`flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 relative transition-colors ${activeView === 'extract'
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <div className="relative">
                  <Sparkles className="w-5.5 h-5.5 mb-1" />
                  {isPending && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-sm">
                      <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-emerald-600 dark:border-emerald-400 border-t-transparent animate-spin" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] tracking-wide font-medium">{t('app.nav.newRecipe')}</span>
                {activeView === 'extract' && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>

              {/* Recipes / History Tab */}
              <button
                onClick={() => {
                  if (activeView === 'history') {
                    // Tapping the already-active tab returns to the recipe list.
                    navigate('history');
                  } else {
                    // Restore the recipe that was open when the tab was left.
                    navigate('history', lastHistorySubPathRef.current);
                  }
                  fetchHistory();
                }}
                className={`flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 relative transition-colors ${activeView === 'history'
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <div className="relative">
                  <BookOpen className="w-5.5 h-5.5 mb-1" />
                </div>
                <span className="text-[11px] tracking-wide font-medium">{t('app.nav.savedRecipes')}</span>
                {activeView === 'history' && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>

              {/* Shopping List Tab */}
              <button
                onClick={() => navigate('shopping-list')}
                className={`flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 relative transition-colors ${activeView === 'shopping-list'
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <div className="relative">
                  <ShoppingCart className="w-5.5 h-5.5 mb-1" />
                  {aggregatedList.unchecked.length > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-gray-900 animate-pulse-slow">
                      {aggregatedList.unchecked.length}
                    </span>
                  )}
                </div>
                <span className="text-[11px] tracking-wide font-medium">{t('app.nav.shoppingList')}</span>
                {activeView === 'shopping-list' && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>

              {/* Progress Tab */}
              <button
                onClick={() => navigate('progress')}
                className={`flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 relative transition-colors ${activeView === 'progress'
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <div className="relative">
                  <Trophy className="w-5.5 h-5.5 mb-1" />
                  {incomingRequestsCount > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center text-center leading-none rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-pulse">
                      {incomingRequestsCount}
                    </span>
                  ) : userLevel !== null && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center text-center leading-none rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-pulse-slow">
                      {userLevel}
                    </span>
                  )}
                </div>
                <span className="text-[11px] tracking-wide font-medium">{t('app.nav.progress')}</span>
                {activeView === 'progress' && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>

              {/* Settings Tab */}
              <button
                onClick={() => navigate('settings')}
                className={`flex-1 flex flex-col items-center justify-center pt-2 pb-2.5 relative transition-colors ${activeView === 'settings'
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <div className="relative">
                  <User className="w-5.5 h-5.5 mb-1" />
                </div>
                <span className="text-[11px] tracking-wide font-medium">{t('app.nav.settings') || 'Profil'}</span>
                {activeView === 'settings' && (
                  <span className="absolute bottom-0.5 w-6 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>
            </div>
          </div>
        </div>
      );
      })()}

      {/* First-launch onboarding overlay (rendered via portal) */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <WelcomeGuide
            onClose={() => {
              completeOnboarding();
              navigate('extract');
            }}
          />
        </Suspense>
      )}

      {/* Alpha tester welcome overlay — after onboarding so they don't stack */}
      {!showOnboarding && showAlphaWelcome && (
        <Suspense fallback={null}>
          <AlphaWelcome onClose={completeAlphaWelcome} />
        </Suspense>
      )}
    </div>
  );
}
