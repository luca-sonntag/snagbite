import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiUrl } from '../api';
import { useAuth } from './AuthContext';
import type {
  PantryItem,
  CreatePantryItemDto,
  UpdatePantryItemDto,
  PantrySuggestion,
} from '../types';

interface PantryContextState {
  pantryItems: PantryItem[];
  loading: boolean;
  refreshPantry: () => Promise<void>;
  addPantryItem: (dto: CreatePantryItemDto) => Promise<PantryItem | null>;
  updatePantryItem: (id: string, dto: UpdatePantryItemDto) => Promise<PantryItem | null>;
  deletePantryItem: (id: string) => Promise<boolean>;
  getSuggestions: () => Promise<PantrySuggestion[]>;
}

const PantryContext = createContext<PantryContextState | undefined>(undefined);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const { session, getAccessToken } = useAuth();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshPantry = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/pantry'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPantryItems(data.items ?? []);
      }
    } catch (err) {
      console.warn('[Pantry] Failed to load pantry items:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (session) {
      refreshPantry();
    } else {
      setPantryItems([]);
    }
  }, [session, refreshPantry]);

  // Refresh pantry on cook events or external updates
  useEffect(() => {
    const onCooked = () => {
      refreshPantry();
    };
    window.addEventListener('app:recipe-cooked', onCooked);
    window.addEventListener('pantry-updated', onCooked);
    return () => {
      window.removeEventListener('app:recipe-cooked', onCooked);
      window.removeEventListener('pantry-updated', onCooked);
    };
  }, [refreshPantry]);

  const addPantryItem = useCallback(
    async (dto: CreatePantryItemDto): Promise<PantryItem | null> => {
      const token = await getAccessToken();
      if (!token) return null;
      try {
        const res = await fetch(apiUrl('/api/pantry'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(dto),
        });
        if (res.ok) {
          const data = await res.json();
          const newItem = data.item as PantryItem;
          setPantryItems((prev) => [newItem, ...prev]);
          window.dispatchEvent(new CustomEvent('pantry-updated'));
          return newItem;
        }
      } catch (err) {
        console.error('[Pantry] Add failed:', err);
      }
      return null;
    },
    [getAccessToken]
  );

  const updatePantryItem = useCallback(
    async (id: string, dto: UpdatePantryItemDto): Promise<PantryItem | null> => {
      const token = await getAccessToken();
      if (!token) return null;
      try {
        const res = await fetch(apiUrl(`/api/pantry/${id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(dto),
        });
        if (res.ok) {
          const data = await res.json();
          const updated = data.item as PantryItem;
          setPantryItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
          window.dispatchEvent(new CustomEvent('pantry-updated'));
          return updated;
        }
      } catch (err) {
        console.error('[Pantry] Update failed:', err);
      }
      return null;
    },
    [getAccessToken]
  );

  const deletePantryItem = useCallback(
    async (id: string): Promise<boolean> => {
      const token = await getAccessToken();
      if (!token) return false;
      try {
        const res = await fetch(apiUrl(`/api/pantry/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setPantryItems((prev) => prev.filter((item) => item.id !== id));
          window.dispatchEvent(new CustomEvent('pantry-updated'));
          return true;
        }
      } catch (err) {
        console.error('[Pantry] Delete failed:', err);
      }
      return false;
    },
    [getAccessToken]
  );

  const getSuggestions = useCallback(async (): Promise<PantrySuggestion[]> => {
    const token = await getAccessToken();
    if (!token) return [];
    try {
      const res = await fetch(apiUrl('/api/pantry/suggestions'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.suggestions ?? [];
      }
    } catch (err) {
      console.warn('[Pantry] Suggestions failed:', err);
    }
    return [];
  }, [getAccessToken]);

  return (
    <PantryContext.Provider
      value={{
        pantryItems,
        loading,
        refreshPantry,
        addPantryItem,
        updatePantryItem,
        deletePantryItem,
        getSuggestions,
      }}
    >
      {children}
    </PantryContext.Provider>
  );
}

export function usePantry(): PantryContextState {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error('usePantry must be used within a PantryProvider');
  return ctx;
}
