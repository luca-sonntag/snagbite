import { useState, useEffect, useCallback } from 'react';
import { Tabs, Card, TextField, Label, Input, Button, Spinner } from '@heroui/react';
import { Shield, Save, MessageSquare, Settings, AlertCircle, Bug, Lightbulb, X, Terminal, BarChart3, Users, BookOpen, Coins, HardDriveDownload, ChevronDown, LogOut, Globe } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'settings' | 'feedback' | 'metrics' | 'users'>('settings');
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [metricsRange, setMetricsRange] = useState<'all' | 'today' | '3d' | '7d' | '30d'>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [usersRange, setUsersRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showFailedJobs, setShowFailedJobs] = useState(false);

  const isDe = language === 'de';

  const rangeLabel: Record<'all' | 'today' | '3d' | '7d' | '30d', string> = {
    all: isDe ? 'Gesamt' : 'All time',
    today: isDe ? 'Heute' : 'Today',
    '3d': isDe ? 'Letzte 3 Tage' : 'Last 3 days',
    '7d': isDe ? 'Letzte 7 Tage' : 'Last 7 days',
    '30d': isDe ? 'Letzte 30 Tage' : 'Last 30 days',
  };

  const filteredUsers = (() => {
    if (usersRange === 'all') return users;
    const days = usersRange === 'today' ? 1 : usersRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return users.filter((u: any) => u.created_at && new Date(u.created_at) >= cutoff);
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
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Administration
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {isDe ? 'Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            {userEmail && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {userEmail}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(l => l === 'de' ? 'en' : 'de')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            {language.toUpperCase()}
          </button>
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDe ? 'Abmelden' : 'Sign Out'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner color="success" size="lg" />
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {isDe ? 'Lade Daten...' : 'Loading data...'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tabs Navigation */}
          <Tabs selectedKey={activeTab} onSelectionChange={(key) => { setError(null); setActiveTab(key as any); }} className="w-full">
            <Tabs.ListContainer className="w-full">
              <Tabs.List className="flex w-full mb-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                {(
                  [
                    { id: 'settings', icon: <Settings className="w-4 h-4" />, label: isDe ? 'Konfiguration' : 'Config' },
                    { id: 'feedback', icon: <MessageSquare className="w-4 h-4" />, label: 'Feedback' },
                    { id: 'metrics', icon: <BarChart3 className="w-4 h-4" />, label: isDe ? 'Metriken' : 'Metrics' },
                    { id: 'users', icon: <Users className="w-4 h-4" />, label: isDe ? 'Nutzer' : 'Users' },
                  ] as const
                ).map(({ id, icon, label }) => (
                  <Tabs.Tab
                    key={id}
                    id={id}
                    className="flex-1 py-2.5 text-center font-semibold transition-all cursor-pointer rounded-xl !text-gray-500 dark:!text-gray-400 data-[selected=true]:bg-white dark:data-[selected=true]:bg-gray-800 data-[selected=true]:!text-emerald-600 dark:data-[selected=true]:!text-emerald-400 data-[selected=true]:shadow-sm hover:!text-gray-900 dark:hover:!text-white"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm">
                      {icon}
                      <span>{label}</span>
                    </div>
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>

            {/* Notification Alerts */}
            {error && (
              <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-3">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold">{successMessage}</span>
              </div>
            )}

            {/* Panel: Settings */}
            <Tabs.Panel id="settings">
              <div className="flex flex-col gap-6">
                <Card className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                  <div className="flex flex-col gap-6">
                    {settings.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {isDe ? 'Keine Einstellungen vorhanden.' : 'No settings available.'}
                      </p>
                    ) : (
                      settings.map((setting) => {
                        const isBoolean = setting.value === 'true' || setting.value === 'false';
                        const isNumber = !isBoolean && !isNaN(Number(setting.value));
                        const currentValue = localSettings[setting.key] ?? setting.value;

                        return (
                          <div key={setting.key} className="flex flex-col gap-2 pb-5 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {setting.key}
                                </label>
                                {setting.description && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {setting.description}
                                  </span>
                                )}
                              </div>

                              {isBoolean && (
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSettingChange(setting.key, 'true')}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentValue === 'true'
                                        ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                      }`}
                                  >
                                    {isDe ? 'Ja' : 'Yes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSettingChange(setting.key, 'false')}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentValue === 'false'
                                        ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                      }`}
                                  >
                                    {isDe ? 'Nein' : 'No'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {!isBoolean && (
                              <TextField
                                fullWidth
                                name={setting.key}
                                value={currentValue}
                                onChange={(val) => handleSettingChange(setting.key, val)}
                              >
                                <Label className="sr-only">{setting.key}</Label>
                                <Input
                                  type={isNumber ? 'number' : 'text'}
                                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  aria-label={setting.key}
                                />
                              </TextField>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>

                {settings.length > 0 && (
                  <Button
                    type="button"
                    isDisabled={saving}
                    onPress={handleSaveSettings}
                    className={`py-3.5 h-12 text-sm rounded-2xl font-semibold shadow-md shadow-emerald-600/20 text-white ${saving
                        ? 'bg-emerald-800 shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer'
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
              </div>
            </Tabs.Panel>

            {/* Panel: Feedback */}
            <Tabs.Panel id="feedback">
              <div className="flex flex-col gap-4">
                {feedback.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
                    {isDe ? 'Bisher kein Feedback eingegangen.' : 'No feedback submissions received yet.'}
                  </p>
                ) : (
                  feedback.map((item) => {
                    const isBug = item.type === 'bug';
                    const email = item.context?.email || (isDe ? 'Unbekannter Benutzer' : 'Unknown User');
                    const isExpanded = expandedFeedbackId === item.id;

                    return (
                      <Card key={item.id} className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-3xl shadow-sm overflow-hidden p-5">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isBug ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                                    <Bug className="w-3 h-3 text-rose-500" />
                                    Bug
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                                    <Lightbulb className="w-3 h-3 text-teal-500" />
                                    Idea
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold font-mono">
                                  {formatDate(item.created_at)}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {email}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl">
                            <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                              {item.message}
                            </p>
                          </div>

                          {item.screenshot_urls && item.screenshot_urls.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {isDe ? 'Screenshots / Anhänge:' : 'Screenshots / Attachments:'}
                              </span>
                              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                                {item.screenshot_urls.map((url, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setLightboxImage(url)}
                                    className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shrink-0 active:scale-95 hover:brightness-95 transition-all cursor-pointer bg-gray-100 dark:bg-gray-800"
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
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer outline-none"
                              >
                                <span>
                                  {isExpanded
                                    ? (isDe ? 'Details ausblenden' : 'Hide Details')
                                    : (isDe ? 'Geräte- & Diagnosedaten anzeigen' : 'Show Device & Diagnostic Data')
                                  }
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col gap-2 font-mono text-[11px] text-gray-600 dark:text-gray-400 overflow-x-auto">
                                  <div><span className="font-bold text-gray-400">Platform:</span> {item.context.platform} ({item.context.isNative ? 'Native' : 'Web'})</div>
                                  <div><span className="font-bold text-gray-400">App Version:</span> v{item.context.appVersion} (Build {item.context.appBuild})</div>
                                  <div><span className="font-bold text-gray-400">Tier / Language:</span> lang: {item.context.language} | tier: {item.context.tier}</div>
                                  <div><span className="font-bold text-gray-400">Viewport:</span> {item.context.viewport}</div>
                                  <div><span className="font-bold text-gray-400">Route:</span> {item.context.route}</div>
                                  <div className="break-all"><span className="font-bold text-gray-400">User Agent:</span> {item.context.userAgent}</div>

                                  {item.context.logs && item.context.logs.length > 0 && (
                                    <div className="mt-2 border-t border-gray-200 dark:border-gray-800 pt-2 flex flex-col gap-1.5">
                                      <div className="font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 text-[9px] mb-1">
                                        <Terminal className="w-3.5 h-3.5" />
                                        {isDe ? 'Konsolen-Protokoll:' : 'Console Logs:'}
                                      </div>
                                      <div className="max-h-48 overflow-y-auto bg-black text-gray-300 p-3 rounded-xl text-[9px] leading-tight space-y-1 font-mono">
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
                      </Card>
                    );
                  })
                )}
              </div>
            </Tabs.Panel>

            {/* Panel: Metrics */}
            <Tabs.Panel id="metrics">
              <div className="flex flex-col gap-6">
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                  {(
                    [
                      { id: 'all', label: isDe ? 'Alle' : 'All' },
                      { id: 'today', label: isDe ? 'Heute' : 'Today' },
                      { id: '3d', label: isDe ? '3 Tage' : 'Last 3 days' },
                      { id: '7d', label: isDe ? '7 Tage' : 'Last 7 days' },
                      { id: '30d', label: isDe ? '30 Tage' : 'Last 30 days' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMetricsRange(id)}
                      className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${metricsRange === id
                          ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card
                        className="p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 flex flex-col gap-2 cursor-pointer hover:ring-2 hover:ring-emerald-500/30 transition-all"
                        onClick={() => { setError(null); setActiveTab('users'); }}
                      >
                        <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {metricsRange === 'all' ? (isDe ? 'Nutzer' : 'Users') : (isDe ? 'Neue Nutzer' : 'New Users')}
                          </span>
                          <Users className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            {metricsRange === 'all' ? (metrics.users?.total ?? 0) : (metrics.users?.newInRange ?? 0)}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {metricsRange === 'all' ? (isDe ? 'Registriert' : 'Registered') : rangeLabel[metricsRange]}
                          </span>
                        </div>
                      </Card>

                      <Card className="p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'Rezepte' : 'Recipes'}</span>
                          <BookOpen className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            {metrics.jobs?.total ?? 0}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{isDe ? 'Extraktionen' : 'Extractions'}</span>
                        </div>
                      </Card>

                      <Card className="p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'LLM Kosten' : 'LLM Costs'}</span>
                          <Coins className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            ${metrics.llm?.totalCostUsd?.toFixed(4) ?? '0.0000'}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{rangeLabel[metricsRange]}</span>
                        </div>
                      </Card>

                      <Card className="p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
                          <span className="text-[10px] font-bold uppercase tracking-wider">{isDe ? 'Medien-Download' : 'Media Download'}</span>
                          <HardDriveDownload className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            {formatDownloadSize(metrics.jobs?.mediaMb ?? 0)}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{rangeLabel[metricsRange]}</span>
                        </div>
                      </Card>
                    </div>

                    <Card className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                        Queue Status Breakdown
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="bg-emerald-500/10 rounded-2xl p-4 flex flex-col items-center">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{isDe ? 'Erfolgreich' : 'Succeeded'}</span>
                          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.jobs?.completed ?? 0}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowFailedJobs((prev) => !prev)}
                          className={`bg-rose-500/10 rounded-2xl p-4 flex flex-col items-center cursor-pointer transition-all ${
                            showFailedJobs ? 'ring-2 ring-rose-500' : 'hover:scale-[1.02]'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{isDe ? 'Fehlgeschlagen' : 'Failed'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-rose-500 transition-transform ${showFailedJobs ? 'rotate-180' : ''}`} />
                          </div>
                          <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{metrics.jobs?.failed ?? 0}</span>
                        </button>
                        <div className="bg-blue-500/10 rounded-2xl p-4 flex flex-col items-center">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{isDe ? 'Aktiv' : 'Processing'}</span>
                          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{metrics.jobs?.processing ?? 0}</span>
                        </div>
                        <div className="bg-amber-500/10 rounded-2xl p-4 flex flex-col items-center">
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{isDe ? 'Wartend' : 'Pending'}</span>
                          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{metrics.jobs?.pending ?? 0}</span>
                        </div>
                      </div>
                    </Card>

                    {showFailedJobs && (
                      <Card className="p-6 rounded-3xl border border-rose-500/20 bg-white dark:bg-gray-900 shadow-lg flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                            {isDe ? 'Fehlgeschlagene Jobs' : 'Failed Jobs'} ({metrics.jobs?.failedJobs?.length ?? 0})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowFailedJobs(false)}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {(!metrics.jobs?.failedJobs || metrics.jobs.failedJobs.length === 0) ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                            {isDe ? 'Keine fehlgeschlagenen Jobs im gewählten Zeitraum.' : 'No failed jobs found.'}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                            {metrics.jobs.failedJobs.map((job: any) => (
                              <div key={job.id} className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-2xl flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{job.email || job.userId}</span>
                                  <span className="text-[10px] font-mono text-gray-400">{formatDate(job.createdAt)}</span>
                                </div>
                                {job.errorReason && (
                                  <p className="text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-500/10 p-2 rounded-xl">
                                    {job.errorReason}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                ) : null}
              </div>
            </Tabs.Panel>

            {/* Panel: Users */}
            <Tabs.Panel id="users">
              <div className="flex flex-col gap-6">
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                  {(
                    [
                      { id: 'all', label: isDe ? 'Alle Nutzer' : 'All Users' },
                      { id: 'today', label: isDe ? 'Heute registriert' : 'Registered Today' },
                      { id: '7d', label: isDe ? 'Letzte 7 Tage' : 'Last 7 days' },
                      { id: '30d', label: isDe ? 'Letzte 30 Tage' : 'Last 30 days' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUsersRange(id)}
                      className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${usersRange === id
                          ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <Card className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {isDe ? `Nutzerliste (${filteredUsers.length})` : `User Directory (${filteredUsers.length})`}
                      </span>
                    </div>

                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                        {isDe ? 'Keine Nutzer im gewählten Zeitraum.' : 'No users found for this timeframe.'}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {filteredUsers.map((u: any) => (
                          <div key={u.id} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                {u.email}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                ID: {u.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {u.app_metadata?.tier || 'free'}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                {formatDate(u.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>
      )}

      {/* Lightbox for screenshots */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Enlarged feedback screenshot" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
