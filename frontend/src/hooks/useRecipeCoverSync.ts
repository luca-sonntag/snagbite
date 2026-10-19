import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '../types';
import { apiUrl } from '../api';

export interface UseRecipeCoverSyncOptions {
  recipe: Recipe;
  getAccessToken: () => Promise<string | null>;
  onCoverUpdated?: (recipeId: string, imageUrl: string, isAiCover: boolean) => void;
}

/**
 * Listens for asynchronous AI cover completion in real-time (via SSE with HTTP polling fallback).
 * Automatically fires onCoverUpdated when the FLUX cover is generated without a page reload.
 */
export function useRecipeCoverSync({
  recipe,
  getAccessToken,
  onCoverUpdated,
}: UseRecipeCoverSyncOptions) {
  const isAwaiting = Boolean(
    !recipe.isAiCover &&
    !recipe.imageUrl &&
    (recipe.isCoverGenerating || Boolean(recipe.imagePrompt))
  );

  const [isGenerating, setIsGenerating] = useState(isAwaiting);
  const [coverUrl, setCoverUrl] = useState<string | null>(() => recipe.imageUrl || null);
  const [lastRecipeKey, setLastRecipeKey] = useState(() => `${recipe.id || ''}:${isAwaiting}:${recipe.imageUrl || ''}`);
  const activeEventSourceRef = useRef<EventSource | null>(null);
  const activePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFinishedRef = useRef(false);

  const currentRecipeKey = `${recipe.id || ''}:${isAwaiting}:${recipe.imageUrl || ''}`;
  if (currentRecipeKey !== lastRecipeKey) {
    setLastRecipeKey(currentRecipeKey);
    setIsGenerating(isAwaiting);
    if (recipe.imageUrl) {
      setCoverUrl(recipe.imageUrl);
    }
  }

  useEffect(() => {
    if (!isAwaiting || !recipe.id) {
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    isFinishedRef.current = false;
    const recipeId = recipe.id;

    const cleanup = () => {
      if (activeEventSourceRef.current) {
        activeEventSourceRef.current.close();
        activeEventSourceRef.current = null;
      }
      if (activePollingRef.current) {
        clearInterval(activePollingRef.current);
        activePollingRef.current = null;
      }
    };

    const handleSuccess = (newCoverUrl: string) => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      setCoverUrl(newCoverUrl);
      setIsGenerating(false);
      cleanup();
      onCoverUpdated?.(recipeId, newCoverUrl, true);
    };

    const startHttpPollingFallback = () => {
      if (activePollingRef.current || isFinishedRef.current) return;
      const interval = setInterval(async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch(apiUrl(`/api/recipes/${recipeId}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = (await res.json()) as { recipe?: Recipe; saved?: { recipe?: Recipe } };
            const updated = data.recipe ?? data.saved?.recipe;
            if (updated?.imageUrl && (updated.isAiCover || updated.imageUrl.length > 0)) {
              handleSuccess(updated.imageUrl);
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500);
      activePollingRef.current = interval;
    };

    void (async () => {
      try {
        const token = await getAccessToken();
        const sseUrl = token
          ? apiUrl(`/api/recipes/${recipeId}/events?token=${encodeURIComponent(token)}`)
          : apiUrl(`/api/recipes/${recipeId}/events`);

        const es = new EventSource(sseUrl, { withCredentials: true });
        activeEventSourceRef.current = es;

        const onEvent = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as {
              type?: string;
              imageUrl?: string;
            };
            if (data.type === 'cover_ready' && data.imageUrl) {
              handleSuccess(data.imageUrl);
            } else if (data.type === 'cover_failed') {
              setIsGenerating(false);
              cleanup();
            }
          } catch {
            // ignore parse error
          }
        };

        es.addEventListener('recipe', onEvent);
        es.onmessage = onEvent;

        es.onerror = () => {
          cleanup();
          startHttpPollingFallback();
        };

        // Also initiate HTTP polling after 2s if SSE hasn't resolved yet (failsafe)
        setTimeout(() => {
          if (!isFinishedRef.current) {
            startHttpPollingFallback();
          }
        }, 2000);
      } catch {
        startHttpPollingFallback();
      }
    })();

    // Safety timeout: 25 seconds
    const timeout = setTimeout(() => {
      if (!isFinishedRef.current) {
        setIsGenerating(false);
        cleanup();
      }
    }, 25000);

    return () => {
      cleanup();
      clearTimeout(timeout);
    };
  }, [recipe.id, isAwaiting, getAccessToken, onCoverUpdated]);

  return { isAwaitingCover: isGenerating, coverUrl };
}
