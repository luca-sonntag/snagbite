import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';

import type { SavedRecipe } from './types';
import { hideSplashScreen } from './native';
import ExtractForm, { type ExtractMode } from './components/ExtractForm';
import ActiveExtractions from './components/ActiveExtractions';
import ExtractionAnimation from './components/ExtractionAnimation';
import ErrorBanner from './components/ErrorBanner';
import { isCatalogListRoute } from './components/SavedCatalog/catalogRoutes';
import AuthForm from './components/AuthForm';
import TrialBanner from './components/TrialBanner';
import NotificationPrompt from './components/NotificationPrompt';
import AppTopBanners from './components/AppTopBanners';
import AppBottomNav from './components/AppBottomNav';
import AppOverlays from './components/AppOverlays';
import AppSplashScreen from './components/AppSplashScreen';

import SavedCatalog from './components/SavedCatalog/index';

// Lazy-loaded secondary views
const RecipeDetails = lazy(() => import('./components/RecipeDetails'));
const MealPlannerView = lazy(() => import('./components/MealPlanner'));
const ShoppingList = lazy(() => import('./components/ShoppingList'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const WelcomeGuide = lazy(() => import('./components/WelcomeGuide'));

import { useRecipeExtraction } from './hooks/useRecipeExtraction';
import { useShoppingList } from './hooks/useShoppingList';
import { useAuth } from './context/AuthContext';
import { apiUrl } from './api';
import { useSocial } from './context/SocialContext';
import { useGamification } from './context/GamificationContext';
import { useHashRouter } from './hooks/useHashRouter';
import { useExtractionJobs } from './context/ExtractionJobsContext';
import { useMobileNavigationBack } from './hooks/useMobileNavigationBack';
import { useTimerManager } from './hooks/useTimerManager';
import { useOnboarding } from './hooks/useOnboarding';
import { useAlphaWelcome } from './hooks/useAlphaWelcome';
import { useAppHistory } from './hooks/useAppHistory';
import { useAppAds } from './hooks/useAppAds';
import { useAppNativeListeners } from './hooks/useAppNativeListeners';
import { useMealPlanBadge } from './hooks/useMealPlanBadge';
import { preloadSecondaryChunks } from './utils/chunkPreloader';

function ViewFallback() {
  return (
    <div className="w-full min-h-[55vh] flex-1 flex flex-col items-center justify-center my-auto py-12 gap-3 select-none">
      <div className="relative w-9 h-9 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    </div>
  );
}

export default function App() {
  const { user, isPremium, loading: authLoading, getAccessToken } = useAuth();
  const { snapshot: gamificationSnapshot } = useGamification();
  const { incomingRequests } = useSocial();
  const { outstandingCount: outstandingMealPlansCount } = useMealPlanBadge({ user, authLoading, getAccessToken });
  const userLevel = gamificationSnapshot?.stats?.level ?? null;
  const incomingRequestsCount = incomingRequests.length;

  const { tab: activeView, subPath, navigate, replace } = useHashRouter();

  // Invite deep link (#/invite/<code>)
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  useEffect(() => {
    if (activeView === 'invite') {
      if (subPath) setPendingInviteCode(subPath.toUpperCase());
      navigate('progress');
    }
  }, [activeView, subPath, navigate]);

  const [isCatalogSelectMode, setIsCatalogSelectMode] = useState(false);
  const [isCatalogSheetOpen, setIsCatalogSheetOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const { pendingNavigation, dismissAllFinished } = useTimerManager();

  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => new Set([activeView]));
  useEffect(() => {
    setVisitedViews((prev) => (prev.has(activeView) ? prev : new Set(prev).add(activeView)));
  }, [activeView]);

  const { shouldShow: showOnboarding, complete: completeOnboarding, replay: replayOnboarding } = useOnboarding();
  const { shouldShow: showAlphaWelcome, complete: completeAlphaWelcome } = useAlphaWelcome();

  const isCatalogList = activeView === 'history' && isCatalogListRoute(subPath);

  const {
    history,
    historyLoaded,
    fetchHistory,
    handleExtractionSuccess,
    handleDeleteJob,
    extraRecipes,
    registerExtraRecipe,
  } = useAppHistory({
    user,
    authLoading,
    getAccessToken,
    activeView,
    subPath,
    navigate,
    replace,
  });

  const selectedJob: SavedRecipe | null =
    activeView === 'history' && subPath && !isCatalogListRoute(subPath) && historyLoaded
      ? (history.find((j) => j.recipeId === subPath) || extraRecipes[subPath] || null)
      : null;

  const catalogReturnRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeView !== 'history' || selectedJob) return;
    catalogReturnRef.current = isCatalogList ? subPath : null;
  }, [activeView, selectedJob, isCatalogList, subPath]);

  const setSelectedJob = useCallback(
    (job: SavedRecipe | null) => {
      if (job) {
        if (!history.some((j) => j.recipeId === job.recipeId)) {
          registerExtraRecipe(job.recipeId, job);
        }
        navigate('history', job.recipeId);
      } else {
        navigate('history', catalogReturnRef.current);
      }
    },
    [navigate, history, registerExtraRecipe]
  );

  const navigateCatalog = useCallback(
    (catalogSubPath?: string | null) => {
      navigate('history', catalogSubPath ?? null);
    },
    [navigate]
  );

  const {
    shoppingList,
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
    clearChecked,
    restoreItems,
    restoreList,
  } = useShoppingList();

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
    claimRewardedCredit,
  } = useRecipeExtraction(getAccessToken, handleExtractionSuccess);

  const [extractMode, setExtractMode] = useState<ExtractMode>('link');
  const { jobs: extractionJobs } = useExtractionJobs();
  const runningExtractions = extractionJobs.filter((j) => j.status !== 'completed' && j.status !== 'failed');
  const latestRunning = runningExtractions.length ? runningExtractions[runningExtractions.length - 1] : null;
  const isViewingRecipe = !!selectedJob || (activeView === 'extract' && !!recipe);

  const lastHistorySubPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeView === 'history') {
      lastHistorySubPathRef.current = subPath;
    }
  }, [activeView, subPath]);

  // Handle native integrations & deep links
  useAppNativeListeners({
    user,
    authLoading,
    getAccessToken,
    activeView,
    subPath,
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
  });

  // Handle billing & interstitial ads
  useAppAds({
    user,
    authLoading,
    isPremium,
    isPending,
    recipe,
    showOnboarding,
  });

  useMobileNavigationBack(activeView === 'extract' && !!recipe, () => {
    setRecipe(null);
    setUrl('');
    navigate('extract');
  });

  const authSettledRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    const currentId = user?.id ?? null;
    if (!authSettledRef.current) {
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

  useEffect(() => {
    if (!authLoading && user && activeView === 'extract') {
      fetchLimitStatus();
    }
  }, [activeView, user, authLoading, fetchLimitStatus]);

  useEffect(() => {
    hideSplashScreen();
  }, []);

  const handleFormSubmit = (e: React.FormEvent, overrideUrl?: string) => {
    e.preventDefault();
    if (extractMode === 'photo') {
      triggerPhotoExtraction();
      return;
    }
    triggerExtraction(overrideUrl ?? url);
  };

  const [splashFinished, setSplashFinished] = useState(false);
  const [emergencyReady, setEmergencyReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEmergencyReady(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const isAppReady = !authLoading && (!user || historyLoaded || emergencyReady);

  useEffect(() => {
    preloadSecondaryChunks();
  }, []);

  useEffect(() => {
    if (!user) return;
    const preMountTimer = setTimeout(() => {
      setVisitedViews((prev) => new Set([...prev, 'meal-planner', 'shopping-list', 'settings', 'progress']));
    }, 400);
    return () => clearTimeout(preMountTimer);
  }, [user]);

  return (
    <>
      {!splashFinished && (
        <AppSplashScreen
          isReady={isAppReady}
          onFinished={() => setSplashFinished(true)}
        />
      )}

      {!authLoading && !user && (
        showOnboarding ? (
          <Suspense fallback={null}>
            <WelcomeGuide onClose={completeOnboarding} />
          </Suspense>
        ) : (
          <AuthForm />
        )
      )}

      {user && (
        <div className="min-h-screen flex flex-col items-center transition-colors duration-300">
          <AppTopBanners activeView={activeView} isPending={isPending} recipe={recipe} />

      <main
        className={`w-full max-w-md mx-auto px-4 mt-1 flex-1 flex flex-col gap-6 ${
          activeView === 'extract' && isPending && !recipe
            ? 'pb-6 my-auto justify-center'
            : isViewingRecipe || (activeView === 'history' && isCatalogSelectMode)
              ? 'pb-48'
              : !isPremium && activeView !== 'settings'
                ? 'pb-44'
                : 'pb-24'
        } ${!isViewingRecipe ? 'pt-4' : ''}`}
      >
        {!(isPending && !isPremium) && !isViewingRecipe && (
          <TrialBanner onOpenPremium={() => setIsPremiumModalOpen(true)} />
        )}

        {!(isPending && !isPremium) && !isViewingRecipe && (
          <NotificationPrompt savedCount={history.length} />
        )}

        {/* EXTRACT TAB */}
        <div
          hidden={activeView !== 'extract'}
          aria-hidden={activeView !== 'extract' || undefined}
          className={
            activeView === 'extract'
              ? `flex-1 flex flex-col min-h-0 ${isPending ? 'justify-center my-auto' : ''}`
              : ''
          }
        >
          {recipe ? (
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
                shoppingListCount={aggregatedList.toBuy.length + aggregatedList.inPantry.length}
                onRemixSuccess={(newRecipe) => setRecipe(newRecipe)}
                onReplaceCurrent={(newRecipe) => {
                  setRecipe(newRecipe);
                  fetchHistory();
                }}
                isParentAvailable={
                  recipe?.parentRecipeId
                    ? history.some((j) => j.recipeId === recipe?.parentRecipeId)
                    : false
                }
                parentRecipeTitle={
                  recipe?.parentRecipeTitle ||
                  (recipe?.parentRecipeId
                    ? history.find((j) => j.recipeId === recipe.parentRecipeId)?.recipe?.title
                    : null)
                }
                onNavigateToRecipe={async (recipeId, remixRecipe) => {
                  const parentJob = history.find((j) => j.recipeId === recipeId);
                  if (parentJob) {
                    navigate('history', parentJob.recipeId);
                    setRecipe(null);
                    setUrl('');
                    return;
                  }
                  if (remixRecipe) {
                    setRecipe(remixRecipe);
                    return;
                  }
                  try {
                    const token = await getAccessToken();
                    if (token) {
                      const res = await fetch(apiUrl(`/api/recipes/${recipeId}`), {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.recipe) {
                          setRecipe(data.recipe);
                        }
                      }
                    }
                  } catch (err) {
                    console.error('[App] Failed to load recipe:', err);
                  }
                }}
              />
            </Suspense>
          ) : latestRunning ? (
            <div className="flex flex-col gap-6">
              <ExtractionAnimation
                key={latestRunning.id}
                url={latestRunning.sourceLabel}
                isPending
                jobStatus={latestRunning.status}
                progress={latestRunning.progress}
                variant={latestRunning.mode === 'photo' ? 'photo' : 'link'}
              />
              <ActiveExtractions excludeId={latestRunning.id} />
              <ErrorBanner
                isPending={false}
                jobStatus={jobStatus}
                jobError={jobError}
                jobErrorCode={jobErrorCode}
                jobErrorParams={jobErrorParams}
                onRetry={() =>
                  extractMode === 'photo' ? triggerPhotoExtraction() : triggerExtraction(url)
                }
              />
            </div>
          ) : (
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
                extractionJobs.length > 0 ||
                (jobStatus === 'failed' && jobErrorCode !== 'RATE_LIMIT_EXCEEDED') ? (
                  <div className="flex flex-col gap-3">
                    {extractionJobs.length > 0 && <ActiveExtractions />}
                    <ErrorBanner
                      isPending={isPending}
                      jobStatus={jobStatus}
                      jobError={jobError}
                      jobErrorCode={jobErrorCode}
                      jobErrorParams={jobErrorParams}
                      onRetry={() =>
                        extractMode === 'photo' ? triggerPhotoExtraction() : triggerExtraction(url)
                      }
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
              shoppingListCount={aggregatedList.toBuy.length + aggregatedList.inPantry.length}
              onRemixSuccess={async (newRecipe, newJobId) => {
                if (newRecipe && newJobId) {
                  registerExtraRecipe(newJobId, {
                    recipeId: newJobId,
                    recipe: newRecipe,
                    source: 'remix',
                    addedAt: newRecipe.createdAt || new Date().toISOString(),
                    updatedAt: newRecipe.updatedAt || new Date().toISOString(),
                    isFavorite: false,
                    flags: [],
                    collectionIds: [],
                  });
                }
                await fetchHistory();
                if (newJobId) {
                  navigate('history', newJobId);
                } else {
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
          )}
        </div>

        {/* MEAL PLANNER TAB */}
        <div
          hidden={activeView !== 'meal-planner'}
          aria-hidden={activeView !== 'meal-planner' || undefined}
          className={activeView === 'meal-planner' ? 'flex-1 flex flex-col min-h-0' : ''}
        >
          {visitedViews.has('meal-planner') && (
            <Suspense fallback={<ViewFallback />}>
              <MealPlannerView
                history={history}
                onSelectRecipe={(recipeId) => {
                  navigate('history', recipeId);
                }}
                addRecipeIngredients={addRecipeIngredients}
              />
            </Suspense>
          )}
        </div>

        {/* SHOPPING LIST TAB */}
        <div
          hidden={activeView !== 'shopping-list'}
          aria-hidden={activeView !== 'shopping-list' || undefined}
          className={activeView === 'shopping-list' ? 'flex-1 flex flex-col min-h-0' : ''}
        >
          {visitedViews.has('shopping-list') && (
            <Suspense fallback={<ViewFallback />}>
              <ShoppingList
                shoppingList={shoppingList}
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
                restoreItems={restoreItems}
                restoreList={restoreList}
              />
            </Suspense>
          )}
        </div>

        {/* PROFILE & GAMIFICATION TAB (Progress + Settings) */}
        <div
          hidden={activeView !== 'progress' && activeView !== 'settings'}
          aria-hidden={(activeView !== 'progress' && activeView !== 'settings') || undefined}
          className={(activeView === 'progress' || activeView === 'settings') ? 'flex-1 flex flex-col min-h-0' : ''}
        >
          {(visitedViews.has('progress') || visitedViews.has('settings')) && (
            <Suspense fallback={<ViewFallback />}>
              <ProfileView
                pendingInviteCode={pendingInviteCode}
                onInviteConsumed={() => setPendingInviteCode(null)}
                onSelectRecipe={(recipeId) => {
                  navigate('history', recipeId);
                }}
                defaultSection={activeView === 'settings' ? 'settings' : 'overview'}
              />
            </Suspense>
          )}
        </div>
      </main>

      <AppOverlays
        isPremiumModalOpen={isPremiumModalOpen}
        setIsPremiumModalOpen={setIsPremiumModalOpen}
        showOnboarding={showOnboarding}
        onCompleteOnboarding={() => {
          completeOnboarding();
          navigate('extract');
        }}
        showAlphaWelcome={showAlphaWelcome}
        onCompleteAlphaWelcome={completeAlphaWelcome}
      />

      <AppBottomNav
        activeView={activeView}
        isPending={isPending}
        isPremium={isPremium}
        isCatalogSelectMode={isCatalogSelectMode}
        isCatalogSheetOpen={isCatalogSheetOpen}
        isPremiumModalOpen={isPremiumModalOpen}
        uncheckedShoppingItemsCount={aggregatedList.toBuy.length + aggregatedList.inPantry.length}
        incomingRequestsCount={incomingRequestsCount}
        userLevel={userLevel}
        outstandingMealPlansCount={outstandingMealPlansCount}
        lastHistorySubPath={lastHistorySubPathRef.current}
        onNavigate={navigate}
        onFetchHistory={fetchHistory}
      />
        </div>
      )}
    </>
  );
}
