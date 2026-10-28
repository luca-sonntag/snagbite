import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../api';
import type { HouseholdState } from './types';

export function useHousehold(): HouseholdState {
  const { household, refreshHousehold, getAccessToken } = useAuth();

  const authedRequest = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(options.headers || {});
      if (token) headers.set('authorization', `Bearer ${token}`);
      if (!headers.has('content-type') && options.method && options.method !== 'GET') {
        headers.set('content-type', 'application/json');
      }
      return fetch(apiUrl(path), { ...options, headers });
    },
    [getAccessToken]
  );

  const createInvite = useCallback(async (): Promise<{ inviteCode: string }> => {
    const res = await authedRequest('/api/household/invite', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to create household invite');
    }
    await refreshHousehold();
    return { inviteCode: data.inviteCode };
  }, [authedRequest, refreshHousehold]);

  const acceptInvite = useCallback(
    async (codeOrId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const isCode = !codeOrId.includes('-');
        const body = isCode ? { code: codeOrId } : { friendUserId: codeOrId };
        const res = await authedRequest('/api/household/accept', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.message || 'Invite invalid or expired' };
        }
        await refreshHousehold();
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to join household';
        return { success: false, error: msg };
      }
    },
    [authedRequest, refreshHousehold]
  );

  const proposeCook = useCallback(
    async (recipeId: string): Promise<{ success: boolean; sent?: boolean; error?: string }> => {
      try {
        const res = await authedRequest('/api/household/propose-recipe', {
          method: 'POST',
          body: JSON.stringify({ recipeId }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.message || 'Failed to propose recipe' };
        }
        return { success: true, sent: Boolean(data.sent) };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error proposing recipe';
        return { success: false, error: msg };
      }
    },
    [authedRequest]
  );

  const nudgePartner = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authedRequest('/api/household/nudge', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.message || 'Nudge failed' };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending nudge';
      return { success: false, error: msg };
    }
  }, [authedRequest]);

  const unlink = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authedRequest('/api/household', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.message || 'Failed to unlink household' };
      }
      await refreshHousehold();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error unlinking household';
      return { success: false, error: msg };
    }
  }, [authedRequest, refreshHousehold]);

  return {
    householdId: household?.householdId ?? null,
    partnerId: household?.partnerId ?? null,
    partnerProfile: household?.partnerProfile ?? null,
    status: household?.status ?? 'none',
    isTrialActive: Boolean(household?.isTrialActive),
    trialEndsAt: household?.trialEndsAt ?? null,
    hasHouseholdPro: Boolean(household?.hasHouseholdPro),
    isPauseLocked: Boolean(household?.isPauseLocked),
    requiresExtractionAds: Boolean(household?.requiresExtractionAds),
    inviteCode: household?.inviteCode ?? null,
    cooldownUntil: household?.cooldownUntil ?? null,
    loading: false,
    refreshHousehold,
    createInvite,
    acceptInvite,
    proposeCook,
    nudgePartner,
    unlink,
  };
}
