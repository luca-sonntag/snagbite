import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, BookOpen, ShoppingCart, User, Trophy } from 'lucide-react';

import type { Job } from './types';
import { apiUrl } from './api';
import { registerShareIntent, registerNotificationTap, hideSplashScreen, registerBackButtonHandler } from './native';
import { registerPushTapHandler, enablePushNotifications } from './push';
import { parseSharedUrl } from './utils/shareUrl';
import ExtractForm, { type ExtractMode } from './components/ExtractForm';
import ActiveExtractions from './components/ActiveExtractions';
import ExtractionAnimation from './components/ExtractionAnimation';
import ErrorBanner from './components/ErrorBanner';
import RecipeDetails from './components/RecipeDetails';
import SavedCatalog from './components/SavedCatalog/index';
import { isCatalogListRoute } from './components/SavedCatalog/catalogRoutes';
import ShoppingList from './components/ShoppingList';
import AuthForm from './components/AuthForm';
import SettingsView from './components/SettingsView';
import ProgressView from './components/ProgressView';
import TimerBanner from './components/TimerBanner';
import OtaUpdateBanner from './components/OtaUpdateBanner';
import WelcomeGuide from './components/WelcomeGuide';
import AlphaWelcome from './components/AlphaWelcome';
import AdminView from './components/AdminView';
import TrialBanner from './components/TrialBanner';
import NotificationPrompt from './components/NotificationPrompt';
import PremiumModal from './components/PremiumModal';

import { useRecipeExtraction } from './hooks/useRecipeExtraction';
import { useShoppingList } from './hooks/useShoppingList';
import { useDialog } from './context/DialogContext';
import { useI18n } from './context/I18nContext';
import { useAuth } from './context/AuthContext';
import { useGamification } from './context/GamificationContext';
import { useHashRouter } from './hooks/useHashRouter';
import { EXTRACTION_COMPLETE_EVENT, OPEN_RECIPE_EVENT, useExtractionJobs } from './context/ExtractionJobsContext';
import { useMobileNavigationBack } from './hooks/useMobileNavigationBack';
import { deleteCachedImage } from './utils/imageStore';
import { useTimerManager } from './hooks/useTimerManager';
import { useOnboarding } from './hooks/useOnboarding';
import { useAlphaWelcome } from './hooks/useAlphaWelcome';
import ExtractionAdCard from './components/ExtractionAdCard';
import { removeExtractionBanner } from './utils/ads';

// Module-level flag to ensure the Web Share Target is only processed once per page load.
// This prevents re-triggering the interceptor when the user's auth state or metadata updates.
let isWebShareProcessed = false;

export default function App() {
  const dialog = useDialog();
  const { t } = useI18n();
  const { user, isPremium, loading: authLoading, getAccessToken } = useAuth();
  const { snapshot: gamificationSnapshot } = useGamification();
  const userLevel = gamificationSnapshot?.stats?.level ?? null;

  // ── URL-based routing ────────────────────────────────────────────────────
  const { tab: activeView, subPath, navigate, replace } = useHashRouter();

  // History & multi-view states
  const [history, setHistory] = useState<Job[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [isCatalogSelectMode, setIsCatalogSelectMode] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const { pendingNavigation, dismissAllFinished } = useTimerManager();

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

  // Remove native AdMob banner overlay whenever the user navigates away from the extract tab or opens a recipe details view
  useEffect(() => {
    if (activeView !== 'extract' || recipe) {
      void removeExtractionBanner();
    }
  }, [activeView, recipe]);

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

  // Hide native splash screen as soon as auth has settled.
  // We don't wait for initialSyncDone (fetchLimitStatus) because that API call
  // would add unnecessary delay — the limit status can be loaded silently in
  // the background while the app is already visible to the user.
  useEffect(() => {
    if (!authLoading) {
      hideSplashScreen();
    }
  }, [authLoading]);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (extractMode === 'photo') {
      triggerPhotoExtraction();
      return;
    }
    triggerExtraction(url);
  };



  // ── Auth gate ────────────────────────────────────────────────────────────
  if (authLoading || !initialSyncDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // First-launch onboarding is shown BEFORE the login screen. WelcomeGuide is a
  // self-contained full-screen portal overlay, and useOnboarding's gate works
  // without a logged-in user (localStorage is the authoritative flag).
  if (!user && showOnboarding) {
    return <WelcomeGuide onClose={completeOnboarding} />;
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
            <div className="relative w-full max-w-md mx-auto px-4 py-3 flex justify-center items-center">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  <img src="/logo-login.png" alt="App Logo" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white m-0 leading-none">{t('app.title')}</h1>
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
      <main className={`w-full max-w-md mx-auto px-4 mt-1 flex-1 flex flex-col gap-6 ${activeView === 'admin'
        ? 'pb-12'
        : isViewingRecipe || (activeView === 'history' && isCatalogSelectMode)
          ? 'pb-48'
          : !isPremium && (activeView === 'history' || activeView === 'extract' || activeView === 'shopping-list')
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
          className={activeView === 'extract' ? 'flex-1 flex flex-col min-h-0' : ''}
        >
          {recipe ? (
            /* Recipe Detail View — hides extract inputs once extraction is done */
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
            catalogSubPath={subPath}
            onNavigateCatalog={navigateCatalog}
            limitStatus={limitStatus}
          />
        </div>

        {/* SHOPPING LIST TAB */}
        <div hidden={activeView !== 'shopping-list'} aria-hidden={activeView !== 'shopping-list' || undefined}>
          <ShoppingList
            aggregatedList={aggregatedList}
            addCustomItem={addCustomItem}
            toggleItemIds={toggleItemIds}
            deleteItemIds={deleteItemIds}
            toggleItemGroup={toggleItemGroup}
            deleteItemGroup={deleteItemGroup}
            clearAll={clearAll}
            clearChecked={clearChecked}
          />
        </div>

        {/* PROGRESS TAB */}
        <div hidden={activeView !== 'progress'} aria-hidden={activeView !== 'progress' || undefined}>
          <ProgressView
            onSelectRecipe={(jobId) => {
              navigate('history', jobId);
            }}
          />
        </div>

        {/* SETTINGS TAB */}
        <div hidden={activeView !== 'settings'} aria-hidden={activeView !== 'settings' || undefined}>
          <SettingsView />
        </div>

        {/* ADMIN TAB — stays conditional: large (61 KB), rarely used, no state worth preserving */}
        {activeView === 'admin' && <AdminView onBack={() => navigate('settings')} />}
      </main>

      {/* Global Premium Modal (shared by TrialBanner and other components) */}
      <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />

      {/* Mobile Bottom Navigation Bar */}
      {(() => {
        const isBottomBarHidden = (activeView === 'history' && isCatalogSelectMode) || activeView === 'admin' || (isPending && !isPremium);
        const bottomBarClasses = `fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ease-in-out pb-safe ${isBottomBarHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`;

        const shouldShowBannerAd =
          !isPremium &&
          !isViewingRecipe &&
          (activeView === 'history' || activeView === 'extract' || activeView === 'shopping-list');

        return (
          <div className={bottomBarClasses}>
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] w-full max-w-md mx-auto flex flex-col rounded-t-3xl overflow-hidden">
              {/* Banner ad displayed seamlessly attached to top of bottom menu for free users */}
              <div className={`w-full transition-all duration-300 overflow-hidden ${shouldShowBannerAd ? 'max-h-24 opacity-100 pt-2 pb-1.5 px-3 border-b border-gray-100/60 dark:border-gray-800/60 flex flex-col items-center justify-center' : 'max-h-0 opacity-0 p-0 border-none pointer-events-none'}`}>
                <ExtractionAdCard isActive={shouldShowBannerAd && !isBottomBarHidden} variant="banner" embedded />
              </div>

              <div className="w-full flex justify-around items-center pt-3 pb-[calc(1.25rem_+_var(--safe-area-inset-bottom))] px-3">
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
                  {userLevel !== null && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white leading-none ring-2 ring-white dark:ring-gray-900 animate-pulse-slow">
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
        <WelcomeGuide
          onClose={() => {
            completeOnboarding();
            navigate('extract');
          }}
        />
      )}

      {/* Alpha tester welcome overlay — after onboarding so they don't stack */}
      {!showOnboarding && showAlphaWelcome && (
        <AlphaWelcome onClose={completeAlphaWelcome} />
      )}
    </div>
  );
}
