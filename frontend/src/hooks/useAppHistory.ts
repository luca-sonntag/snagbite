import { useState, useCallback, useEffect, useRef } from 'react';
import type { SavedRecipe } from '../types';
import { apiUrl } from '../api';
import { deleteCachedImage } from '../utils/imageStore';
import { useDialog } from '../context/DialogContext';
import { useI18n } from '../context/I18nContext';
import { isCatalogListRoute } from '../components/SavedCatalog/catalogRoutes';
import type { UseAppHistoryProps } from '../types/app';



export function useAppHistory({
  user,
  authLoading,
  getAccessToken,
  activeView,
  subPath,
  navigate,
  replace,
}: UseAppHistoryProps) {
  const dialog = useDialog();
  const { t } = useI18n();

  const [history, setHistory] = useState<SavedRecipe[]>([]);
  const [extraRecipes, setExtraRecipes] = useState<Record<string, SavedRecipe>>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const newlyExtractedJobIdRef = useRef<string | null>(null);

  const registerExtraRecipe = useCallback((recipeId: string, saved: SavedRecipe) => {
    setExtraRecipes((prev) => ({ ...prev, [recipeId]: saved }));
  }, []);

  const fetchHistory = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(apiUrl('/api/recipes'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistory(data.recipes || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      clearTimeout(timeout);
      setHistoryLoaded(true);
    }
  }, [getAccessToken]);

  const handleExtractionSuccess = useCallback(
    (recipeId: string) => {
      newlyExtractedJobIdRef.current = recipeId;
      navigate('history', recipeId);
      fetchHistory();
    },
    [fetchHistory, navigate]
  );

  // Fetch history on initial user load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHistoryLoaded(true);
      return;
    }
    fetchHistory();
  }, [authLoading, user, fetchHistory]);

  // Validate current URL subPath against history and extra recipes (e.g. remixes)
  useEffect(() => {
    if (!historyLoaded) return;
    if (activeView === 'history' && subPath && !isCatalogListRoute(subPath)) {
      const existsInHistory = history.some((j) => j.recipeId === subPath);
      const existsInExtras = !!extraRecipes[subPath];

      if (existsInHistory || existsInExtras) {
        if (newlyExtractedJobIdRef.current === subPath) {
          newlyExtractedJobIdRef.current = null;
        }
        return;
      }

      // If not known in memory, attempt to fetch from API (for direct links or remixes)
      let isCancelled = false;
      const checkRecipe = async () => {
        try {
          const token = await getAccessToken();
          if (!token) {
            if (!isCancelled) replace('history');
            return;
          }
          const res = await fetch(apiUrl(`/api/recipes/${subPath}`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.recipe && !isCancelled) {
              setExtraRecipes((prev) => ({
                ...prev,
                [subPath]: {
                  recipeId: data.recipeId || subPath,
                  recipe: data.recipe,
                  source: (data.source as any) || 'remix',
                  addedAt: data.addedAt || new Date().toISOString(),
                  updatedAt: data.updatedAt || new Date().toISOString(),
                  isFavorite: data.isFavorite ?? false,
                  flags: data.flags ?? [],
                  collectionIds: data.collectionIds ?? [],
                },
              }));
              return;
            }
          }
        } catch {
          // ignore
        }
        if (!isCancelled && subPath !== newlyExtractedJobIdRef.current) {
          replace('history');
        }
      };

      void checkRecipe();
      return () => {
        isCancelled = true;
      };
    }
  }, [historyLoaded, history, extraRecipes, activeView, subPath, replace, getAccessToken]);

  const handleDeleteJob = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm({
      title: t('app.dialog.deleteRecipe.title'),
      message: t('app.dialog.deleteRecipe.message'),
      confirmLabel: t('app.dialog.deleteRecipe.confirm'),
      cancelLabel: t('app.dialog.deleteRecipe.cancel'),
      status: 'danger',
    });
    if (!confirmed) return;

    try {
      const job = history.find((j) => j.recipeId === id) || extraRecipes[id];
      if (job?.recipe) {
        const r = job.recipe;
        const imagesToDelete =
          r.imageUrls && r.imageUrls.length > 0 ? r.imageUrls : r.imageUrl ? [r.imageUrl] : [];

        for (const imgUrl of imagesToDelete) {
          await deleteCachedImage(imgUrl);
        }
      }

      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(apiUrl(`/api/recipes/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchHistory();
        setExtraRecipes((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (subPath === id) {
          if (job?.recipe?.parentRecipeId) {
            navigate('history', job.recipe.parentRecipeId);
          } else {
            navigate('history');
          }
        }
      } else {
        dialog.alert({
          title: t('app.dialog.deleteError.title'),
          message: t('app.dialog.deleteError.message'),
          status: 'danger',
        });
      }
    } catch (err) {
      console.error('Error deleting recipe:', err);
      dialog.alert({
        title: t('app.dialog.connectionError.title'),
        message: t('app.dialog.connectionError.message'),
        status: 'danger',
      });
    }
  };

  return {
    history,
    setHistory,
    extraRecipes,
    registerExtraRecipe,
    historyLoaded,
    fetchHistory,
    handleExtractionSuccess,
    handleDeleteJob,
  };
}
