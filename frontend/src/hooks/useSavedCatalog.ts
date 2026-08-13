import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Job, Ingredient, Recipe } from '../types';
import { useI18n } from '../context/I18nContext';
import { useDialog } from '../context/DialogContext';
import { deleteCachedImage } from '../utils/imageStore';
import { markRecipeOpened, pruneRecentMap, readRecentMap, type RecentMap } from '../utils/recentRecipes';
import { apiUrl } from '../api';

/**
 * Combinable filter facets. Values inside one facet are OR-ed, facets are
 * AND-ed — the standard faceted-search semantics. This replaces the old
 * single `activeFilter` string, which allowed exactly one criterion at a time.
 */
export interface CatalogFilterState {
  favoritesOnly: boolean;
  /** Max total time (prep + cook) in minutes; 0 = no time constraint. */
  maxTime: number;
  collectionIds: string[];
  flags: string[];
}

export const EMPTY_FILTERS: CatalogFilterState = {
  favoritesOnly: false,
  maxTime: 0,
  collectionIds: [],
  flags: []
};

export const TIME_FILTER_OPTIONS = [15, 30, 60] as const;

export type CatalogSort = 'newest' | 'recent' | 'title' | 'time';

/** Number of recipes shown per horizontal shelf on the cookbook home. */
export const SHELF_SIZE = 12;

/** Total prep + cook time in minutes; tolerates legacy string values. */
export function getTotalTime(recipe: Pick<Recipe, 'prepTime' | 'cookTime'> | undefined | null): number {
  if (!recipe) return 0;
  const toMinutes = (value: unknown) =>
    typeof value === 'number' ? value : (parseInt(String(value ?? ''), 10) || 0);
  return toMinutes(recipe.prepTime) + toMinutes(recipe.cookTime);
}

export function countActiveFilters(filters: CatalogFilterState): number {
  return (
    (filters.favoritesOnly ? 1 : 0) +
    (filters.maxTime > 0 ? 1 : 0) +
    filters.collectionIds.length +
    filters.flags.length
  );
}

interface UseSavedCatalogProps {
  history: Job[];
  setSelectedJob: (job: Job | null) => void;
  onAddIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  fetchHistory?: () => void;
  getAccessToken?: () => Promise<string | null>;
  onSelectModeChange?: (active: boolean) => void;
}

export function useSavedCatalog({
  history,
  setSelectedJob,
  onAddIngredients,
  fetchHistory,
  getAccessToken,
  onSelectModeChange
}: UseSavedCatalogProps) {
  const dialog = useDialog();
  const { t, language } = useI18n();

  const [optimisticFavorites, setOptimisticFavorites] = useState<Record<string, boolean>>({});
  const [optimisticFlags, setOptimisticFlags] = useState<Record<string, string[]>>({});
  const [optimisticCollections, setOptimisticCollections] = useState<Record<string, string[]>>({});

  const completedJobs = useMemo(() => {
    return history
      .filter(h => h.status === 'completed' && h.recipe)
      .map(job => ({
        ...job,
        isFavorite: optimisticFavorites[job.id] !== undefined ? optimisticFavorites[job.id] : (job.isFavorite ?? false),
        flags: optimisticFlags[job.id] !== undefined ? optimisticFlags[job.id] : (job.flags ?? []),
        collectionIds: optimisticCollections[job.id] !== undefined ? optimisticCollections[job.id] : (job.collectionIds ?? [])
      }));
  }, [history, optimisticFavorites, optimisticFlags, optimisticCollections]);


  // View Layout mode: 'card' (2-column poster grid) or 'compact' (dense rows),
  // persisted in localStorage
  const [viewMode, setViewMode] = useState<'card' | 'compact'>(() => {
    return (localStorage.getItem('recipe_catalog_view') as 'card' | 'compact') || 'card';
  });

  useEffect(() => {
    localStorage.setItem('recipe_catalog_view', viewMode);
  }, [viewMode]);

  // Search query & combinable filter facets (both ephemeral by design — a
  // filter that silently survives an app restart is a classic "where are my
  // recipes?" trap).
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_FILTERS);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Sorting state persisted to localStorage
  const [sortBy, setSortBy] = useState<CatalogSort>(() => {
    const stored = localStorage.getItem('recipe_catalog_sort');
    return (['newest', 'recent', 'title', 'time'] as const).includes(stored as CatalogSort)
      ? (stored as CatalogSort)
      : 'newest';
  });

  useEffect(() => {
    localStorage.setItem('recipe_catalog_sort', sortBy);
  }, [sortBy]);

  // "Recently opened" tracking (localStorage, see utils/recentRecipes.ts)
  const [recentMap, setRecentMap] = useState<RecentMap>(() => readRecentMap());

  const markOpened = useCallback((jobId: string) => {
    setRecentMap(markRecipeOpened(jobId));
  }, []);

  // Drop entries for deleted recipes once the history has loaded.
  useEffect(() => {
    if (completedJobs.length === 0) return;
    setRecentMap(pruneRecentMap(new Set(completedJobs.map(j => j.id))));
  }, [completedJobs]);

  // Derive unique flags from completed recipes
  const allFlags = useMemo(() => {
    const flagsSet = new Set<string>();
    completedJobs.forEach(job => {
      if (job.flags) {
        job.flags.forEach((flag: string) => {
          flagsSet.add(flag.trim());
        });
      }
    });
    return Array.from(flagsSet);
  }, [completedJobs]);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Notify parent of select mode changes (only when value actually changes)
  const prevSelectModeRef = useRef(isSelectMode);
  useEffect(() => {
    if (prevSelectModeRef.current !== isSelectMode) {
      prevSelectModeRef.current = isSelectMode;
      onSelectModeChange?.(isSelectMode);
    }
  }, [isSelectMode, onSelectModeChange]);

  // Direct shopping list addition success states (mapping job.id -> isAdded)
  const [addedRecipeIds, setAddedRecipeIds] = useState<Record<string, boolean>>({});

  // Pointer/Long press logic
  const longPressTimeout = useRef<Record<string, any>>({});
  const pressStartTime = useRef<number>(0);
  const wasLongPressed = useRef<boolean>(false);

  // Format prep and cook time helper supporting both legacy string values and new number values
  const formatTimeValue = (time: any) => {
    if (time === undefined || time === null || time === '') return 'N/A';
    if (typeof time === 'number') {
      return t('recipe.minutes', { count: time });
    }
    const strTime = String(time).trim();
    const match = strTime.match(/\d+/);
    if (match) {
      return t('recipe.minutes', { count: match[0] });
    }
    return strTime;
  };

  /** Total time rendered for the compact cards ("35 Min."), or null if unknown. */
  const formatTotalTime = (recipe: any): string | null => {
    const total = getTotalTime(recipe);
    return total > 0 ? t('recipe.minutes', { count: total }) : null;
  };

  // Fallback tagging logic for old recipes in the database
  // Programmatic duration badge calculation (Frontend only)
  const getDurationBadge = (recipe: any): string | null => {
    const totalTime = getTotalTime(recipe);
    if (totalTime > 0) {
      if (totalTime < 15) {
        return t('catalog.under15');
      } else if (totalTime < 30) {
        return t('catalog.under30');
      }
    }
    return null;
  };

  // Get recipe tags sanitized of any time-based tags
  const getRecipeTags = (recipe: any): string[] => {
    const rawTags = recipe.tags || [];
    return rawTags.filter((tag: string) => {
      const trimmedTag = tag.trim().toLowerCase();
      return !(trimmedTag.includes('min') || trimmedTag.startsWith('<') || trimmedTag.startsWith('unter'));
    });
  };

  // Collect all unique tags dynamically (actual + fallback, filtering out time-based tags)
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    completedJobs.forEach(job => {
      if (job.recipe) {
        getRecipeTags(job.recipe).forEach((tag: string) => {
          const trimmedTag = tag.trim();
          const isTimeTag = trimmedTag.toLowerCase().includes('min') || trimmedTag.startsWith('<') || trimmedTag.toLowerCase().startsWith('unter');
          if (!isTimeTag) {
            tagsSet.add(trimmedTag);
          }
        });
      }
    });
    return Array.from(tagsSet);
  }, [completedJobs, language]);

  /** Applies the current sort order to any job subset. */
  const sortJobs = useCallback((jobs: Job[], order: CatalogSort): Job[] => {
    return [...jobs].sort((a, b) => {
      if (order === 'title') {
        return (a.recipe?.title || '').localeCompare(b.recipe?.title || '', language);
      }
      if (order === 'time') {
        return getTotalTime(a.recipe) - getTotalTime(b.recipe);
      }
      if (order === 'recent') {
        const aSeen = recentMap[a.id] ?? 0;
        const bSeen = recentMap[b.id] ?? 0;
        // Never-opened recipes sink to the bottom, ordered by save date.
        if (aSeen !== bSeen) return bSeen - aSeen;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // default: 'newest'
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [language, recentMap]);

  /** Free-text match over title, description, tags and ingredient names. */
  const matchesSearch = useCallback((job: Job, query: string): boolean => {
    if (!query) return true;
    const r = job.recipe!;
    const needle = query.toLowerCase();
    if (r.title.toLowerCase().includes(needle)) return true;
    if ((r.description || '').toLowerCase().includes(needle)) return true;
    if (getRecipeTags(r).some((tag: string) => tag.toLowerCase().includes(needle))) return true;
    if (job.flags?.some(flag => flag.toLowerCase().includes(needle))) return true;
    return r.ingredients?.some(group =>
      group.items?.some(ing => ing.name.toLowerCase().includes(needle))
    ) || false;
  }, []);

  /** Applies the search query plus an arbitrary facet set (unsorted). */
  const applyFilters = useCallback((facets: CatalogFilterState, query: string): Job[] => {
    return completedJobs.filter(job => {
      if (!matchesSearch(job, query)) return false;

      if (facets.favoritesOnly && job.isFavorite !== true) return false;

      if (facets.maxTime > 0) {
        const total = getTotalTime(job.recipe);
        if (total <= 0 || total > facets.maxTime) return false;
      }

      if (facets.collectionIds.length > 0) {
        const ids = job.collectionIds ?? [];
        if (!facets.collectionIds.some(id => ids.includes(id))) return false;
      }

      if (facets.flags.length > 0) {
        const flags = job.flags ?? [];
        if (!facets.flags.some(flag => flags.includes(flag))) return false;
      }

      return true;
    });
  }, [completedJobs, matchesSearch]);

  // Filter jobs: search AND every active facet, then sort
  const filteredJobs = useMemo(
    () => sortJobs(applyFilters(filters, searchQuery.trim().toLowerCase()), sortBy),
    [applyFilters, filters, searchQuery, sortBy, sortJobs]
  );

  /** Live result count for a draft facet set — drives the filter sheet's CTA. */
  const countMatches = useCallback(
    (facets: CatalogFilterState) => applyFilters(facets, searchQuery.trim().toLowerCase()).length,
    [applyFilters, searchQuery]
  );

  // ---------------------------------------------------------------------------
  // Shelves for the cookbook home (level 1)
  // ---------------------------------------------------------------------------

  /** `{ items, total }` per shelf — `items` is capped, `total` drives "show all (N)". */
  const shelves = useMemo(() => {
    const favorites = completedJobs.filter(j => j.isFavorite);
    const quick = completedJobs.filter(j => {
      const total = getTotalTime(j.recipe);
      return total > 0 && total <= 30;
    });
    const opened = completedJobs.filter(j => recentMap[j.id]);

    return {
      recent: { items: sortJobs(opened, 'recent').slice(0, SHELF_SIZE), total: opened.length },
      favorites: { items: sortJobs(favorites, 'newest').slice(0, SHELF_SIZE), total: favorites.length },
      quick: { items: sortJobs(quick, 'time').slice(0, SHELF_SIZE), total: quick.length },
      newest: { items: sortJobs(completedJobs, 'newest').slice(0, SHELF_SIZE), total: completedJobs.length }
    };
  }, [completedJobs, recentMap, sortJobs]);

  /** jobId list per collection, used for the collection tiles' cover mosaic. */
  const jobsByCollection = useMemo(() => {
    const map: Record<string, Job[]> = {};
    // Newest first so a collection's cover reflects what was added last.
    sortJobs(completedJobs, 'newest').forEach(job => {
      (job.collectionIds ?? []).forEach(id => {
        (map[id] ||= []).push(job);
      });
    });
    return map;
  }, [completedJobs, sortJobs]);


  // Helper to check if event target is inside an interactive element
  const isInteractiveTarget = (target: HTMLElement) => {
    return !!target.closest('button, a, [role="button"]');
  };

  // Long press event handlers
  const handlePointerDown = (e: React.PointerEvent, jobId: string) => {
    if (isInteractiveTarget(e.target as HTMLElement)) {
      return;
    }
    pressStartTime.current = Date.now();
    wasLongPressed.current = false;
    longPressTimeout.current[jobId] = setTimeout(() => {
      setIsSelectMode(true);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      wasLongPressed.current = true;
    }, 600);
  };

  const handlePointerUp = (e: React.PointerEvent, job: Job) => {
    if (isInteractiveTarget(e.target as HTMLElement)) {
      return;
    }
    if (longPressTimeout.current[job.id]) {
      clearTimeout(longPressTimeout.current[job.id]);
      delete longPressTimeout.current[job.id];
    }
    const pressDuration = Date.now() - pressStartTime.current;
    if (pressDuration >= 600) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handlePointerLeave = (jobId: string) => {
    if (longPressTimeout.current[jobId]) {
      clearTimeout(longPressTimeout.current[jobId]);
      delete longPressTimeout.current[jobId];
    }
  };

  const bindLongPress = (jobId: string, job: Job) => {
    return {
      onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, jobId),
      onPointerUp: (e: React.PointerEvent) => handlePointerUp(e, job),
      onPointerLeave: () => handlePointerLeave(jobId),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  };

  const handleCardClick = (e: React.MouseEvent, job: Job) => {
    if (wasLongPressed.current) {
      wasLongPressed.current = false;
      return;
    }
    if (isInteractiveTarget(e.target as HTMLElement)) {
      return;
    }
    if (isSelectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(job.id)) {
          next.delete(job.id);
          if (next.size === 0) {
            setIsSelectMode(false);
          }
        } else {
          next.add(job.id);
        }
        return next;
      });
    } else {
      // Recency is recorded centrally in SavedCatalog once `selectedJob`
      // changes, so deep links and notification taps count too.
      setSelectedJob(job);
    }
  };

  // Direct add all ingredients of a recipe to shopping list
  const handleDirectAddToShoppingList = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    const r = job.recipe!;
    if (!onAddIngredients) return;

    const itemsToAdd: Ingredient[] = [];
    r.ingredients.forEach((group) => {
      group.items.forEach((ing) => {
        itemsToAdd.push({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit || '',
          notes: ing.notes,
          category: group.name
        });
      });
    });

    if (itemsToAdd.length === 0) return;

    onAddIngredients(itemsToAdd, job.id, r.title);

    // Checkmark success animation trigger
    setAddedRecipeIds(prev => ({ ...prev, [job.id]: true }));
    setTimeout(() => {
      setAddedRecipeIds(prev => ({ ...prev, [job.id]: false }));
    }, 2000);
  };

  // Bulk add to shopping list in Multi-Select mode.
  // Returns the selected jobs for the caller to show the per-recipe
  // ShoppingConfirmSheet sequentially — no direct add happens here.
  const getBulkShoppingJobs = (): Job[] => {
    return completedJobs.filter(j => selectedIds.has(j.id) && j.recipe);
  };


  // Bulk delete in Multi-Select mode
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const confirmed = await dialog.confirm({
      title: t('catalog.confirmBulkDeleteTitle'),
      message: t('catalog.confirmBulkDeleteMessage', { count }),
      confirmLabel: t('app.dialog.deleteRecipe.confirm'),
      cancelLabel: t('app.dialog.deleteRecipe.cancel'),
      status: 'danger'
    });

    if (!confirmed) return;

    const deletePromises = Array.from(selectedIds).map(async (id) => {
      try {
        const job = completedJobs.find(j => j.id === id);
        if (job?.recipe) {
          const r = job.recipe;
          const imagesToDelete = r.imageUrls && r.imageUrls.length > 0
            ? r.imageUrls
            : (r.imageUrl ? [r.imageUrl] : []);

          for (const imgUrl of imagesToDelete) {
            await deleteCachedImage(imgUrl);
          }
        }

        const token = getAccessToken ? await getAccessToken() : null;
        if (!token) return;
        await fetch(apiUrl(`/api/jobs/${id}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Error deleting recipe:', id, err);
      }
    });

    await Promise.all(deletePromises);
    setIsSelectMode(false);
    setSelectedIds(new Set());

    if (fetchHistory) {
      fetchHistory();
    }
  };

  // Toggle favorite status via PATCH /api/jobs/:id/favorite
  const toggleFavorite = async (job: Job) => {
    const nextVal = !job.isFavorite;
    setOptimisticFavorites(prev => ({ ...prev, [job.id]: nextVal }));

    try {
      const token = getAccessToken ? await getAccessToken() : null;
      if (!token) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(apiUrl(`/api/jobs/${job.id}/favorite`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isFavorite: nextVal })
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setOptimisticFavorites(prev => ({ ...prev, [job.id]: job.isFavorite ?? false }));
    }
  };

  // Toggle custom flag/tag via PATCH /api/jobs/:id/flags
  const toggleFlag = async (job: Job, flagName: string) => {
    const currentFlags = job.flags ?? [];
    const nextFlags = currentFlags.includes(flagName)
      ? currentFlags.filter(f => f !== flagName)
      : [...currentFlags, flagName];

    setOptimisticFlags(prev => ({ ...prev, [job.id]: nextFlags }));

    try {
      const token = getAccessToken ? await getAccessToken() : null;
      if (!token) return { success: false };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(apiUrl(`/api/jobs/${job.id}/flags`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ flags: nextFlags })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update flags');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating flag:', err);
      setOptimisticFlags(prev => ({ ...prev, [job.id]: currentFlags }));
      return { success: false, error: err.message };
    }
  };

  // Set custom flags/tags list directly via PATCH /api/jobs/:id/flags
  const setRecipeFlags = async (job: Job, nextFlags: string[]) => {
    const currentFlags = job.flags ?? [];
    setOptimisticFlags(prev => ({ ...prev, [job.id]: nextFlags }));

    try {
      const token = getAccessToken ? await getAccessToken() : null;
      if (!token) return { success: false };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(apiUrl(`/api/jobs/${job.id}/flags`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ flags: nextFlags })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update flags');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating flags:', err);
      setOptimisticFlags(prev => ({ ...prev, [job.id]: currentFlags }));
      return { success: false, error: err.message };
    }
  };


  // Assign collections via PATCH /api/jobs/:id/collections
  const assignCollections = async (jobId: string, collectionIds: string[]) => {
    const job = completedJobs.find(j => j.id === jobId);
    const currentCollectionIds = job?.collectionIds ?? [];

    setOptimisticCollections(prev => ({ ...prev, [jobId]: collectionIds }));

    try {
      const token = getAccessToken ? await getAccessToken() : null;
      if (!token) return { success: false };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(apiUrl(`/api/jobs/${jobId}/collections`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ collectionIds })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update collections');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating collections:', err);
      setOptimisticCollections(prev => ({ ...prev, [jobId]: currentCollectionIds }));
      return { success: false, error: err.message };
    }
  };

  return {
    completedJobs,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    addedRecipeIds,
    filteredJobs,
    countMatches,
    allTags,
    formatTimeValue,
    formatTotalTime,
    getDurationBadge,
    getRecipeTags,
    bindLongPress,
    handleCardClick,
    handleDirectAddToShoppingList,
    getBulkShoppingJobs,
    handleBulkDelete,
    sortBy,
    setSortBy,
    allFlags,
    toggleFavorite,
    toggleFlag,
    setRecipeFlags,
    assignCollections,
    // Shelves + recency
    shelves,
    jobsByCollection,
    recentMap,
    markOpened
  };
}
