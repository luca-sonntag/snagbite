import { useEffect, useRef } from 'react';
import {
  registerShareIntent,
  registerNotificationTap,
  registerBackButtonHandler,
  registerAppUrlOpen,
  clearRecipeReadyNotification,
} from '../native';
import { registerPushTapHandler, enablePushNotifications } from '../push';
import { parseSharedUrl } from '../utils/shareUrl';
import { EXTRACTION_COMPLETE_EVENT, OPEN_RECIPE_EVENT } from '../context/ExtractionJobsContext';
import { useOverlayStack } from '../context/OverlayStackContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';
import type { UseAppNativeListenersProps } from '../types/app';

// Module-level flag to ensure the Web Share Target is only processed once per page load.
let isWebShareProcessed = false;



export function useAppNativeListeners({
  user,
  authLoading,
  getAccessToken,
  activeView,
  isCatalogList,
  selectedJob,
  catalogReturnRef,
  recipe,
  setRecipe,
  setUrl,
  navigate,
  replace,
  dismissAllFinished,
  pendingNavigation,
  history,
  fetchHistory,
  handleExtractionSuccess,
  replayOnboarding,
  limitStatus,
  triggerExtraction,
  isPending,
  isPremium,
}: UseAppNativeListenersProps) {
  const { handleBack: handleOverlayBack } = useOverlayStack();
  const toast = useToast();
  const { t } = useI18n();
  const lastBackPressRef = useRef<number>(0);

  // Android hardware back-button & edge swipe-back gesture
  useEffect(() => {
    return registerBackButtonHandler(() => {
      // 1. Overlays and in-page custom back handlers (LIFO stack)
      if (handleOverlayBack()) {
        return true;
      }

      // 2. Legacy gallery history state fallback
      if (window.history.state && window.history.state.galleryOpen) {
        window.history.back();
        return true;
      }

      // 3. Extraction in progress for free users (don't exit while ad/extract running)
      if (isPending && !isPremium) {
        return true;
      }

      // 4. Recipe details view -> back to catalog list or home
      if (activeView === 'history' && selectedJob) {
        navigate('history', catalogReturnRef.current);
        return true;
      }

      // 5. Catalog list view (sammlung / all / quick etc.) -> back to cookbook home
      if (isCatalogList) {
        navigate('history');
        return true;
      }

      // 6. Extracted recipe preview in extract tab -> reset back to extract form
      if (activeView === 'extract' && recipe) {
        setRecipe(null);
        setUrl('');
        navigate('extract');
        return true;
      }

      // 7. Non-history tabs (meal-planner, shopping-list, pantry, profile, extract) -> back to history
      if (activeView !== 'history') {
        navigate('history');
        return true;
      }

      // 8. Root screen (CookbookHome) exit guard: double-tap to exit within 2s
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false;
      }

      lastBackPressRef.current = now;
      toast.info(t('app.pressBackAgainToExit') || 'Zum Beenden noch einmal tippen', { duration: 2000 });
      return true;
    });
  }, [
    handleOverlayBack,
    activeView,
    selectedJob,
    isCatalogList,
    recipe,
    navigate,
    setRecipe,
    setUrl,
    isPending,
    isPremium,
    catalogReturnRef,
    toast,
    t,
  ]);

  // Listen to state-based pending navigation
  useEffect(() => {
    if (!pendingNavigation) return;
    const targetId = pendingNavigation.recipeId;
    if (recipe && (recipe.id === targetId || recipe.title === targetId)) {
      navigate('extract');
      return;
    }
    const matchedJob = history.find(
      (j) => j.recipeId === targetId || (j.recipe && j.recipe.title === targetId)
    );
    if (matchedJob) {
      navigate('history', matchedJob.recipeId);
    }
  }, [pendingNavigation, recipe, history, navigate]);

  // Listen for timer click navigation events
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId: string; stepNum: number }>;
      if (!customEvent.detail || !customEvent.detail.recipeId) return;
      const targetId = customEvent.detail.recipeId;

      if (recipe && (recipe.id === targetId || recipe.title === targetId)) {
        navigate('extract');
        return;
      }
      const matchedJob = history.find(
        (j) => j.recipeId === targetId || (j.recipe && j.recipe.title === targetId)
      );
      if (matchedJob) {
        navigate('history', matchedJob.recipeId);
      }
    };
    window.addEventListener('app:navigate-to-timer-step', handleNavigate);
    return () => window.removeEventListener('app:navigate-to-timer-step', handleNavigate);
  }, [recipe, history, navigate]);

  // Listen for taps on native local notifications
  useEffect(() => {
    return registerNotificationTap((recipeId, stepNum, extra) => {
      clearRecipeReadyNotification();
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
      dismissAllFinished();
    });
  }, [dismissAllFinished, navigate]);

  // AI Push Notifications tap handler
  useEffect(() => {
    return registerPushTapHandler((payload) => {
      const targetJobId = payload.jobId || ('recipeId' in payload ? (payload as { recipeId?: string }).recipeId : undefined);
      if (targetJobId) {
        navigate('history', targetJobId);
      } else if (payload.route === 'extract') {
        navigate('extract');
      } else {
        navigate('history');
      }
    });
  }, [navigate]);

  // Re-register device for push on login
  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.notifications_enabled === true) {
      void enablePushNotifications(getAccessToken);
    }
  }, [user, getAccessToken]);

  // Settings re-open onboarding guide
  useEffect(() => {
    const handler = () => replayOnboarding();
    window.addEventListener('app:replay-onboarding', handler);
    return () => window.removeEventListener('app:replay-onboarding', handler);
  }, [replayOnboarding]);

  // Extraction job events
  useEffect(() => {
    const onComplete = () => {
      fetchHistory();
    };
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ jobId?: string; recipeId?: string }>).detail;
      const targetId = detail?.recipeId || detail?.jobId;
      if (targetId) handleExtractionSuccess(targetId);
    };
    window.addEventListener(EXTRACTION_COMPLETE_EVENT, onComplete);
    window.addEventListener(OPEN_RECIPE_EVENT, onOpen);
    return () => {
      window.removeEventListener(EXTRACTION_COMPLETE_EVENT, onComplete);
      window.removeEventListener(OPEN_RECIPE_EVENT, onOpen);
    };
  }, [fetchHistory, handleExtractionSuccess]);

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
        replace('extract');
        setUrl(extractedUrl);
        const isBlocked =
          limitStatus &&
          (limitStatus.cookbookFull || (limitStatus.limit >= 0 && limitStatus.remaining <= 0));
        if (!isBlocked) {
          triggerExtraction(extractedUrl);
        }
      } else {
        replace(activeView);
      }
    }
  }, [authLoading, user, replace, setUrl, triggerExtraction, activeView, limitStatus]);

  // Native share intent
  useEffect(() => {
    if (authLoading || !user) return;
    return registerShareIntent((sharedUrl) => {
      replace('extract');
      setUrl(sharedUrl);
      const isBlocked =
        limitStatus &&
        (limitStatus.cookbookFull || (limitStatus.limit >= 0 && limitStatus.remaining <= 0));
      if (!isBlocked) {
        triggerExtraction(sharedUrl);
      }
    });
  }, [authLoading, user, replace, setUrl, triggerExtraction, limitStatus]);

  // Dev mode re-extraction trigger
  useEffect(() => {
    const handleDevReExtract = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      if (customEvent.detail?.url) {
        replace('extract');
        setUrl(customEvent.detail.url);
        triggerExtraction(customEvent.detail.url);
      }
    };
    window.addEventListener('app:dev-re-extract', handleDevReExtract);
    return () => window.removeEventListener('app:dev-re-extract', handleDevReExtract);
  }, [replace, setUrl, triggerExtraction]);

  // Native Deep Links
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
}
