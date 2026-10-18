import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiUrl } from '../api';
import { useAuth } from './AuthContext';
import type {
  Profile,
  FriendSummary,
  FriendRequest,
  LeaderboardEntry,
  LeaderboardWindow,
  LeaderboardScope,
  SharedRecipeItem,
} from '../types';

export class SocialError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

interface SocialState {
  profile: Profile | null;
  friends: FriendSummary[];
  incomingRequests: FriendRequest[];
  sharedRecipes: SharedRecipeItem[];
  unreadSharesCount: number;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshFriends: (opts?: { silent?: boolean }) => Promise<void>;
  refreshShares: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  sendRequest: (code: string) => Promise<'pending' | 'accepted'>;
  sendRequestByUserId: (targetUserId: string) => Promise<'pending' | 'accepted'>;
  respondRequest: (friendshipId: string, accept: boolean) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  fetchLeaderboard: (window: LeaderboardWindow, scope?: LeaderboardScope) => Promise<LeaderboardEntry[]>;
  shareRecipeWithFriends: (recipeId: string, friendUserIds: string[], message?: string) => Promise<void>;
  saveFriendRecipe: (recipeId: string) => Promise<void>;
  dismissSharedRecipe: (shareId: string) => Promise<void>;
  markSharesSeen: () => Promise<void>;
}

const SocialContext = createContext<SocialState | undefined>(undefined);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { session, getAccessToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sharedRecipes, setSharedRecipes] = useState<SharedRecipeItem[]>([]);
  const [unreadSharesCount, setUnreadSharesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<any> => {
      const token = await getAccessToken();
      if (!token) throw new SocialError('UNAUTHORIZED');
      const res = await fetch(apiUrl(path), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new SocialError(data?.code || 'INTERNAL_ERROR');
      return data;
    },
    [getAccessToken],
  );

  const refreshProfile = useCallback(async () => {
    try {
      const data = await authedFetch('/api/me/profile');
      setProfile(data.profile);
    } catch (err) {
      console.warn('[Social] Failed to load profile:', err);
    }
  }, [authedFetch]);

  const refreshFriends = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [f, r] = await Promise.all([
          authedFetch('/api/friends'),
          authedFetch('/api/friends/requests'),
        ]);
        setFriends(f.friends ?? []);
        setIncomingRequests(r.requests ?? []);
      } catch (err) {
        console.warn('[Social] Failed to load friends:', err);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [authedFetch],
  );

  const refreshShares = useCallback(async () => {
    try {
      const data = await authedFetch('/api/friends/shares');
      setSharedRecipes(data.shares ?? []);
      setUnreadSharesCount(data.unreadCount ?? 0);
    } catch (err) {
      console.warn('[Social] Failed to load shares:', err);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (session) {
      refreshProfile();
      refreshFriends();
      refreshShares();
    } else {
      setProfile(null);
      setFriends([]);
      setIncomingRequests([]);
      setSharedRecipes([]);
      setUnreadSharesCount(0);
    }
  }, [session, refreshProfile, refreshFriends, refreshShares]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      const data = await authedFetch('/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: name }),
      });
      setProfile(data.profile);
    },
    [authedFetch],
  );

  const sendRequest = useCallback(
    async (code: string): Promise<'pending' | 'accepted'> => {
      const data = await authedFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      await refreshFriends();
      return data.status;
    },
    [authedFetch, refreshFriends],
  );

  const sendRequestByUserId = useCallback(
    async (targetUserId: string): Promise<'pending' | 'accepted'> => {
      const data = await authedFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      await refreshFriends();
      return data.status;
    },
    [authedFetch, refreshFriends],
  );

  const respondRequest = useCallback(
    async (friendshipId: string, accept: boolean) => {
      await authedFetch(`/api/friends/${friendshipId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      await refreshFriends();
    },
    [authedFetch, refreshFriends],
  );

  const removeFriend = useCallback(
    async (friendshipId: string) => {
      await authedFetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
      await refreshFriends();
    },
    [authedFetch, refreshFriends],
  );

  const fetchLeaderboard = useCallback(
    async (window: LeaderboardWindow, scope: LeaderboardScope = 'friends'): Promise<LeaderboardEntry[]> => {
      const data = await authedFetch(`/api/leaderboard?window=${window}&scope=${scope}`);
      return data.entries ?? [];
    },
    [authedFetch],
  );

  const shareRecipeWithFriends = useCallback(
    async (recipeId: string, friendUserIds: string[], message?: string) => {
      await authedFetch(`/api/recipes/${recipeId}/share`, {
        method: 'POST',
        body: JSON.stringify({ friendUserIds, message }),
      });
    },
    [authedFetch],
  );

  const saveFriendRecipe = useCallback(
    async (recipeId: string) => {
      await authedFetch(`/api/friends/recipes/${recipeId}/save`, { method: 'POST' });
      setSharedRecipes((prev) =>
        prev.map((s) => (s.recipe.id === recipeId ? { ...s, isRecipeSaved: true, status: 'saved' } : s)),
      );
      window.dispatchEvent(new CustomEvent('cookbook:recipe-saved', { detail: { recipeId } }));
    },
    [authedFetch],
  );

  const dismissSharedRecipe = useCallback(
    async (shareId: string) => {
      await authedFetch(`/api/friends/shares/${shareId}`, { method: 'DELETE' });
      setSharedRecipes((prev) => prev.filter((s) => s.shareId !== shareId));
    },
    [authedFetch],
  );

  const markSharesSeen = useCallback(async () => {
    if (unreadSharesCount === 0) return;
    setUnreadSharesCount(0);
    await authedFetch('/api/friends/shares/mark-seen', { method: 'POST' }).catch(() => {});
  }, [authedFetch, unreadSharesCount]);

  return (
    <SocialContext.Provider
      value={{
        profile,
        friends,
        incomingRequests,
        sharedRecipes,
        unreadSharesCount,
        loading,
        refreshProfile,
        refreshFriends,
        refreshShares,
        updateDisplayName,
        sendRequest,
        sendRequestByUserId,
        respondRequest,
        removeFriend,
        fetchLeaderboard,
        shareRecipeWithFriends,
        saveFriendRecipe,
        dismissSharedRecipe,
        markSharesSeen,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial(): SocialState {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within a SocialProvider');
  return ctx;
}
