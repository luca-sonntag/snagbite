import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useModalOverlay } from '../context/OverlayStackContext';
import { enablePushNotifications } from '../push';
import { isNative } from '../native';

const PROMPT_DISMISSED_AT_KEY = 'snagbite_notification_prompt_dismissed_at';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const ALL_CATEGORY_IDS = ['seasonal', 'reminders', 'timing', 'taste', 'motivation'];

interface NotificationPromptProps {
  savedCount: number;
}

export default function NotificationPrompt({ savedCount }: NotificationPromptProps) {
  const { t } = useI18n();
  const { user, updateUserMetadata, getAccessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAtStr = localStorage.getItem(PROMPT_DISMISSED_AT_KEY);
    if (!dismissedAtStr) return false;
    const dismissedAt = parseInt(dismissedAtStr, 10);
    if (isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < FOURTEEN_DAYS_MS;
  });

  const isEnabled = user?.user_metadata?.notifications_enabled === true;
  const isDismissedInMeta = user?.user_metadata?.notification_prompt_dismissed === true;

  const shouldShow =
    !!user &&
    savedCount >= 1 &&
    !isEnabled &&
    !isDismissedInMeta &&
    !dismissedLocally;

  const handleDismiss = () => {
    localStorage.setItem(PROMPT_DISMISSED_AT_KEY, Date.now().toString());
    setDismissedLocally(true);
  };

  useModalOverlay(shouldShow, handleDismiss);

  useEffect(() => {
    if (!shouldShow) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const granted = await enablePushNotifications(getAccessToken);
      if (!granted && isNative()) {
        setBusy(false);
        return; // OS permission denied -> do not change state
      }

      const timezone = (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          return undefined;
        }
      })();

      await updateUserMetadata({
        notifications_enabled: true,
        notification_categories: ALL_CATEGORY_IDS,
        ...(timezone ? { notification_timezone: timezone } : {}),
        notification_prompt_dismissed: true,
      });
      localStorage.removeItem(PROMPT_DISMISSED_AT_KEY);
      setDismissedLocally(true);
    } catch (err) {
      console.warn('Failed to enable notifications from prompt:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 touch-none">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-none p-7 pt-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Dismiss X button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          aria-label={t('notification.prompt.dismiss')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center mb-5">
          <Bell className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {t('notification.prompt.title')}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed px-1">
          {t('notification.prompt.description')}
        </p>

        {/* Value Proposition Bullets */}
        <div className="flex flex-col gap-3.5 text-left w-full my-6 text-xs text-slate-700 dark:text-slate-300 font-medium px-1">
          <div className="flex items-center gap-3">
            <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>{t('notification.prompt.feature1')}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>{t('notification.prompt.feature2')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer text-center"
          >
            {busy ? '...' : t('notification.prompt.enable')}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="w-full py-2.5 px-4 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold transition-colors cursor-pointer text-center"
          >
            {t('notification.prompt.later')}
          </button>
        </div>
      </div>
    </div>
  );
}
