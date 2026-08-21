import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { SearchX } from 'lucide-react';
import type { SavedRecipe, Ingredient, Recipe } from '../../types';
import RecipeDetails from '../RecipeDetails';
import ShoppingConfirmSheet from '../RecipeDetails/ShoppingConfirmSheet';
import { useMobileNavigationBack } from '../../hooks/useMobileNavigationBack';
import { useI18n } from '../../context/I18nContext';
import { useSavedCatalog, EMPTY_FILTERS } from '../../hooks/useSavedCatalog';
import { useAuth } from '../../context/AuthContext';
import { useCollections } from '../../hooks/useCollections';
import { categoryOrder, legacyCategoryMap } from '../../i18n';
import PremiumModal from '../PremiumModal';
import PremiumHint from '../PremiumHint';
import CollectionSheet from './CollectionSheet';
import { FlagSheet } from './FlagSheet';

import RecipePosterCard from './RecipePosterCard';
import RecipeListItem from './RecipeListItem';
import CatalogFilters from './CatalogFilters';
import FilterSheet from './FilterSheet';
import CookbookHome from './CookbookHome';
import BulkActionBar from './BulkActionBar';
import CatalogEmptyState from './CatalogEmptyState';
import CatalogLoadingState from './CatalogLoadingState';
import { buildListRoute, isCatalogListRoute, parseListRoute, getBaseFiltersForPreset, type CatalogPreset } from './catalogRoutes';

interface SavedCatalogProps {
  history: SavedRecipe[];
  historyLoaded?: boolean;
  selectedJob: SavedRecipe | null;
  setSelectedJob: (job: SavedRecipe | null) => void;
  handleDeleteJob: (e: React.MouseEvent, id: string) => void;
  onAddIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  fetchHistory?: () => void;
  getAccessToken?: () => Promise<string | null>;
  onNavigateToShoppingList?: () => void;
  shoppingListCount?: number;
  onRemixSuccess?: (newRecipe: Recipe, newJobId?: string) => void;
  onReplaceCurrent?: (newRecipe: Recipe) => void;
  onSelectModeChange?: (active: boolean) => void;
  onOverlaySheetChange?: (isOpen: boolean) => void;
  /** Current `#/history/...` sub-path — `null` = cookbook home. */
  catalogSubPath?: string | null;
  /** Navigates within the catalog tab (`null` returns to the cookbook home). */
  onNavigateCatalog?: (subPath?: string | null) => void;
  limitStatus?: {
    limit: number;
    used: number;
    remaining: number;
    windowDays: number;
    tier: 'free' | 'alpha' | 'premium';
    savedRecipes: number;
    maxSavedRecipes: number;
    cookbookFull: boolean;
    maxConcurrent?: number;
    activeCount?: number;
  } | null;
}

export default function SavedCatalog({
  history,
  historyLoaded = true,
  selectedJob,
  setSelectedJob,
  handleDeleteJob,
  onAddIngredients,
  fetchHistory,
  getAccessToken,
  onNavigateToShoppingList,
  shoppingListCount,
  onRemixSuccess,
  onSelectModeChange,
  onOverlaySheetChange,
  catalogSubPath = null,
  onNavigateCatalog,
  limitStatus
}: SavedCatalogProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const navigateCatalog = useCallback((subPath?: string | null) => {
    if (onNavigateCatalog) onNavigateCatalog(subPath ?? null);
    else window.location.hash = subPath ? `#/history/${subPath}` : '#/history';
  }, [onNavigateCatalog]);

  // Wrapper that sets skipNextRouteSyncRef before navigating, so the route-sync
  // effect doesn't reset filters that were just applied by the user.
  const navigateCatalogSkipSync = useCallback((subPath?: string | null) => {
    skipNextRouteSyncRef.current = true;
    navigateCatalog(subPath ?? null);
  }, [navigateCatalog]);

  // Which of the three catalog levels is showing
  const isListLevel = !selectedJob && isCatalogListRoute(catalogSubPath);
  const preset = useMemo(() => parseListRoute(catalogSubPath), [catalogSubPath]);

  // Track previous isListLevel to detect transitions from list → home
  const prevIsListLevelRef = useRef(isListLevel);
  const justNavigatedBackFromList = prevIsListLevelRef.current && !isListLevel;
  useEffect(() => {
    prevIsListLevelRef.current = isListLevel;
  }, [isListLevel]);

  // Swipe-back / mobile back out of the detail view returns to whichever level
  // the recipe was opened from — the list route, or `null` for the cookbook
  // home. Frozen while a recipe is open so the detail route can't overwrite it.
  const listRouteBeforeDetailRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedJob) return;
    listRouteBeforeDetailRef.current = isCatalogListRoute(catalogSubPath) ? catalogSubPath : null;
  }, [selectedJob, catalogSubPath]);

  useMobileNavigationBack(!!selectedJob, () => {
    navigateCatalog(listRouteBeforeDetailRef.current);
  });
  useMobileNavigationBack(isListLevel, () => {
    navigateCatalog(null);
  });

  // Custom hook to manage the complex state, long-press, filters, and actions
  const {
    completedJobs,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    activeFilterCount,
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    filteredJobs,
    countMatches,
    formatTotalTime,
    getRecipeTags,
    bindLongPress,
    handleCardClick,
    getBulkShoppingJobs,
    handleBulkDelete,
    sortBy,
    setSortBy,
    allFlags,
    toggleFavorite,
    setRecipeFlags,
    assignCollections,
    shelves,
    jobsByCollection,
    jobsByFlag,
    favoriteJobs,
    markOpened
  } = useSavedCatalog({
    history,
    setSelectedJob,
    onAddIngredients,
    fetchHistory,
    getAccessToken,
    onSelectModeChange
  });

  const { collections, refreshCollections } = useCollections();

  // Always read selectedJob from completedJobs so all optimistic overrides
  // (isFavorite, flags, collectionIds) are immediately reflected in the UI
  // without waiting for a history re-fetch.
  const selectedJobResolved = selectedJob
    ? (completedJobs.find(j => j.recipeId === selectedJob.recipeId) ?? selectedJob)
    : null;
  const [isCollectionSheetOpen, setIsCollectionSheetOpen] = useState(false);
  const [collectionSheetJob, setCollectionSheetJob] = useState<SavedRecipe | undefined>(undefined);
  const [collectionSheetBulkJobs, setCollectionSheetBulkJobs] = useState<SavedRecipe[]>([]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Bulk shopping: sequential per-recipe ShoppingConfirmSheet queue
  const [bulkShoppingQueue, setBulkShoppingQueue] = useState<SavedRecipe[]>([]);
  const [bulkShoppingTotal, setBulkShoppingTotal] = useState(0);
  const [bulkShoppingAdded, setBulkShoppingAdded] = useState(0);
  const currentBulkShoppingJob = bulkShoppingQueue[0] ?? null;

  // FlagSheet states
  const [isFlagSheetOpen, setIsFlagSheetOpen] = useState(false);
  const [flagSheetJob, setFlagSheetJob] = useState<SavedRecipe | null>(null);

  const isAnySheetOpen = isFilterSheetOpen || isCollectionSheetOpen || isFlagSheetOpen || !!currentBulkShoppingJob;
  useEffect(() => {
    onOverlaySheetChange?.(isAnySheetOpen);
  }, [isAnySheetOpen, onOverlaySheetChange]);

  // Memoize all distinct flags in catalog to pass as suggestions
  const allExistingFlags = useMemo(() => {
    return Array.from(new Set(completedJobs.flatMap(j => j.flags || [])));
  }, [completedJobs]);

  const listTitle = useMemo(() => {
    switch (preset.kind) {
      case 'favorites':
        return t('catalog.favoritesFilter');
      case 'quick':
        return t('catalog.shelfQuick');
      case 'recent':
        return t('catalog.shelfRecent');
      case 'recommended':
        return shelves.recommended?.title ?? t('catalog.shelfRecommended');
      case 'collection': {
        const col = collections.find(c => c.id === preset.id);
        return col ? `${col.emoji ? col.emoji + ' ' : ''}${col.name}` : t('catalog.allRecipesTitle');
      }
      case 'flag':
        return preset.name;
      case 'search':
        return t('catalog.allRecipesTitle');
      default:
        return t('catalog.allRecipesTitle');
    }
  }, [preset, collections, t]);

  // Collections are now auto-fetched by useCollections() in parallel with
  // fetchHistory (triggered as soon as auth settles). refreshCollections() is
  // still available for explicit refreshes (e.g. after create/delete).

  // Record recency centrally so deep links and notification taps count too.
  useEffect(() => {
    if (selectedJob) markOpened(selectedJob.recipeId);
  }, [selectedJob?.recipeId, markOpened]);

  // Seed search/filters/sort from the route preset whenever the list level is
  // entered with a different preset. Tracked by ref so the user's own edits
  // inside the sheet are never clobbered by a re-render.
  const appliedRouteRef = useRef<string | null>(null);
  const skipNextRouteSyncRef = useRef(false);
  useEffect(() => {
    if (!isCatalogListRoute(catalogSubPath)) {
      // Navigating back to home: reset filters and search
      appliedRouteRef.current = null;
      setFilters(EMPTY_FILTERS);
      setSearchQuery('');
      setSortBy('newest');
      return;
    }
    if (appliedRouteRef.current === catalogSubPath) return;
    // Skip route sync when navigation was triggered by a filter change
    if (skipNextRouteSyncRef.current) {
      skipNextRouteSyncRef.current = false;
      appliedRouteRef.current = catalogSubPath ?? null;
      return;
    }
    appliedRouteRef.current = catalogSubPath ?? null;

    if (preset.kind !== 'search') {
      setSearchQuery('');
      setFilters(getBaseFiltersForPreset(preset));
      setSortBy(preset.kind === 'recent' ? 'recent' : 'newest');
    }
  }, [catalogSubPath, preset, setFilters, setSearchQuery, setSortBy]);

  // Automatically transition to the list level (Level 2) if search query
  // or active filter count becomes greater than 0 while on Cookbook Home (Level 1).
  // Nur auslösen, wenn wir NICHT im Detail-View sind (selectedJob ist null)
  // und wenn wir NICHT gerade von der Liste zurück zur Home navigiert haben.
  useEffect(() => {
    if (justNavigatedBackFromList) return; // Don't auto-transition when navigating back from list to home
    if (!isListLevel && !selectedJob && (searchQuery || activeFilterCount > 0)) {
      navigateCatalogSkipSync(buildListRoute({ kind: 'search' }));
    }
  }, [isListLevel, selectedJob, searchQuery, activeFilterCount, navigateCatalogSkipSync, justNavigatedBackFromList]);

  const openList = useCallback((target: CatalogPreset) => {
    navigateCatalog(buildListRoute(target));
  }, [navigateCatalog]);

  const handleAddCollectionClick = () => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
    } else {
      // Open directly in "create" mode — no checkbox list, since there's no
      // pre-existing recipe assignment context.
      setCollectionSheetJob(undefined);
      setCollectionSheetBulkJobs([]);
      setIsCollectionSheetOpen(true);
    }
  };

  const handleBulkAddToShoppingListClick = () => {
    const jobs = getBulkShoppingJobs();
    if (jobs.length === 0) return;
    setBulkShoppingTotal(jobs.length);
    setBulkShoppingAdded(0);
    setBulkShoppingQueue(jobs);
  };

  const handleBulkShoppingConfirm = (items: Ingredient[]) => {
    const job = bulkShoppingQueue[0];
    if (!job || !onAddIngredients) return;
    if (items.length > 0) {
      onAddIngredients(items, job.recipeId, job.recipe!.title);
      setBulkShoppingAdded(prev => prev + 1);
    }
    // NOTE: onClose() is called by ShoppingConfirmSheet after onConfirm(),
    // which triggers handleBulkShoppingClose → advances the queue.
    // Do NOT call setBulkShoppingQueue here or every other recipe is skipped.
  };

  const handleBulkShoppingClose = () => {
    setBulkShoppingQueue(prev => prev.slice(1));
  };

  // Exit select mode once the whole queue is done and at least one recipe was added.
  const prevBulkQueueLenRef = useRef(0);
  useEffect(() => {
    if (prevBulkQueueLenRef.current > 0 && bulkShoppingQueue.length === 0 && bulkShoppingAdded > 0) {
      setIsSelectMode(false);
      setSelectedIds(new Set());
    }
    prevBulkQueueLenRef.current = bulkShoppingQueue.length;
  }, [bulkShoppingQueue.length, bulkShoppingAdded, setIsSelectMode, setSelectedIds]);

  const handleBulkAddToCollectionClick = () => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
    } else {
      setCollectionSheetJob(undefined);
      // Pass the FULL SavedRecipe objects (not just IDs) so the sheet can pre-check the
      // intersection of their memberships and support per-recipe add/remove.
      setCollectionSheetBulkJobs(completedJobs.filter(j => selectedIds.has(j.recipeId)));
      setIsCollectionSheetOpen(true);
    }
  };

  const handleAssignCollectionsClick = (job: SavedRecipe) => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
    } else {
      setCollectionSheetJob(job);
      setCollectionSheetBulkJobs([]);
      setIsCollectionSheetOpen(true);
    }
  };

  const handleManageFlagsClick = async (job: SavedRecipe) => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }
    setFlagSheetJob(job);
    setIsFlagSheetOpen(true);
  };

  const maxSavedRecipes = limitStatus?.maxSavedRecipes ?? 5;
  const isCookbookFull = maxSavedRecipes >= 0 && completedJobs.length >= maxSavedRecipes;
  const isCookbookAlmostFull = maxSavedRecipes >= 0 && completedJobs.length >= maxSavedRecipes - 1;

  const premiumBanner = !isPremium && isCookbookAlmostFull && (
    <PremiumHint
      variant="banner"
      onClick={() => setIsPremiumModalOpen(true)}
      label={
        isCookbookFull
          ? t('premium.hint.catalogFull', { count: completedJobs.length, limit: maxSavedRecipes })
          : t('premium.hint.catalogAlmostFull', { count: completedJobs.length, limit: maxSavedRecipes })
      }
      cta={t('premium.hint.upgrade')}
    />
  );

  // ---------------------------------------------------------------------------
  // Level 3: recipe detail
  // ---------------------------------------------------------------------------
  if (selectedJobResolved) {
    return (
      <div className="flex flex-col gap-4">
        {selectedJobResolved.recipe && (
          <RecipeDetails
            key={selectedJobResolved.recipeId}
            recipe={selectedJobResolved.recipe}
            onAddIngredients={onAddIngredients}
            onDelete={() => handleDeleteJob({ stopPropagation: () => { } } as any, selectedJobResolved.recipeId)}
            reelUrl={selectedJobResolved.recipe.sourceUrl ?? ''}
            createdAt={selectedJobResolved.addedAt}
            onBack={() => navigateCatalog(listRouteBeforeDetailRef.current)}
            flags={selectedJobResolved.flags}
            onNavigateToShoppingList={onNavigateToShoppingList}
            shoppingListCount={shoppingListCount}
            onRemixSuccess={onRemixSuccess}
            onReplaceCurrent={() => {
              fetchHistory?.();
            }}
            isParentAvailable={selectedJobResolved.recipe?.parentRecipeId ? history.some(j => j.recipeId === selectedJobResolved.recipe?.parentRecipeId) : false}
            parentRecipeTitle={selectedJobResolved.recipe?.parentRecipeTitle || (selectedJobResolved.recipe?.parentRecipeId ? history.find(j => j.recipeId === selectedJobResolved.recipe?.parentRecipeId)?.recipe?.title : null)}
            onNavigateToRecipe={(recipeId) => {
              const parentJob = history.find(j => j.recipeId === recipeId);
              if (parentJob) {
                setSelectedJob(parentJob);
              }
            }}
            onAssignCollections={() => handleAssignCollectionsClick(selectedJobResolved)}
            onManageFlags={() => handleManageFlagsClick(selectedJobResolved)}
            isFavorite={selectedJobResolved.isFavorite}
            onToggleFavorite={() => toggleFavorite(selectedJobResolved)}
          />
        )}

        <CollectionSheet
          isOpen={isCollectionSheetOpen}
          onClose={() => setIsCollectionSheetOpen(false)}
          job={collectionSheetJob}
          selectedJobs={collectionSheetBulkJobs}
          initialMode={!collectionSheetJob && collectionSheetBulkJobs.length === 0 ? 'manage' : 'assign'}
          onAssign={assignCollections}
          onUpdated={() => refreshCollections()}
        />
        <FlagSheet
          isOpen={isFlagSheetOpen}
          onClose={() => setIsFlagSheetOpen(false)}
          job={flagSheetJob}
          allExistingFlags={allExistingFlags}
          onSave={async (j, flags) => {
            await setRecipeFlags(j, flags);
          }}
        />
        <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty / loading
  // ---------------------------------------------------------------------------
  if (completedJobs.length === 0) {
    return !historyLoaded ? <CatalogLoadingState /> : <CatalogEmptyState />;
  }

  const sheets = (
    <>
      <CollectionSheet
        isOpen={isCollectionSheetOpen}
        onClose={() => setIsCollectionSheetOpen(false)}
        job={collectionSheetJob}
        selectedJobs={collectionSheetBulkJobs}
        initialMode={
          !collectionSheetJob && collectionSheetBulkJobs.length === 0
            ? 'manage'
            : 'assign'
        }
        onAssign={assignCollections}
        onUpdated={() => refreshCollections()}
      />

      <FlagSheet
        isOpen={isFlagSheetOpen}
        onClose={() => setIsFlagSheetOpen(false)}
        job={flagSheetJob}
        allExistingFlags={allExistingFlags}
        onSave={async (j, flags) => {
          await setRecipeFlags(j, flags);
        }}
      />

      <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />
    </>
  );

  // ---------------------------------------------------------------------------
  // Level 1 & 2: Unified Layout
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      <CatalogFilters
        title={isListLevel ? listTitle : t('catalog.myCookbookTitle')}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        autoFocusSearch={isListLevel && preset.kind === 'search'}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filters={filters}
        setFilters={setFilters}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setIsFilterSheetOpen(true)}
        collections={collections}
        isSelectMode={isSelectMode}
        setIsSelectMode={(active) => {
          setIsSelectMode(active);
          if (!active) setSelectedIds(new Set());
        }}
        onBack={isListLevel ? () => navigateCatalog(null) : undefined}
        resultCount={isListLevel ? filteredJobs.length : completedJobs.length}
        sortBy={sortBy}
        showViewModeToggle={isListLevel}
        catalogSubPath={catalogSubPath}
        onNavigateCatalog={navigateCatalogSkipSync}
      />

      {premiumBanner}

      {!isListLevel ? (
        <CookbookHome
          totalRecipes={completedJobs.length}
          collections={collections}
          jobsByCollection={jobsByCollection}
          jobsByFlag={jobsByFlag}
          favoriteJobs={favoriteJobs}
          shelves={shelves}
          allFlags={allFlags}
          formatTotalTime={formatTotalTime}
          onOpenList={openList}
          onOpenRecipe={(e, job) => handleCardClick(e, job)}
          onAddCollection={handleAddCollectionClick}
          onManageCollections={handleAddCollectionClick}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 text-center py-14 px-6">
          <SearchX className="w-9 h-9 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            {t('catalog.noMatches')}
          </p>
          {(activeFilterCount > 0 || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setSearchQuery('');
                if (preset.kind !== 'all' && preset.kind !== 'search') {
                  navigateCatalog(buildListRoute({ kind: 'all' }));
                }
              }}
              className="px-4 py-2 text-xs font-bold rounded-full bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
            >
              {t('catalog.resetFilters')}
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-2 gap-3 py-1">
          {filteredJobs.map(job => (
            <RecipePosterCard
              key={job.recipeId}
              job={job}
              totalTime={formatTotalTime(job.recipe!)}
              isSelected={selectedIds.has(job.recipeId)}
              isSelectMode={isSelectMode}
              bindLongPress={bindLongPress(job.recipeId, job)}
              onClick={(e) => handleCardClick(e, job)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredJobs.map(job => (
            <RecipeListItem
              key={job.recipeId}
              job={job}
              isSelected={selectedIds.has(job.recipeId)}
              isSelectMode={isSelectMode}
              totalTime={formatTotalTime(job.recipe!)}
              recipeTags={getRecipeTags(job.recipe!)}
              bindLongPress={bindLongPress(job.recipeId, job)}
              onClick={(e) => handleCardClick(e, job)}
            />
          ))}
        </div>
      )}

      {isSelectMode && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onCancel={() => {
            setIsSelectMode(false);
            setSelectedIds(new Set());
          }}
          onBulkAdd={handleBulkAddToShoppingListClick}
          onBulkDelete={handleBulkDelete}
          onBulkAddToCollection={handleBulkAddToCollectionClick}
        />
      )}

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        sortBy={sortBy}
        onApply={(next, nextSort) => {
          setFilters(next);
          setSortBy(nextSort);

          // If we were on Cookbook Home (Level 1), navigate to the list level so the user sees the filtered/sorted results
          if (!isListLevel) {
            navigateCatalogSkipSync(buildListRoute({ kind: 'all' }));
            return;
          }

          // If we're in a specific context (collection, favorites, quick, flag)
          // and the user changes filters, navigate to general list view so the
          // new filters apply to all recipes, not just the current context.
          if (preset.kind !== 'all' && preset.kind !== 'search') {
            navigateCatalogSkipSync(buildListRoute({ kind: 'all' }));
            return;
          }
        }}
        collections={collections}
        allFlags={allFlags}
        countMatches={countMatches}
      />

      {sheets}

      {/* Bulk shopping confirm — shown one-by-one for each selected recipe */}
      {currentBulkShoppingJob?.recipe && (() => {
        const recipe = currentBulkShoppingJob.recipe!;
        const mapped = recipe.ingredients.map((group, originalIdx) => ({ group, originalIdx }));
        const sortedIngredients = mapped.sort((a, b) => {
          const rank = (name: string) => {
            const up = name.trim().toUpperCase();
            const direct = categoryOrder.indexOf(up as any);
            if (direct !== -1) return direct;
            const key = legacyCategoryMap[name.trim().toLowerCase()];
            return key ? categoryOrder.indexOf(key) : 999;
          };
          return rank(a.group.name) - rank(b.group.name);
        });
        const formatAmount = (amount: number | undefined, _unit: string | undefined) => {
          if (!amount) return '';
          const r = Math.round(amount * 10) / 10;
          return r % 1 === 0 ? String(r) : r.toFixed(1);
        };
        const pos = bulkShoppingTotal - bulkShoppingQueue.length + 1;
        const label = bulkShoppingTotal > 1
          ? `${recipe.title} (${pos}/${bulkShoppingTotal})`
          : recipe.title;
        return (
          <ShoppingConfirmSheet
            key={currentBulkShoppingJob.recipeId}
            isOpen={true}
            onClose={handleBulkShoppingClose}
            recipe={recipe}
            sortedIngredients={sortedIngredients}
            scaleFactor={1}
            formatAmount={formatAmount}
            onConfirm={handleBulkShoppingConfirm}
            recipeLabel={label}
          />
        );
      })()}
    </div>
  );
}
