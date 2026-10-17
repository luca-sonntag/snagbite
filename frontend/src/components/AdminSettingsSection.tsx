import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, ChevronRight, Wrench, Sparkles } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiUrl } from '../api';
import { hapticLight } from '../utils/haptics';
import { isDevToolsFlagEnabled, setDevToolsFlagEnabled, DEV_TOOLS_TOGGLE_EVENT } from '../utils/dev';

interface AdminSettingsSectionProps {
  isAdmin: boolean;
}

function Toggle({
  on,
  onClick,
  disabled,
  label,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none border-none shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center p-0.5 ${
        on ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({ isAdmin }) => {
  const { t } = useI18n();
  const { isPremium, user, getAccessToken, refreshSession } = useAuth();
  const toast = useToast();

  const isDevEnv = import.meta.env.DEV;
  const [devToolsEnabled, setDevToolsEnabled] = useState<boolean>(isDevToolsFlagEnabled);
  const [tierBusy, setTierBusy] = useState(false);

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

  if (!isAdmin) return null;

  const websiteUrl = (import.meta.env.VITE_WEBSITE_URL as string | undefined) || 'http://localhost:5174';
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

  const isToggleActive = isDevEnv || devToolsEnabled;
  const currentTierDisplay = user?.tier || (isPremium ? 'premium' : 'free');

  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
        <Shield className="w-3.5 h-3.5 text-emerald-500" />
        {t('app.settings.admin.section')}
      </h3>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
        <a
          href={adminPanelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.99] text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <span>{t('app.settings.admin.dashboard')}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {t('app.settings.admin.dashboardDesc')}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </a>

        <div className="border-t border-gray-100 dark:border-gray-800/80 mx-4" />

        <div className="w-full p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
            <Wrench className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {t('app.settings.admin.devTools')}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {t('app.settings.admin.devToolsDesc')}
              </p>
            </div>
          </div>
          <Toggle
            on={isToggleActive}
            disabled={isDevEnv}
            onClick={handleDevToolsToggle}
            label={t('app.settings.admin.devTools')}
          />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800/80 mx-4" />

        <div className="w-full p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
            <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {t('app.settings.admin.tierToggle')}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {t('app.settings.admin.tierToggleDesc', { tier: currentTierDisplay })}
              </p>
            </div>
          </div>
          <Toggle
            on={isPremium}
            disabled={tierBusy}
            onClick={handleTierToggle}
            label={t('app.settings.admin.tierToggle')}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsSection;
