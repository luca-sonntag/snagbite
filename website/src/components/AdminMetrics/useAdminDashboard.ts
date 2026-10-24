import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../api';
import type {
  AdminMetricsData,
  AdminUserItem,
  FeedbackItem,
  GlobalSetting,
  MetricsRange,
  MetricsSubTab,
} from './types';

export function useAdminDashboard(getAccessToken: () => Promise<string | null>) {
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [activeTab, setActiveTab] = useState<'settings' | 'feedback' | 'metrics' | 'users'>(
    'metrics',
  );
  const [metricsSubTab, setMetricsSubTab] = useState<MetricsSubTab>('growth');
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<AdminMetricsData | null>(null);
  const [metricsRange, setMetricsRange] = useState<MetricsRange>('today');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [triggeringPush, setTriggeringPush] = useState(false);
  const [pushResult, setPushResult] = useState<{
    usersScanned: number;
    deliveredCount: number;
    logs: string[];
  } | null>(null);

  const isDe = language === 'de';

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/settings'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = (data.settings ?? []) as GlobalSetting[];
        setSettings(list);
        const mapped = list.reduce((acc: Record<string, string>, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setLocalSettings(mapped);
      } else {
        throw new Error(data.error || 'Failed to fetch settings');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(
        isDe ? 'Einstellungen konnten nicht geladen werden.' : 'Failed to load settings.',
      );
    }
  }, [getAccessToken, isDe]);

  const fetchFeedback = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/feedback'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback((data.feedback ?? []) as FeedbackItem[]);
      } else {
        throw new Error(data.error || 'Failed to fetch feedback');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(isDe ? 'Feedback konnte nicht geladen werden.' : 'Failed to load feedback.');
    }
  }, [getAccessToken, isDe]);

  const fetchMetrics = useCallback(
    async (range: MetricsRange) => {
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/admin/metrics?range=${range}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMetrics(data as AdminMetricsData);
        } else {
          throw new Error(data.error || 'Failed to fetch metrics');
        }
      } catch (err: unknown) {
        console.error(err);
        setError(isDe ? 'Metriken konnten nicht geladen werden.' : 'Failed to load metrics.');
      }
    },
    [getAccessToken, isDe],
  );

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/admin/users'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((data.users ?? []) as AdminUserItem[]);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(isDe ? 'Nutzer konnten nicht geladen werden.' : 'Failed to load users.');
    }
  }, [getAccessToken, isDe]);

  useEffect(() => {
    if (activeTab === 'metrics') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const run = async () => {
      if (activeTab === 'settings') await fetchSettings();
      else if (activeTab === 'feedback') await fetchFeedback();
      else if (activeTab === 'users') await fetchUsers();
      if (!cancelled) setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, fetchSettings, fetchFeedback, fetchUsers]);

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
          Authorization: `Bearer ${token}`,
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
    } catch (err: unknown) {
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult(data.result || null);
        setSuccessMessage(
          isDe
            ? `Push-Notification Worker getriggert! (${data.result?.deliveredCount ?? 0} zugestellt)`
            : `Push notification worker executed! (${data.result?.deliveredCount ?? 0} delivered)`,
        );
      } else {
        setError(
          data.message ||
            (isDe ? 'Fehler beim Triggern.' : 'Failed to trigger notifications.'),
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || (isDe ? 'Netzwerkfehler.' : 'Network error.'));
    } finally {
      setTriggeringPush(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  return {
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
  };
}
