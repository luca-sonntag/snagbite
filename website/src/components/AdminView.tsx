import { useState, useEffect, useCallback } from 'react';
import { Button, Spinner } from '@heroui/react';
import {
  Shield,
  Save,
  MessageSquare,
  Settings,
  AlertCircle,
  Bug,
  Lightbulb,
  X,
  Terminal,
  BarChart3,
  Users,
  BookOpen,
  TrendingUp,
  Coins,
  HardDriveDownload,
  ExternalLink,
  ChevronDown,
  LogOut,
  Globe,
  Bell,
  Calendar,
  Clock,
  Search
} from 'lucide-react';
import { apiUrl } from '../api';

interface GlobalSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface FeedbackItem {
  id: string;
  type: 'bug' | 'idea';
  message: string;
  context: any;
  screenshot_urls: string[] | null;
  created_at: string;
}

interface AdminViewProps {
  getAccessToken: () => Promise<string | null>;
  onSignOut: () => void;
  userEmail?: string;
}

/** Format a download size given in megabytes into a compact human string (MB → GB). */
function formatDownloadSize(mb: number): string {
  if (!mb || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export default function AdminView({ getAccessToken, onSignOut, userEmail }: AdminViewProps) {
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [activeTab, setActiveTab] = useState<'settings' | 'feedback' | 'metrics' | 'users'>('metrics');
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [metricsRange, setMetricsRange] = useState<'all' | 'today' | '3d' | '7d' | '30d'>('today');
  const [users, setUsers] = useState<any[]>([]);
  const [usersRange, setUsersRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showFailedJobs, setShowFailedJobs] = useState(false);
  const [triggeringPush, setTriggeringPush] = useState(false);
  const [pushResult, setPushResult] = useState<{ usersScanned: number; deliveredCount: number; logs: string[] } | null>(null);

  const isDe = language === 'de';

  // The admin panel is light-only; clear any dark class left on <html> by older builds.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const rangeLabel: Record<'all' | 'today' | '3d' | '7d' | '30d', string> = {
    all: isDe ? 'Gesamt' : 'All time',
    today: isDe ? 'Heute' : 'Today',
    '3d': isDe ? 'Letzte 3 Tage' : 'Last 3 days',
    '7d': isDe ? 'Letzte 7 Tage' : 'Last 7 days',
    '30d': isDe ? 'Letzte 30 Tage' : 'Last 30 days',
  };

  const filteredUsers = (() => {
    let result = users;
    if (usersRange !== 'all') {
      const days = usersRange === 'today' ? 1 : usersRange === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - (days - 1));
      result = result.filter((u: any) => u.created_at && new Date(u.created_at) >= cutoff);
    }
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.trim().toLowerCase();
      result = result.filter((u: any) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q)) ||
        (u.tier && u.tier.toLowerCase().includes(q))
      );
    }
    return result;
  })();

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        const mapped = data.settings.reduce((acc: Record<string, string>, curr: GlobalSetting) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setLocalSettings(mapped);
      } else {
        throw new Error(data.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      console.error(err);
      setError(isDe ? 'Einstellungen konnten nicht geladen werden.' : 'Failed to load settings.');
    }
  }, [getAccessToken, isDe]);

  const fetchFeedback = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/feedback'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback(data.feedback);
      } else {
        throw new Error(data.error || 'Failed to fetch feedback');
      }
    } catch (err: any) {
      console.error(err);
      setError(isDe ? 'Feedback konnte nicht geladen werden.' : 'Failed to load feedback.');
    }
  }, [getAccessToken, isDe]);

  const fetchMetrics = useCallback(async (range: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl(`/api/admin/metrics?range=${range}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data);
      } else {
        throw new Error(data.error || 'Failed to fetch metrics');
      }
    } catch (err: any) {
      console.error(err);
      setError(isDe ? 'Metriken konnten nicht geladen werden.' : 'Failed to load metrics.');
    }
  }, [getAccessToken, isDe]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/users'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      console.error(err);
      setError(isDe ? 'Nutzer konnten nicht geladen werden.' : 'Failed to load users.');
    }
  }, [getAccessToken, isDe]);

  const loadData = useCallback(async () => {
    if (activeTab === 'metrics') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    if (activeTab === 'settings') {
      await fetchSettings();
    } else if (activeTab === 'feedback') {
      await fetchFeedback();
    } else if (activeTab === 'users') {
      await fetchUsers();
    }
    setLoading(false);
  }, [activeTab, fetchSettings, fetchFeedback, fetchUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab !== 'metrics') return;
    let cancelled = false;
    setMetricsLoading(true);
    setError(null);
    fetchMetrics(metricsRange).finally(() => {
      if (!cancelled) setMetricsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, metricsRange, fetchMetrics]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/settings'), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: localSettings }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(isDe ? 'Einstellungen gespeichert!' : 'Settings saved successfully!');
        await fetchSettings();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error(err);
      setError(isDe ? 'Speichern fehlgeschlagen.' : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerPush = async () => {
    setTriggeringPush(true);
    setError(null);
    setSuccessMessage(null);
    setPushResult(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/notifications/trigger'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult(data.result || null);
        setSuccessMessage(isDe ? `Push-Notification Worker getriggert! (${data.result?.deliveredCount ?? 0} zugestellt)` : `Push notification worker executed! (${data.result?.deliveredCount ?? 0} delivered)`);
      } else {
        setError(data.message || (isDe ? 'Fehler beim Triggern.' : 'Failed to trigger notifications.'));
      }
    } catch (err: any) {
      setError(err?.message || (isDe ? 'Netzwerkfehler.' : 'Network error.'));
    } finally {
      setTriggeringPush(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleFeedbackExpand = (id: string) => {
    setExpandedFeedbackId((prev) => (prev === id ? null : id));
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
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Administration
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              Admin Dashboard
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
            onClick={() => setLanguage(l => l === 'de' ? 'en' : 'de')}
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
          {/* Tabs Navigation */}
          <div className="flex w-full mb-6 bg-gray-100 p-1 sm:p-1.5 rounded-2xl">
            {(
              [
                { id: 'metrics', icon: <BarChart3 className="w-4 h-4 shrink-0" />, label: isDe ? 'Metriken' : 'Metrics' },
                { id: 'users', icon: <Users className="w-4 h-4 shrink-0" />, label: isDe ? 'Nutzer' : 'Users' },
                { id: 'feedback', icon: <MessageSquare className="w-4 h-4 shrink-0" />, label: 'Feedback' },
                { id: 'settings', icon: <Settings className="w-4 h-4 shrink-0" />, label: isDe ? 'Konfiguration' : 'Config' },
              ] as const
            ).map(({ id, icon, label }) => {
              const isSelected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setError(null); setActiveTab(id); }}
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
              <div className="mb-4 p-4 bg-rose-500/10 text-rose-600 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-start gap-3">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-xs font-bold">{successMessage}</span>
              </div>
            )}

            {/* Panel: Settings */}
            {activeTab === 'settings' && (
              <div className="flex flex-col gap-6">
                <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-6">
                    {settings.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 font-medium">
                        {isDe ? 'Keine Einstellungen vorhanden.' : 'No settings available.'}
                      </p>
                    ) : (
                      settings.map((setting) => {
                        const isBoolean = setting.value === 'true' || setting.value === 'false';
                        const isNumber = !isBoolean && !isNaN(Number(setting.value));
                        const currentValue = localSettings[setting.key] ?? setting.value;

                        return (
                          <div key={setting.key} className="flex flex-col gap-2 pb-5 border-b border-black/5 last:border-0 last:pb-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <label className="text-sm font-bold text-gray-900 break-words">
                                  {setting.key}
                                </label>
                                {setting.description && (
                                  <span className="text-xs text-gray-500 leading-relaxed font-medium">
                                    {setting.description}
                                  </span>
                                )}
                              </div>

                              {isBoolean && (
                                <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 border-none self-start">
                                  <button
                                    type="button"
                                    onClick={() => handleSettingChange(setting.key, 'true')}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentValue === 'true'
                                        ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                                        : 'text-gray-500 hover:text-gray-900'
                                      }`}
                                  >
                                    {isDe ? 'Ja' : 'Yes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSettingChange(setting.key, 'false')}
                                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentValue === 'false'
                                        ? 'bg-white text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                                        : 'text-gray-500 hover:text-gray-900'
                                      }`}
                                  >
                                    {isDe ? 'Nein' : 'No'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {!isBoolean && (
                              <input
                                type={isNumber ? 'number' : 'text'}
                                name={setting.key}
                                value={currentValue}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="w-full bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm text-gray-900 font-medium shadow-[0_2px_6px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                                aria-label={setting.key}
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {settings.length > 0 && (
                  <Button
                    type="button"
                    isDisabled={saving}
                    onPress={handleSaveSettings}
                    className={`py-3.5 h-12 text-sm rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${saving
                        ? 'opacity-60 cursor-not-allowed'
                        : 'transition-all cursor-pointer'
                      } w-full`}
                  >
                    <span className="flex items-center gap-2 justify-center">
                      {saving ? (
                        <>
                          <Spinner color="current" size="sm" />
                          <span>{isDe ? 'Wird gespeichert...' : 'Saving...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{isDe ? 'Änderungen speichern' : 'Save Changes'}</span>
                        </>
                      )}
                    </span>
                  </Button>
                )}

                {/* Push Notification Trigger Card */}
                <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          {isDe ? 'Push-Notifications Testen' : 'Test Push Notifications'}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">
                          {isDe
                            ? 'Führt sofort einen KI-Push-Notification Worker-Durchlauf im Hintergrund aus.'
                            : 'Triggers a push notification worker tick in the background.'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      isDisabled={triggeringPush}
                      onPress={handleTriggerPush}
                      className="py-2.5 px-4 text-xs font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all cursor-pointer shrink-0"
                    >
                      {triggeringPush ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        isDe ? 'Jetzt triggern' : 'Trigger now'
                      )}
                    </Button>
                  </div>

                  {pushResult && pushResult.logs && pushResult.logs.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-black/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                        <span>{isDe ? 'Ergebnis-Protokoll:' : 'Execution Logs:'}</span>
                        <span className="text-emerald-600 font-mono">{pushResult.deliveredCount} {isDe ? 'Zugestellt' : 'Delivered'}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto bg-gray-950 text-gray-200 p-3.5 rounded-2xl text-[10px] leading-relaxed space-y-1 font-mono border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                        {pushResult.logs.map((log, idx) => (
                          <div key={idx} className={log.startsWith('DELIVERED') ? 'text-emerald-400 font-bold' : log.includes('No registered') || log.includes('Outside') || log.includes('Already') ? 'text-amber-300' : 'text-gray-300'}>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Feedback */}
            {activeTab === 'feedback' && (
              <div className="flex flex-col gap-4">
                {feedback.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12 font-medium">
                    {isDe ? 'Bisher kein Feedback eingegangen.' : 'No feedback submissions received yet.'}
                  </p>
                ) : (
                  feedback.map((item) => {
                    const isBug = item.type === 'bug';
                    const email = item.context?.email || (isDe ? 'Unbekannter Benutzer' : 'Unknown User');
                    const isExpanded = expandedFeedbackId === item.id;

                    return (
                      <div key={item.id} className="border-none bg-white rounded-2xl md:rounded-3xl shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden p-4 sm:p-5">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isBug ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border-none uppercase tracking-wider">
                                    <Bug className="w-3 h-3" />
                                    Bug
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 border-none uppercase tracking-wider">
                                    <Lightbulb className="w-3 h-3" />
                                    Idea
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 font-bold font-mono">
                                  {formatDate(item.created_at)}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-gray-900 truncate">
                                {email}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 border-none rounded-2xl">
                            <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                              {item.message}
                            </p>
                          </div>

                          {item.screenshot_urls && item.screenshot_urls.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {isDe ? 'Screenshots / Anhänge:' : 'Screenshots / Attachments:'}
                              </span>
                              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                                {item.screenshot_urls.map((url, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setLightboxImage(url)}
                                    className="w-16 h-16 rounded-xl border-none overflow-hidden shrink-0 active:scale-95 hover:brightness-95 transition-all cursor-pointer bg-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
                                  >
                                    <img src={url} alt={`Screenshot ${idx}`} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.context && (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => toggleFeedbackExpand(item.id)}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer outline-none border-none"
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                <span>
                                  {isExpanded
                                    ? (isDe ? 'Details ausblenden' : 'Hide Details')
                                    : (isDe ? 'Geräte- & Diagnosedaten anzeigen' : 'Show Device & Diagnostic Data')
                                  }
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-3 p-4 bg-gray-50 border-none rounded-2xl flex flex-col gap-2 font-mono text-[11px] text-gray-700 overflow-x-auto">
                                  <div><span className="font-bold text-gray-500">Platform:</span> {item.context.platform} ({item.context.isNative ? 'Native' : 'Web'})</div>
                                  <div><span className="font-bold text-gray-500">App Version:</span> v{item.context.appVersion} (Build {item.context.appBuild})</div>
                                  <div><span className="font-bold text-gray-500">Tier / Language:</span> lang: {item.context.language} | tier: {item.context.tier}</div>
                                  <div><span className="font-bold text-gray-500">Viewport:</span> {item.context.viewport}</div>
                                  <div><span className="font-bold text-gray-500">Route:</span> {item.context.route}</div>
                                  <div className="break-all"><span className="font-bold text-gray-500">User Agent:</span> {item.context.userAgent}</div>

                                  {item.context.logs && item.context.logs.length > 0 && (
                                    <div className="mt-2 border-t border-black/5 pt-2 flex flex-col gap-1.5">
                                      <div className="font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 text-[9px] mb-1">
                                        <Terminal className="w-3.5 h-3.5" />
                                        {isDe ? 'Konsolen-Protokoll:' : 'Console Logs:'}
                                      </div>
                                      <div className="max-h-48 overflow-y-auto bg-gray-950 text-gray-300 p-3 rounded-xl text-[9px] leading-tight space-y-1 font-mono border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                                        {item.context.logs.map((log: any, idx: number) => (
                                          <div key={idx} className={log.level === 'error' || log.level === 'warn' ? 'text-rose-400' : 'text-emerald-400'}>
                                            <span className="text-gray-500 font-semibold">[{log.level.toUpperCase()}]</span> {log.text}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Panel: Metrics */}
            {activeTab === 'metrics' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border-none">
                  {(
                    [
                      { id: 'all', label: isDe ? 'Alle' : 'All' },
                      { id: 'today', label: isDe ? 'Heute' : 'Today' },
                      { id: '3d', label: isDe ? '3 Tage' : '3 days' },
                      { id: '7d', label: isDe ? '7 Tage' : '7 days' },
                      { id: '30d', label: isDe ? '30 Tage' : '30 days' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMetricsRange(id)}
                      className={`flex-1 min-w-[30%] sm:min-w-0 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${metricsRange === id
                          ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                          : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {metricsLoading && !metrics ? (
                  <div className="flex justify-center py-16">
                    <Spinner color="success" size="md" />
                  </div>
                ) : metrics ? (
                  <div className={`flex flex-col gap-6 transition-opacity ${metricsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* 1. Top Level Metrics Cards Grid (5 Cards) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div
                        className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2 cursor-pointer active:scale-95 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                        onClick={() => { setError(null); setActiveTab('users'); }}
                      >
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {metricsRange === 'all' ? (isDe ? 'Nutzer' : 'Users') : (isDe ? 'Neue Nutzer' : 'New Users')}
                          </span>
                          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Users className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-gray-900 leading-tight">
                            {metricsRange === 'all' ? (metrics.users?.total ?? 0) : (metrics.users?.newInRange ?? 0)}
                          </span>
                          <span className="text-[9px] text-gray-500 mt-0.5 font-bold">
                            {metricsRange === 'all' ? (isDe ? 'Registriert' : 'Registered') : rangeLabel[metricsRange]}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2">
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'Rezepte' : 'Recipes'}</span>
                          <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-gray-900 leading-tight">
                            {metrics.jobs?.total ?? 0}
                          </span>
                          <span className="text-[9px] text-gray-500 mt-0.5 font-bold">{isDe ? 'Extraktionen' : 'Extractions'}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2">
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'LLM Kosten' : 'LLM Costs'}</span>
                          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                            <Coins className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-gray-900 leading-tight">
                            ${metrics.llm?.totalCostUsd?.toFixed(4) ?? '0.0000'}
                          </span>
                          <span className="text-[9px] text-gray-500 mt-0.5 font-bold">{rangeLabel[metricsRange]}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2">
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'Anfragen' : 'Requests'}</span>
                          <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-gray-900 leading-tight">
                            {metrics.llm?.count ?? 0}
                          </span>
                          <span className="text-[9px] text-gray-500 mt-0.5 font-bold">Gemini Calls</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2 col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between text-gray-400">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'Medien-Download' : 'Media Download'}</span>
                          <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                            <HardDriveDownload className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-gray-900 leading-tight">
                            {formatDownloadSize(metrics.jobs?.mediaMb ?? 0)}
                          </span>
                          <span className="text-[9px] text-gray-500 mt-0.5 font-bold">{rangeLabel[metricsRange]}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Job Status Queue breakdown card */}
                    <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                        Queue Status Breakdown
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="bg-emerald-500/10 rounded-2xl p-4 flex flex-col items-center border-none">
                          <span className="text-xs font-bold text-emerald-600">{isDe ? 'Erfolgreich' : 'Succeeded'}</span>
                          <span className="text-2xl font-black text-emerald-700 mt-1">{metrics.jobs?.completed ?? 0}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowFailedJobs((prev) => !prev)}
                          className={`rounded-2xl p-4 flex flex-col items-center cursor-pointer transition-all border-none active:scale-95 ${
                            showFailedJobs ? 'bg-rose-500/20 ring-2 ring-rose-500/30 text-rose-700' : 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-600'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-bold">{isDe ? 'Fehlgeschlagen' : 'Failed'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFailedJobs ? 'rotate-180' : ''}`} />
                          </div>
                          <span className="text-2xl font-black mt-1">{metrics.jobs?.failed ?? 0}</span>
                          <span className="text-[10px] font-bold underline mt-0.5">
                            {showFailedJobs ? (isDe ? 'Verbergen' : 'Hide') : (isDe ? 'Details' : 'Details')}
                          </span>
                        </button>
                        <div className="bg-blue-500/10 rounded-2xl p-4 flex flex-col items-center border-none">
                          <span className="text-xs font-bold text-blue-600">{isDe ? 'Aktiv' : 'Processing'}</span>
                          <span className="text-2xl font-black text-blue-700 mt-1">{metrics.jobs?.processing ?? 0}</span>
                        </div>
                        <div className="bg-amber-500/10 rounded-2xl p-4 flex flex-col items-center border-none">
                          <span className="text-xs font-bold text-amber-600">{isDe ? 'Wartend' : 'Pending'}</span>
                          <span className="text-2xl font-black text-amber-700 mt-1">{metrics.jobs?.pending ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2b. Failed Job Details Card (Shown on click of Failed Queue Status) */}
                    {showFailedJobs && (
                      <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider leading-none">
                                {isDe ? 'Fehlgeschlagene Jobs' : 'Failed Jobs'}
                              </h3>
                              <span className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                                {isDe ? `Zeitraum: ${rangeLabel[metricsRange]}` : `Timeframe: ${rangeLabel[metricsRange]}`}
                              </span>
                            </div>
                            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold shrink-0 border-none">
                              {metrics.jobs?.failedJobs?.length ?? 0}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowFailedJobs(false)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 border-none"
                            aria-label="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {(!metrics.jobs?.failedJobs || metrics.jobs.failedJobs.length === 0) ? (
                          <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border-none">
                            <p className="text-xs text-gray-500 font-medium">
                              {isDe ? 'Keine fehlgeschlagenen Jobs im gewählten Zeitraum vorhanden.' : 'No failed jobs found in the selected timeframe.'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                            {metrics.jobs.failedJobs.map((job: any) => (
                              <div key={job.id} className="p-4 bg-gray-50 rounded-2xl border-none flex flex-col gap-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      <span className="font-bold text-gray-900 truncate" title={job.email || job.userId}>
                                        {job.email || job.userId}
                                      </span>
                                      <span className="text-[10px] font-mono text-gray-600 bg-white px-1.5 py-0.5 rounded-lg border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                        ID: {job.id.slice(0, 8)}...
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-rose-600 font-mono font-medium">
                                      {formatDate(job.createdAt)}
                                    </span>
                                  </div>
                                  {job.url && !job.url.startsWith('photo://') && (
                                    <a
                                      href={job.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 shrink-0 self-start bg-emerald-500/10 rounded-xl transition-all border-none active:scale-95"
                                    >
                                      <span>{isDe ? 'Reel öffnen' : 'Open Reel'}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>

                                {/* Error Details Container */}
                                <div className="p-3 bg-white rounded-xl text-[11px] font-mono text-rose-600 break-words leading-relaxed whitespace-pre-wrap border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                                  <span className="font-bold text-rose-600 uppercase tracking-wider text-[9px] block mb-1">
                                    {isDe ? 'Fehlergrund:' : 'Error details:'}
                                  </span>
                                  {job.error || (isDe ? 'Keine genauere Fehlermeldung hinterlegt.' : 'No detailed error message provided.')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. LLM Breakdown Table */}
                    {metrics.llm?.breakdown && Object.keys(metrics.llm.breakdown).length > 0 && (
                      <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-4 overflow-hidden">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                          {isDe ? 'LLM Kosten nach Funktion' : 'LLM Costs by Function'}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-gray-700 border-collapse">
                            <thead>
                              <tr className="border-b border-black/5 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                <th className="pb-2.5 font-bold">{isDe ? 'Funktion' : 'Function'}</th>
                                <th className="pb-2.5 text-right font-bold">{isDe ? 'Anfragen' : 'Requests'}</th>
                                <th className="pb-2.5 text-right font-bold">Tokens</th>
                                <th className="pb-2.5 text-right font-bold">{isDe ? 'Kosten (USD)' : 'Costs (USD)'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 font-medium">
                              {Object.entries(metrics.llm.breakdown).map(([key, value]: [string, any]) => (
                                <tr key={key} className="text-gray-900">
                                  <td className="py-2.5 font-mono text-[11px] text-gray-700">{key}</td>
                                  <td className="py-2.5 text-right">{value.count}</td>
                                  <td className="py-2.5 text-right font-mono">{value.tokens.toLocaleString()}</td>
                                  <td className="py-2.5 text-right font-mono text-amber-600">${value.cost.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 4. Daily stats list acting as elegant visual bar-charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Daily Extractions */}
                      <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                          {isDe ? 'Extraktionen' : 'Extractions'} ({rangeLabel[metricsRange]})
                        </h3>
                        {metrics.jobs?.dailyStats && metrics.jobs.dailyStats.length > 0 ? (
                          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                            {metrics.jobs.dailyStats.map((stat: any) => {
                              const maxCount = Math.max(...metrics.jobs.dailyStats.map((s: any) => s.count), 1);
                              const pct = (stat.count / maxCount) * 100;
                              return (
                                <div key={stat.date} className="flex items-center gap-3 text-[11px]">
                                  <span className="w-12 sm:w-20 text-gray-500 font-mono font-medium shrink-0">{stat.date.slice(5)}</span>
                                  <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="w-6 text-right font-black text-gray-900 shrink-0">{stat.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-xs text-gray-500 py-8 font-medium">
                            {isDe ? 'Keine Extraktionen im Zeitraum.' : 'No extractions in timeframe.'}
                          </p>
                        )}
                      </div>

                      {/* Daily Costs */}
                      <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                          {isDe ? 'LLM Kosten' : 'LLM Costs'} ({rangeLabel[metricsRange]})
                        </h3>
                        {(() => {
                          const dailyCosts = metrics.llm?.dailyCost || metrics.llm?.dailyStats;
                          if (!dailyCosts || dailyCosts.length === 0) {
                            return (
                              <p className="text-center text-xs text-gray-500 py-8 font-medium">
                                {isDe ? 'Keine Kosten im Zeitraum.' : 'No costs in timeframe.'}
                              </p>
                            );
                          }
                          const maxCost = Math.max(...dailyCosts.map((s: any) => Number(s.cost || 0)), 0.0001);
                          return (
                            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                              {dailyCosts.map((stat: any) => {
                                const costVal = Number(stat.cost || 0);
                                const pct = (costVal / maxCost) * 100;
                                return (
                                  <div key={stat.date} className="flex items-center gap-3 text-[11px]">
                                    <span className="w-12 sm:w-20 text-gray-500 font-mono font-medium shrink-0">{stat.date.slice(5)}</span>
                                    <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                    <span className="w-16 text-right font-black font-mono text-gray-900 shrink-0">
                                      ${costVal.toFixed(4)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 5. Extracted recipes per user (only users with >0 in range) */}
                    <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                        {isDe ? 'Extrahierte Rezepte pro Nutzer' : 'Extracted Recipes per User'} ({rangeLabel[metricsRange]})
                      </h3>
                      {metrics.extractionsPerUser && metrics.extractionsPerUser.length > 0 ? (
                        <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {metrics.extractionsPerUser.map((entry: any) => {
                            const maxCount = Math.max(
                              ...metrics.extractionsPerUser.map((e: any) => e.count),
                              1,
                            );
                            const pct = (entry.count / maxCount) * 100;
                            return (
                              <div key={entry.userId} className="flex items-center gap-3 text-[11px]">
                                <span className="w-28 sm:w-48 truncate text-gray-700 font-semibold shrink-0" title={entry.email || entry.userId}>
                                  {entry.email || entry.userId}
                                </span>
                                <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right font-black text-gray-900 shrink-0">{entry.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-gray-500 py-8 font-medium">
                          {isDe ? 'Keine Extraktionen im Zeitraum.' : 'No extractions in timeframe.'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Panel: Users */}
            {activeTab === 'users' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border-none">
                  {(
                    [
                      { id: 'all', label: isDe ? 'Alle Nutzer' : 'All Users' },
                      { id: 'today', label: isDe ? 'Heute' : 'Today' },
                      { id: '7d', label: isDe ? '7 Tage' : '7 days' },
                      { id: '30d', label: isDe ? '30 Tage' : '30 days' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUsersRange(id)}
                      className={`flex-1 min-w-[40%] sm:min-w-0 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${usersRange === id
                          ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                          : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {filteredUsers.length}{' '}
                        {usersRange === 'all'
                          ? (isDe ? 'registrierte Nutzer' : 'registered users')
                          : (isDe ? 'neue Nutzer' : 'new users')}
                      </span>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={isDe ? 'Nutzer filtern...' : 'Filter users...'}
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full bg-gray-100 pl-8 pr-7 py-1.5 text-xs rounded-xl border-none font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-gray-400"
                        />
                        {userSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setUserSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer border-none p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8 font-medium">
                        {userSearchQuery
                          ? (isDe ? 'Keine Nutzer für diese Suche gefunden.' : 'No users matching your search.')
                          : (isDe ? 'Keine Nutzer im gewählten Zeitraum.' : 'No users found for this timeframe.')}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {filteredUsers.map((user: any) => {
                          const tierColor =
                            user.tier === 'premium'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : user.tier === 'alpha'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-gray-100 text-gray-600';

                          const fmt = (iso: string | null) => {
                            if (!iso) return '—';
                            const d = new Date(iso);
                            return d.toLocaleDateString(isDe ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                          };

                          return (
                            <div
                              key={user.id}
                              className="p-3.5 sm:p-4 bg-gray-50/70 hover:bg-gray-50 border-none rounded-2xl flex items-start sm:items-center gap-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-all"
                            >
                              {/* Avatar circle with user initial */}
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                                  user.tier === 'premium'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : user.tier === 'alpha'
                                      ? 'bg-amber-500/10 text-amber-600'
                                      : 'bg-gray-200/70 text-gray-700'
                                }`}
                              >
                                {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                {/* Email + tier badge */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
                                  <span className="text-sm font-bold text-gray-900 truncate" title={user.email}>
                                    {user.email}
                                  </span>

                                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border-none ${tierColor}`}>
                                      {user.tier || 'free'}
                                    </span>
                                    {user.custom_limit !== null && user.custom_limit !== undefined && (
                                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-500/10 text-purple-600 border-none">
                                        limit: {user.custom_limit === -1 ? '∞' : user.custom_limit}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Metrics & Dates */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-gray-500">
                                  <div className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-lg border-none">
                                    <BookOpen className="w-3 h-3 text-emerald-600" />
                                    <span>{user.extractions_count ?? 0} {isDe ? 'Extraktionen' : 'extractions'}</span>
                                  </div>

                                  <div className="inline-flex items-center gap-1 text-gray-500">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span>{isDe ? 'Registriert:' : 'Joined:'} {fmt(user.created_at)}</span>
                                  </div>

                                  <div className="inline-flex items-center gap-1 text-gray-500">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span>{isDe ? 'Letzter Login:' : 'Last login:'} {fmt(user.last_sign_in_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Lightbox for screenshots */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Enlarged feedback screenshot" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]" />
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
