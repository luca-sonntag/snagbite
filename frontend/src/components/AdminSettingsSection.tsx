import React from 'react';
import {
  Shield,
  ExternalLink,
  ChevronRight,
  Wrench,
  Sparkles,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { AdminSettingsToggle } from './AdminSettingsToggle';

interface AdminSettingsSectionProps {
  isAdmin: boolean;
}

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = ({ isAdmin }) => {
  const { t } = useI18n();
  const {
    adminPanelUrl,
    isDevEnv,
    isToggleActive,
    handleDevToolsToggle,
    tierBusy,
    isPremium,
    currentTierDisplay,
    handleTierToggle,
    isClearing,
    handleClearAllData,
  } = useAdminSettings();

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
        <Shield className="w-3.5 h-3.5 text-emerald-500" />
        {t('app.settings.admin.section')}
      </h3>

      <div className="border-t border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        {/* Link: Admin Dashboard */}
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

        {/* Toggle: Developer Tools */}
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
          <AdminSettingsToggle
            on={isToggleActive}
            disabled={isDevEnv}
            onClick={handleDevToolsToggle}
            label={t('app.settings.admin.devTools')}
          />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800/80 mx-4" />

        {/* Toggle: Snagbite Pro Tier */}
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
          <AdminSettingsToggle
            on={isPremium}
            disabled={tierBusy}
            onClick={handleTierToggle}
            label={t('app.settings.admin.tierToggle')}
          />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800/80 mx-4" />

        {/* Action: Clear Browser Data & Reset DB Settings */}
        <button
          type="button"
          onClick={handleClearAllData}
          disabled={isClearing}
          className="w-full p-4 flex items-center justify-between hover:bg-rose-500/5 dark:hover:bg-rose-500/10 transition-all active:scale-[0.99] text-left cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
            {isClearing ? (
              <Loader2 className="w-5 h-5 text-rose-500 animate-spin shrink-0" />
            ) : (
              <RotateCcw className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 group-hover:-rotate-45 transition-transform" />
            )}
            <div>
              <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">
                {t('app.settings.admin.clearData')}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {t('app.settings.admin.clearDataDesc')}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default AdminSettingsSection;
