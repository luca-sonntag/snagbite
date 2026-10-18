import { useState, useCallback, useEffect, useRef } from 'react';
import { apiUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { hapticSelection } from '../utils/haptics';
import type { FriendFeedItem, FeedReactionEmoji } from '../types';

export function useSocialFeed() {
  const { getAccessToken } = useAuth();
  const { saveFriendRecipe } = useSocial();
  const [items, setItems] = useState<FriendFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchItems = useCallback(
    async (before?: string): Promise<FriendFeedItem[]> => {
      const token = await getAccessToken();
      if (!token) return [];
      const query = before ? `?before=${encodeURIComponent(before)}` : '';
      const res = await fetch(apiUrl(`/api/friends/feed${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load feed');
      const data = await res.json();
      return data.items ?? [];
    },
    [getAccessToken],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItems();
      setItems(data);
      setHasMore(data.length >= 20);
    } catch (err: any) {
      setError(err?.message ?? 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchItems();
      setItems(data);
      setHasMore(data.length >= 20);
    } catch (err: any) {
      setError(err?.message ?? 'Fehler beim Aktualisieren');
    } finally {
      setRefreshing(false);
    }
  }, [fetchItems]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || isFetchingRef.current || items.length === 0) return;
    isFetchingRef.current = true;
    try {
      const lastCookedAt = items[items.length - 1].cookedAt;
      const older = await fetchItems(lastCookedAt);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...older]);
        setHasMore(older.length >= 20);
      }
    } catch {
      setHasMore(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [hasMore, items, fetchItems]);

  const toggleReaction = useCallback(
    async (cookEventId: string, emoji: FeedReactionEmoji) => {
      hapticSelection();
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => {
          if (item.cookEventId !== cookEventId) return item;
          const updatedReactions = item.reactions.map((r) => {
            if (r.emoji !== emoji) return r;
            const nextReacted = !r.reactedByMe;
            return {
              ...r,
              reactedByMe: nextReacted,
              count: nextReacted ? r.count + 1 : Math.max(0, r.count - 1),
            };
          });
          return { ...item, reactions: updatedReactions };
        }),
      );

      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/friends/feed/${cookEventId}/react`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emoji }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reactions) {
            setItems((prev) =>
              prev.map((item) =>
                item.cookEventId === cookEventId ? { ...item, reactions: data.reactions } : item,
              ),
            );
          }
        }
      } catch (err) {
        console.warn('[Feed] Reaction sync failed:', err);
      }
    },
    [getAccessToken],
  );

  const saveRecipe = useCallback(
    async (recipeId: string) => {
      await saveFriendRecipe(recipeId);
      setItems((prev) =>
        prev.map((item) =>
          item.recipe.id === recipeId ? { ...item, isRecipeSaved: true } : item,
        ),
      );
    },
    [saveFriendRecipe],
  );

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    items,
    loading,
    refreshing,
    hasMore,
    error,
    reload,
    fetchMore,
    toggleReaction,
    saveRecipe,
  };
}
