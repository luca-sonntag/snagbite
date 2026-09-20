import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { enablePushNotifications, disablePushNotifications } from '../push';
import { isNative } from '../native';
import { hapticLight } from '../utils/haptics';

// The five opt-in groups. Ids match the backend NotificationCategory union.
const CATEGORY_IDS = ['seasonal', 'reminders', 'timing', 'taste', 'motivation'] as const;

function Toggle({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
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

export default function NotificationSettings() {
  const { language } = useI18n();
  const { user, updateUserMetadata, getAccessToken } = useAuth();
  const isDe = language === 'de';
  const [busy, setBusy] = useState(false);

  const enabled = user?.user_metadata?.notifications_enabled === true;

  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  })();

  const handleMasterToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!enabled) {
        // Ask the OS for permission and register the device before persisting.
        const granted = await enablePushNotifications(getAccessToken);
        if (!granted && isNative()) {
          setBusy(false);
          return; // permission denied -> stay off
        }
        await updateUserMetadata({
          notifications_enabled: true,
          notification_categories: Array.from(CATEGORY_IDS),
          ...(timezone ? { notification_timezone: timezone } : {}),
          notification_prompt_dismissed: true,
        });
      } else {
        await disablePushNotifications(getAccessToken);
        await updateUserMetadata({ notifications_enabled: false });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        {isDe ? 'Benachrichtigungen' : 'Notifications'}
      </h3>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
        {/* Master toggle */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {isDe ? 'Push-Benachrichtigungen' : 'Push notifications'}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {isDe
                  ? 'Rezeptideen, Erinnerungen & Tipps rund ums Kochen – abgestimmt auf dein Kochbuch. Jederzeit deaktivierbar.'
                  : 'Recipe ideas, reminders & cooking tips based on your cookbook. Turn off anytime.'}
              </p>
            </div>
          </div>
          <Toggle on={enabled} onClick={handleMasterToggle} disabled={busy} label="Toggle notifications" />
        </div>
      </div>
    </div>
  );
}
