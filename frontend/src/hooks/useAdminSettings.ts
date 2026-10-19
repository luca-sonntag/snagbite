import { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';
import { apiUrl } from '../api';
import { hapticLight, hapticHeavy } from '../utils/haptics';
import {
  isDevToolsFlagEnabled,
  setDevToolsFlagEnabled,
  DEV_TOOLS_TOGGLE_EVENT,
} from '../utils/dev';
import { clearAllBrowserData } from '../utils/browserDataCleaner';

export function useAdminSettings() {
  const { t } = useI18n();
  const { isPremium, user, getAccessToken, refreshSession } = useAuth();
  const toast = useToast();
  const dialog = useDialog();

  const isDevEnv = import.meta.env.DEV;
  const [devToolsEnabled, setDevToolsEnabled] = useState<boolean>(isDevToolsFlagEnabled);
  const [tierBusy, setTierBusy] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setDevToolsEnabled(isDevToolsFlagEnabled());
    };
    window.addEventListener(DEV_TOOLS_TOGGLE_EVENT, handleToggle);
    window.addEventListener('storage', handleToggle);
    return () => {
      window.removeEventListener(DEV_TOOLS_TOGGLE_EVENT, handleToggle);
      window.removeEventListener('storage', handleToggle);
    };
  }, []);

  const websiteUrl =
    (import.meta.env.VITE_WEBSITE_URL as string | undefined) || 'http://localhost:5174';
  const adminPanelUrl = `${websiteUrl.replace(/\/$/, '')}/admin`;

  const handleDevToolsToggle = () => {
    const next = !devToolsEnabled;
    setDevToolsEnabled(next);
    setDevToolsFlagEnabled(next);
  };

  const handleTierToggle = async () => {
    if (tierBusy) return;
    setTierBusy(true);
    const targetTier = isPremium ? 'free' : 'premium';
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/me/tier'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier: targetTier }),
      });

      if (!res.ok) {
        throw new Error('Failed to update tier');
      }

      await refreshSession();
      toast.success(
        targetTier === 'premium'
          ? t('app.settings.admin.tierSuccessPro')
          : t('app.settings.admin.tierSuccessFree')
      );
    } catch {
      toast.danger(t('app.settings.admin.tierError'));
    } finally {
      setTierBusy(false);
    }
  };

  const handleClearAllData = async () => {
    if (isClearing) return;

    hapticLight();
    const confirmed = await dialog.confirm({
      title: t('app.settings.admin.clearDataConfirmTitle'),
      message: t('app.settings.admin.clearDataConfirmMessage'),
      confirmLabel: t('app.settings.admin.clearDataConfirmButton'),
      cancelLabel: t('common.cancel'),
      status: 'danger',
    });

    if (!confirmed) return;

    setIsClearing(true);
    hapticHeavy();

    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/me/reset-settings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to reset settings in database');
      }

      toast.success(t('app.settings.admin.clearDataSuccess'));

      // Clear all browser storage, caches, and indexedDB
      await clearAllBrowserData();

      // Brief timeout so UI renders before reload
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error('Error clearing data and resetting settings:', err);
      toast.danger(t('app.settings.admin.clearDataError'));
      setIsClearing(false);
    }
  };

  const isToggleActive = isDevEnv || devToolsEnabled;
  const currentTierDisplay = user?.tier || (isPremium ? 'premium' : 'free');

  return {
    adminPanelUrl,
    isDevEnv,
    devToolsEnabled,
    isToggleActive,
    handleDevToolsToggle,
    tierBusy,
    isPremium,
    currentTierDisplay,
    handleTierToggle,
    isClearing,
    handleClearAllData,
  };
}
