import { Spinner } from '@heroui/react';
import {
  Shield,
  MessageSquare,
  Settings,
  AlertCircle,
  X,
  BarChart3,
  Users,
  LogOut,
  Globe,
} from 'lucide-react';
import { useAdminDashboard } from './AdminMetrics/useAdminDashboard';
import { MetricsOverviewHeader } from './AdminMetrics/MetricsOverviewHeader';
import { GrowthRetentionTab } from './AdminMetrics/GrowthRetentionTab';
import { PipelineSourcesTab } from './AdminMetrics/PipelineSourcesTab';
import { AiCatalogTab } from './AdminMetrics/AiCatalogTab';
import { AdminSettingsPanel } from './AdminMetrics/AdminSettingsPanel';
import { AdminFeedbackPanel } from './AdminMetrics/AdminFeedbackPanel';
import { AdminUsersPanel } from './AdminMetrics/AdminUsersPanel';
import type { MetricsRange } from './AdminMetrics/types';

interface AdminViewProps {
  getAccessToken: () => Promise<string | null>;
  onSignOut: () => void;
  userEmail?: string;
}

export default function AdminView({
  getAccessToken,
  onSignOut,
  userEmail,
}: AdminViewProps) {
  const {
    language,
    setLanguage,
    isDe,
    activeTab,
    setActiveTab,
    metricsSubTab,
    setMetricsSubTab,
    settings,
    localSettings,
    handleSettingChange,
    feedback,
    metrics,
    metricsRange,
    setMetricsRange,
    users,
    loading,
    metricsLoading,
    saving,
    error,
    setError,
    successMessage,
    lightboxImage,
    setLightboxImage,
    triggeringPush,
    pushResult,
    handleSaveSettings,
    handleTriggerPush,
  } = useAdminDashboard(getAccessToken);

  const rangeLabel: Record<MetricsRange, string> = {
    all: isDe ? 'Gesamt' : 'All time',
    today: isDe ? 'Heute' : 'Today',
    '3d': isDe ? 'Letzte 3 Tage' : 'Last 3 days',
    '7d': isDe ? 'Letzte 7 Tage' : 'Last 7 days',
    '30d': isDe ? 'Letzte 30 Tage' : 'Last 30 days',
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(isDe ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 font-sans text-gray-900">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-500">Administration</span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              Snagbite Admin & Analytics
            </h1>
            {userEmail && (
              <span className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                {userEmail}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLanguage((l) => (l === 'de' ? 'en' : 'de'))}
            className="px-3.5 py-2 text-xs font-bold rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 border-none transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            {language.toUpperCase()}
          </button>
          <button
            onClick={onSignOut}
            className="px-3.5 py-2 text-xs font-bold rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border-none transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {isDe ? 'Abmelden' : 'Sign Out'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner color="success" size="lg" />
          <span className="text-sm font-bold text-gray-500">
            {isDe ? 'Lade Daten...' : 'Loading data...'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Primary Tabs Navigation */}
          <div className="flex w-full bg-gray-100 p-1 sm:p-1.5 rounded-2xl">
            {(
              [
                {
                  id: 'metrics',
                  icon: <BarChart3 className="w-4 h-4 shrink-0" />,
                  label: isDe ? 'Analytics & Metriken' : 'Analytics & Metrics',
                },
                {
                  id: 'users',
                  icon: <Users className="w-4 h-4 shrink-0" />,
                  label: isDe ? 'Nutzer' : 'Users',
                },
                {
                  id: 'feedback',
                  icon: <MessageSquare className="w-4 h-4 shrink-0" />,
                  label: 'Feedback',
                },
                {
                  id: 'settings',
                  icon: <Settings className="w-4 h-4 shrink-0" />,
                  label: isDe ? 'Konfiguration' : 'Config',
                },
              ] as const
            ).map(({ id, icon, label }) => {
              const isSelected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setActiveTab(id);
                  }}
                  className={`flex-1 py-2.5 text-center font-bold transition-all cursor-pointer rounded-xl border-none ${
                    isSelected
                      ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden sr-only">{label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notification Alerts */}
          {error && (
            <div className="p-4 bg-rose-500/10 text-rose-600 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-start gap-3">
              <Shield className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-xs font-bold">{successMessage}</span>
            </div>
          )}

          {/* Panel: Settings */}
          {activeTab === 'settings' && (
            <AdminSettingsPanel
              isDe={isDe}
              settings={settings}
              localSettings={localSettings}
              onSettingChange={handleSettingChange}
              saving={saving}
              onSaveSettings={handleSaveSettings}
              triggeringPush={triggeringPush}
              onTriggerPush={handleTriggerPush}
              pushResult={pushResult}
            />
          )}

          {/* Panel: Feedback */}
          {activeTab === 'feedback' && (
            <AdminFeedbackPanel
              isDe={isDe}
              feedback={feedback}
              onOpenLightbox={setLightboxImage}
              formatDate={formatDate}
            />
          )}

          {/* Panel: Metrics & Analytics */}
          {activeTab === 'metrics' && (
            <div className="flex flex-col gap-6">
              <MetricsOverviewHeader
                isDe={isDe}
                metrics={metrics}
                metricsRange={metricsRange}
                onSelectRange={setMetricsRange}
                subTab={metricsSubTab}
                onSelectSubTab={setMetricsSubTab}
                onOpenUsersTab={() => {
                  setError(null);
                  setActiveTab('users');
                }}
                rangeLabel={rangeLabel}
              />

              {metricsLoading && !metrics ? (
                <div className="flex justify-center py-16">
                  <Spinner color="success" size="md" />
                </div>
              ) : metrics ? (
                <div
                  className={`flex flex-col gap-6 transition-opacity ${
                    metricsLoading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {metricsSubTab === 'growth' && (
                    <GrowthRetentionTab
                      isDe={isDe}
                      metrics={metrics}
                      rangeLabel={rangeLabel[metricsRange]}
                    />
                  )}

                  {metricsSubTab === 'pipeline' && (
                    <PipelineSourcesTab
                      isDe={isDe}
                      metrics={metrics}
                      rangeLabel={rangeLabel[metricsRange]}
                      formatDate={formatDate}
                    />
                  )}

                  {metricsSubTab === 'ai' && (
                    <AiCatalogTab
                      isDe={isDe}
                      metrics={metrics}
                      rangeLabel={rangeLabel[metricsRange]}
                    />
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Panel: Users */}
          {activeTab === 'users' && <AdminUsersPanel isDe={isDe} users={users} />}
        </div>
      )}

      {/* Lightbox for screenshots */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged feedback screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
