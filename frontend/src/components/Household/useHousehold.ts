import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { resolveErrorCode } from '../../i18n';
import { apiUrl } from '../../api';
import type { HouseholdState } from './types';

export function useHousehold(): HouseholdState {
  const { household, refreshHousehold, getAccessToken } = useAuth();
  const { language } = useI18n();

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
      const msg = resolveErrorCode(data.code, data.params, data.error || data.message, language);
      throw new Error(msg);
    }
    await refreshHousehold();
    return { inviteCode: data.inviteCode };
  }, [authedRequest, language, refreshHousehold]);

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
          const msg = resolveErrorCode(data.code, data.params, data.error || data.message, language);
          return { success: false, error: msg };
        }
        await refreshHousehold();
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to join household';
        return { success: false, error: msg };
      }
    },
    [authedRequest, language, refreshHousehold]
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
          const msg = resolveErrorCode(data.code, data.params, data.error || data.message, language);
          return { success: false, error: msg };
        }
        return { success: true, sent: Boolean(data.sent) };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error proposing recipe';
        return { success: false, error: msg };
      }
    },
    [authedRequest, language]
  );

  const nudgePartner = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authedRequest('/api/household/nudge', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = resolveErrorCode(data.code, data.params, data.error || data.message, language);
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending nudge';
      return { success: false, error: msg };
    }
  }, [authedRequest, language]);

  const unlink = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authedRequest('/api/household', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = resolveErrorCode(data.code, data.params, data.error || data.message, language);
        return { success: false, error: msg };
      }
      await refreshHousehold();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error unlinking household';
      return { success: false, error: msg };
    }
  }, [authedRequest, language, refreshHousehold]);

  return {
    householdId: household?.householdId ?? null,
    partnerId: household?.partnerId ?? null,
    partnerProfile: household?.partnerProfile ?? null,
    status: household?.status ?? 'none',
    isTrialActive: Boolean(household?.isTrialActive),
    trialEndsAt: household?.trialEndsAt ?? null,
    hasHouseholdPro: Boolean(household?.hasHouseholdPro),
    hasPaidPro: Boolean(household?.hasPaidPro ?? (household?.hasHouseholdPro && !household?.isTrialActive)),
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
