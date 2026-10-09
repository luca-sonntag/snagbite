import { useState, useCallback, useEffect, useRef } from 'react';
import type { AuthSession } from '../auth';

export interface TrialInfoState {
  hasTrialAvailable: boolean;
  trialDays: number;
  trialLoading: boolean;
  refreshTrialInfo: () => Promise<void>;
}

export function useTrialInfo(session: AuthSession | null): TrialInfoState {
  const [hasTrialAvailable, setHasTrialAvailable] = useState(false);
  const [trialDays, setTrialDays] = useState(0);
  const [trialLoading, setTrialLoading] = useState(true);
  const trialLoadedRef = useRef(false);

  const refreshTrialInfo = useCallback(async () => {
    if (!trialLoadedRef.current) {
      setTrialLoading(true);
    }
    try {
      const { getSubscriptionOfferings } = await import('../utils/purchase');
      const packages = await getSubscriptionOfferings();
      if (!packages || packages.length === 0) {
        setHasTrialAvailable(false);
        setTrialDays(0);
        return;
      }
      const trialPkgs = packages.filter(
        (p: any) => p.product?.introPrice && p.product.introPrice.price === 0
      );
      if (trialPkgs.length === 0) {
        setHasTrialAvailable(false);
        setTrialDays(0);
        return;
      }
      setHasTrialAvailable(true);
      const maxDays = Math.max(
        ...trialPkgs.map((p: any) => p.product.introPrice.periodNumberOfUnits || 0)
      );
      setTrialDays(maxDays);
    } catch {
      setHasTrialAvailable(false);
      setTrialDays(0);
    } finally {
      setTrialLoading(false);
      trialLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setHasTrialAvailable(false);
      setTrialDays(0);
      setTrialLoading(false);
      return;
    }
    refreshTrialInfo();
  }, [session, refreshTrialInfo]);

  return { hasTrialAvailable, trialDays, trialLoading, refreshTrialInfo };
}
