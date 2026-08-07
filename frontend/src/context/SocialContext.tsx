import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiUrl } from '../api';
import { useAuth } from './AuthContext';
import type { Profile, FriendSummary, FriendRequest, LeaderboardEntry, LeaderboardWindow } from '../types';

/** Error carrying the backend error `code` so the UI can localize it. */
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
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  /** Send a friend request by code. Returns 'pending' or 'accepted'. Throws SocialError. */
  sendRequest: (code: string) => Promise<'pending' | 'accepted'>;
  respondRequest: (friendshipId: string, accept: boolean) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  fetchLeaderboard: (window: LeaderboardWindow) => Promise<LeaderboardEntry[]>;
}

const SocialContext = createContext<SocialState | undefined>(undefined);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { session, getAccessToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
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

  const refreshFriends = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [authedFetch]);

  // Load the profile once a session exists so the friend code is ready.
  useEffect(() => {
    if (session) refreshProfile();
    else {
      setProfile(null);
      setFriends([]);
      setIncomingRequests([]);
    }
  }, [session, refreshProfile]);

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
    async (window: LeaderboardWindow): Promise<LeaderboardEntry[]> => {
      const data = await authedFetch(`/api/leaderboard?window=${window}`);
      return data.entries ?? [];
    },
    [authedFetch],
  );

  return (
    <SocialContext.Provider
      value={{
        profile,
        friends,
        incomingRequests,
        loading,
        refreshProfile,
        refreshFriends,
        updateDisplayName,
        sendRequest,
        respondRequest,
        removeFriend,
        fetchLeaderboard,
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
