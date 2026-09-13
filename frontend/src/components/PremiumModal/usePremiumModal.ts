import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { buyPremium, restorePurchases, getSubscriptionOfferings, getCachedOfferings } from '../../utils/purchase';
import { hapticMedium } from '../../utils/haptics';
import type { SubscriptionPackage } from './types';

export function usePremiumModal(isOpen: boolean, onOpenChange: (open: boolean) => void) {
  const { t } = useI18n();
  const { isPremium, user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cachedPackages = getCachedOfferings() as SubscriptionPackage[] | null;
  const [packages, setPackages] = useState<SubscriptionPackage[]>(cachedPackages ?? []);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  const autoSelect = useCallback((offs: SubscriptionPackage[]) => {
    if (offs.length === 0) return;
    const trialPkg = offs.find((p) => p.product?.introPrice && p.product.introPrice.price === 0);
    const yearly = offs.find((p) => p.packageType === 'ANNUAL');
    setSelectedPackageId((prev) => prev ?? (trialPkg?.identifier || yearly?.identifier || offs[0].identifier));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSuccess(false);
    setErrorMsg(null);
    setLoading(false);
    setRestoring(false);

    if (cachedPackages && cachedPackages.length > 0) {
      autoSelect(cachedPackages);
    }

    const loadOfferings = async () => {
      if (!cachedPackages || cachedPackages.length === 0) {
        setIsLoadingPackages(true);
      }
      try {
        const offs = (await getSubscriptionOfferings()) as SubscriptionPackage[];
        setPackages(offs);
        autoSelect(offs);
      } catch (err) {
        console.error('PremiumModal: Failed to load subscription offerings:', err);
      } finally {
        setIsLoadingPackages(false);
      }
    };

    loadOfferings();
  }, [isOpen, cachedPackages, autoSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading && !restoring) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, restoring, onOpenChange]);

  const handleUpgrade = useCallback(async () => {
    if (!selectedPackageId) return;
    hapticMedium();
    setLoading(true);
    setErrorMsg(null);
    try {
      const purchased = await buyPremium(selectedPackageId);
      if (purchased) {
        hapticMedium();
        setSuccess(true);
        toast.success(t('premium.modal.success') || 'Erfolgreich freigeschaltet!');
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('premium.modal.error') || 'Fehler bei der Zahlung.';
      setErrorMsg(msg);
      toast.danger(msg);
      setLoading(false);
    }
  }, [selectedPackageId, t, toast, onOpenChange]);

  const handleRestore = useCallback(async () => {
    hapticMedium();
    setRestoring(true);
    setErrorMsg(null);
    try {
      const restored = await restorePurchases();
      if (restored) {
        hapticMedium();
        setSuccess(true);
        toast.success(t('premium.modal.restoreSuccess') || 'Käufe erfolgreich wiederhergestellt!');
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        toast.info(t('premium.modal.restoreNone') || 'Keine aktiven Käufe gefunden.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('premium.modal.restoreError') || 'Wiederherstellung fehlgeschlagen.';
      setErrorMsg(msg);
      toast.danger(msg);
    } finally {
      setRestoring(false);
    }
  }, [t, toast, onOpenChange]);

  const selectedPackage = packages.find((p) => p.identifier === selectedPackageId);
  const hasSelectedTrial = Boolean(selectedPackage?.product?.introPrice && selectedPackage?.product?.introPrice?.price === 0);
  const trialDays = selectedPackage?.product?.introPrice?.periodNumberOfUnits || 3;

  return {
    loading,
    restoring,
    success,
    errorMsg,
    packages,
    selectedPackageId,
    setSelectedPackageId,
    isLoadingPackages,
    selectedPackage,
    hasSelectedTrial,
    trialDays,
    isPremium,
    user,
    handleUpgrade,
    handleRestore,
  };
}
