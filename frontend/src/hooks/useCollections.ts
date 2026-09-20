import { useState, useCallback, useEffect } from 'react';
import type { Collection } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';

export function useCollections() {
  const { getAccessToken, user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [getAccessToken]);

  const refreshCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const response = await fetch(apiUrl('/api/collections'), { headers });
      const data = await response.json();
      if (response.ok && data.success) {
        setCollections(data.collections || []);
      } else {
        setError(data.error || 'Failed to fetch collections');
      }
    } catch (err: any) {
      console.error('Error fetching collections:', err);
      setError(err.message || 'Network error fetching collections');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Fetch collections as soon as a logged-in user is available — in parallel
  // with fetchHistory rather than waiting for it to finish.
  useEffect(() => {
    if (!authLoading && user) {
      refreshCollections();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const createCollection = async (name: string, emoji?: string | null, position?: number) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(apiUrl('/api/collections'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, emoji, position }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCollections(prev => [...prev, data.collection]);
        return { success: true, collection: data.collection };
      }
      return { success: false, error: data.error || 'Failed to create collection' };
    } catch (err: any) {
      console.error('Error creating collection:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(apiUrl(`/api/collections/${id}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCollections(prev => prev.map(c => c.id === id ? data.collection : c));
        return { success: true, collection: data.collection };
      }
      return { success: false, error: data.error || 'Failed to update collection' };
    } catch (err: any) {
      console.error('Error updating collection:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(apiUrl(`/api/collections/${id}`), {
        method: 'DELETE',
        headers,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCollections(prev => prev.filter(c => c.id !== id));
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete collection' };
    } catch (err: any) {
      console.error('Error deleting collection:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const updateRecipeCollections = async (recipeId: string, collectionIds: string[]) => {
    try {
      const headers = await getHeaders();
      const response = await fetch(apiUrl(`/api/recipes/${recipeId}/collections`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ collectionIds }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update recipe collections' };
    } catch (err: any) {
      console.error('Error updating recipe collections:', err);
      return { success: false, error: err.message || 'Network error' };
    }
  };

  return {
    collections,
    loading,
    error,
    refreshCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    updateRecipeCollections,
  };
}
