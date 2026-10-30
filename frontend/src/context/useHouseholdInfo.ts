import { useState, useCallback, useEffect, useRef } from 'react';
import type { AuthSession } from '../auth';
import type { HouseholdContextData } from '../components/Household/types';
import { apiUrl } from '../api';

export interface HouseholdInfoState {
  household: HouseholdContextData | null;
  householdLoading: boolean;
  refreshHousehold: () => Promise<void>;
}

const defaultContext: HouseholdContextData = {
  householdId: null,
  partnerId: null,
  partnerProfile: null,
  status: 'none',
  isTrialActive: false,
  trialEndsAt: null,
  hasHouseholdPro: false,
  isPauseLocked: false,
  requiresExtractionAds: false,
  inviteCode: null,
  cooldownUntil: null,
};

export function useHouseholdInfo(session: AuthSession | null): HouseholdInfoState {
  const [household, setHousehold] = useState<HouseholdContextData | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const refreshHousehold = useCallback(async () => {
    if (!session?.token || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setHouseholdLoading(true);

    try {
      const res = await fetch(apiUrl('/api/household'), {
        headers: {
          authorization: `Bearer ${session.token}`,
        },
      });

      if (!res.ok) {
        setHousehold(defaultContext);
        return;
      }

      const data = await res.json();
      if (data && data.success) {
        setHousehold({
          householdId: data.householdId ?? null,
          partnerId: data.partnerId ?? null,
          partnerProfile: data.partnerProfile ?? null,
          status: data.status ?? 'none',
          isTrialActive: Boolean(data.isTrialActive),
          trialEndsAt: data.trialEndsAt ?? null,
          hasHouseholdPro: Boolean(data.hasHouseholdPro),
          isPauseLocked: Boolean(data.isPauseLocked),
          requiresExtractionAds: Boolean(data.requiresExtractionAds),
          inviteCode: data.inviteCode ?? null,
          cooldownUntil: data.cooldownUntil ?? null,
        });
      } else {
        setHousehold(defaultContext);
      }
    } catch {
      setHousehold(defaultContext);
    } finally {
      setHouseholdLoading(false);
      isFetchingRef.current = false;
    }
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token) {
      setHousehold(null);
      setHouseholdLoading(false);
      return;
    }
    refreshHousehold();
  }, [session?.token, refreshHousehold]);

  return {
    household,
    householdLoading,
    refreshHousehold,
  };
}
