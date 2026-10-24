import { Button, Spinner } from '@heroui/react';
import { Bell, Save } from 'lucide-react';
import type { GlobalSetting } from './types';

interface AdminSettingsPanelProps {
  isDe: boolean;
  settings: GlobalSetting[];
  localSettings: Record<string, string>;
  onSettingChange: (key: string, value: string) => void;
  saving: boolean;
  onSaveSettings: () => void;
  triggeringPush: boolean;
  onTriggerPush: () => void;
  pushResult: {
    usersScanned: number;
    deliveredCount: number;
    logs: string[];
  } | null;
}

export function AdminSettingsPanel({
  isDe,
  settings,
  localSettings,
  onSettingChange,
  saving,
  onSaveSettings,
  triggeringPush,
  onTriggerPush,
  pushResult,
}: AdminSettingsPanelProps) {
  return (
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
              const isNumber = !isBoolean && !Number.isNaN(Number(setting.value));
              const currentValue = localSettings[setting.key] ?? setting.value;

              return (
                <div
                  key={setting.key}
                  className="flex flex-col gap-2 pb-5 border-b border-black/5 last:border-0 last:pb-0"
                >
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
                          onClick={() => onSettingChange(setting.key, 'true')}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                            currentValue === 'true'
                              ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {isDe ? 'Ja' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSettingChange(setting.key, 'false')}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none ${
                            currentValue === 'false'
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
                      onChange={(e) => onSettingChange(setting.key, e.target.value)}
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
          onPress={onSaveSettings}
          className={`py-3.5 h-12 text-sm rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${
            saving ? 'opacity-60 cursor-not-allowed' : 'transition-all cursor-pointer'
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
              <h3 className="text-sm font-bold text-gray-900">
                {isDe ? 'Push-Notifications testen' : 'Test Push Notifications'}
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
            onPress={onTriggerPush}
            className="py-2.5 px-4 text-xs font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all cursor-pointer shrink-0"
          >
            {triggeringPush ? (
              <Spinner color="current" size="sm" />
            ) : isDe ? (
              'Jetzt triggern'
            ) : (
              'Trigger now'
            )}
          </Button>
        </div>

        {pushResult && pushResult.logs && pushResult.logs.length > 0 && (
          <div className="mt-2 pt-3 border-t border-black/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>{isDe ? 'Ergebnis-Protokoll:' : 'Execution Logs:'}</span>
              <span className="text-emerald-600 font-mono">
                {pushResult.deliveredCount} {isDe ? 'Zugestellt' : 'Delivered'}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto bg-gray-950 text-gray-200 p-3.5 rounded-2xl text-[10px] leading-relaxed space-y-1 font-mono border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
              {pushResult.logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.startsWith('DELIVERED')
                      ? 'text-emerald-400 font-bold'
                      : log.includes('No registered') ||
                          log.includes('Outside') ||
                          log.includes('Already')
                        ? 'text-amber-300'
                        : 'text-gray-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
