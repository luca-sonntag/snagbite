import { useEffect, useState } from 'react';
import { Select, ListBox, Popover } from '@heroui/react';
import { LogOut, Globe, Moon, Sun, Thermometer, Scale, Info, UserMinus, Sparkles, Crown, ChevronRight, HelpCircle, MessageSquare, Shield, ScrollText, Building2, ExternalLink } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useDialog } from '../context/DialogContext';
import PremiumModal from './PremiumModal';
import { FeedbackDrawer } from './FeedbackDrawer';
import { APP_VERSION_LABEL } from '../version';
import { getActiveOtaVersion } from '../utils/otaUpdater';
import { LEGAL_URLS } from '../legal';
import PremiumUpgradeCard from './PremiumUpgradeCard';
import { tint, TINT } from '../utils/tint';
import NotificationSettings from './NotificationSettings';

// Unit system is not yet ready to be user-configurable; keep the setting UI in place but hidden for now.
const SHOW_UNIT_SYSTEM_SETTING = false;

function SettingInfo({ text }: { text: string }) {
  return (
    <Popover>
      <Popover.Trigger>
        <button
          className="inline-flex align-middle ml-1 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors w-5 h-5 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 outline-none focus:ring-1 focus:ring-gray-400/30 cursor-pointer"
          aria-label={text}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        placement="top"
        className="max-w-[240px] p-2.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 border border-black/10 dark:border-white/10 rounded-xl shadow-lg"
      >
        <Popover.Dialog className="outline-none border-none p-0 m-0">
          {text}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

const getInitials = (email?: string) => {
  if (!email) return 'U';
  return email.charAt(0).toUpperCase();
};

export default function SettingsView() {
  const { t, language, setLanguage } = useI18n();
  const { signOut, user, autoSignedIn, updateUserMetadata, deleteAccount, isPremium, isAdmin } = useAuth();
  const dialog = useDialog();
  const [theme, setTheme] = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  // Version of the running OTA web bundle, null on stock (builtin) installs.
  const [otaVersion, setOtaVersion] = useState<string | null>(null);

  useEffect(() => {
    getActiveOtaVersion().then(setOtaVersion).catch(() => {});
  }, []);

  const preferredTempUnit = user?.user_metadata?.preferred_temperature_unit || 'Celsius';
  const preferredUnitSystem = user?.user_metadata?.preferred_unit_system || 'metric';

  const handleUpdateSetting = async (key: string, value: string) => {
    setIsSaving(true);
    setSaveMessage(null);
    const { error } = await updateUserMetadata({ [key]: value });
    setIsSaving(false);
    if (error) {
      setSaveMessage(error);
    } else {
      setSaveMessage(t('app.settings.saved') || 'Settings saved!');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };


  const handleDeleteAccount = async () => {
    const confirmed = await dialog.confirm({
      title: t('app.dialog.deleteAccount.title') || 'Delete Account?',
      message: t('app.dialog.deleteAccount.message') || 'Are you sure you want to delete your account?',
      confirmLabel: t('app.dialog.deleteAccount.confirm') || 'Delete',
      cancelLabel: t('app.dialog.deleteAccount.cancel') || 'Cancel',
      status: 'danger',
    });

    if (!confirmed) return;

    setIsSaving(true);
    setSaveMessage(null);
    const { error } = await deleteAccount();
    setIsSaving(false);
    if (error) {
      dialog.alert({
        title: t('app.dialog.deleteAccountError.title') || 'Error',
        message: error || t('app.dialog.deleteAccountError.message') || 'Could not delete account.',
        status: 'danger',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Title */}
      <div className="sticky top-[var(--app-sticky-top)] z-30 -mx-4 px-4 pt-2 pb-3 bg-gray-50/85 dark:bg-gray-950/85 backdrop-blur-md flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
          {t('app.nav.settings') || 'Settings'}
        </h2>
      </div>

      {/* Save Status / Error Notification */}
      {saveMessage && (
        <div className={`mx-2 px-4 py-2.5 text-xs text-center rounded-xl font-semibold border transition-all ${
          saveMessage === t('app.settings.saved')
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Profile Card */}
      <div
        style={tint(TINT.emerald)}
        className="mx-2 p-5 tint-surface-strong border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] rounded-3xl flex flex-col gap-4 relative overflow-hidden"
      >
        {isPremium && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
        )}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0 ${
            isPremium 
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/20 ring-2 ring-emerald-500/20' 
              : 'bg-gradient-to-tr from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 shadow-black/10'
          }`}>
            {getInitials(user?.email)}
          </div>
          <div className="flex flex-col min-w-0 font-sans">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {language === 'de' ? 'Konto' : 'Account'}
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-white truncate mt-0.5">
              {user?.email}
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              {user?.app_metadata?.tier === 'alpha' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
                  {t('app.settings.alphaActive') || 'Alpha Access'}
                </span>
              ) : isPremium ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  <Crown className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                  Premium
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-black/5 dark:border-white/5 uppercase tracking-wider">
                  Free Member
                </span>
              )}
            </div>
          </div>
        </div>

        {user?.app_metadata?.tier === 'alpha' ? (
          <div className="pt-3.5 border-t border-black/5 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {t('app.settings.alphaActiveDesc') || 'You are an alpha tester! You have free access to all premium features during the alpha. Extraction limits apply.'}
            </span>
          </div>
        ) : isPremium ? (
          <div className="pt-3.5 border-t border-black/5 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              {t('app.settings.premiumActiveDesc') || 'You have unlimited access to all premium features.'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Premium Upgrade Promotion (only for free members and alpha testers) */}
      <PremiumUpgradeCard onUpgradeClick={() => setIsPremiumModalOpen(true)} className="mx-2" />

      {/* Preferences Section */}
      <div className="flex flex-col gap-2">
        <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {language === 'de' ? 'Einstellungen' : 'Preferences'}
        </h3>
        
        <div style={tint(TINT.blue)} className="tint-surface rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
          {/* Language Option */}
          <div className="p-4 flex items-center justify-between gap-3 max-[400px]:flex-col max-[400px]:items-stretch max-[400px]:gap-2.5 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {t('app.settings.language') || 'Language'}
                </p>
              </div>
            </div>
            <Select
              variant="secondary"
              selectedKey={language}
              onSelectionChange={(key) => setLanguage(key as 'en' | 'de')}
              className="w-24 shrink-0 max-[400px]:w-full"
              aria-label="Language"
            >
              <Select.Trigger className="h-9 py-1.5 px-3 flex items-center leading-none rounded-xl bg-black/5 dark:bg-white/5 border-none shadow-none hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <Select.Value className="text-xs font-semibold" />
                <Select.Indicator className="size-3.5" />
              </Select.Trigger>
              <Select.Popover className="p-1 min-w-[100px] bg-white dark:bg-gray-950 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
                <ListBox>
                  <ListBox.Item id="en" textValue="EN" className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                    EN
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="de" textValue="DE" className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                    DE
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Temperature Unit Option */}
          <div className="p-4 flex items-center justify-between gap-3 max-[400px]:flex-col max-[400px]:items-stretch max-[400px]:gap-2.5 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl shrink-0">
                <Thermometer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center min-w-0">
                  <span className="truncate">{t('app.settings.tempUnit') || 'Temperature Unit'}</span>
                  <SettingInfo text={t('app.settings.settingInfoTooltip') || 'This setting only affects newly extracted recipes.'} />
                </div>
              </div>
            </div>
            <Select
              variant="secondary"
              selectedKey={preferredTempUnit}
              onSelectionChange={(key) => handleUpdateSetting('preferred_temperature_unit', key as string)}
              isDisabled={isSaving}
              className="w-36 shrink-0 max-[400px]:w-full"
              aria-label="Temperature Unit"
            >
              <Select.Trigger className="h-9 py-1.5 px-3 flex items-center leading-none rounded-xl bg-black/5 dark:bg-white/5 border-none shadow-none hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <Select.Value className="text-xs font-semibold" />
                <Select.Indicator className="size-3.5" />
              </Select.Trigger>
              <Select.Popover className="p-1 min-w-[150px] bg-white dark:bg-gray-950 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
                <ListBox>
                  <ListBox.Item id="Celsius" textValue={t('app.settings.tempUnitCelsius') || 'Celsius (°C)'} className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                    {t('app.settings.tempUnitCelsius') || 'Celsius (°C)'}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="Fahrenheit" textValue={t('app.settings.tempUnitFahrenheit') || 'Fahrenheit (°F)'} className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                    {t('app.settings.tempUnitFahrenheit') || 'Fahrenheit (°F)'}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="both" textValue={t('app.settings.tempUnitBoth') || 'Both (°C & °F)'} className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                    {t('app.settings.tempUnitBoth') || 'Both (°C & °F)'}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Unit System Option — hidden for now (not deleted): not yet ready to be user-configurable */}
          {SHOW_UNIT_SYSTEM_SETTING && (
            <div className="p-4 flex items-center justify-between gap-3 max-[400px]:flex-col max-[400px]:items-stretch max-[400px]:gap-2.5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center min-w-0">
                    <span className="truncate">{t('app.settings.unitSystem') || 'Unit System'}</span>
                    <SettingInfo text={t('app.settings.settingInfoTooltip') || 'This setting only affects newly extracted recipes.'} />
                  </div>
                </div>
              </div>
              <Select
                variant="secondary"
                selectedKey={preferredUnitSystem}
                onSelectionChange={(key) => handleUpdateSetting('preferred_unit_system', key as string)}
                isDisabled={isSaving}
                className="w-40 shrink-0 max-[400px]:w-full"
                aria-label="Unit System"
              >
                <Select.Trigger className="h-9 py-1.5 px-3 flex items-center leading-none rounded-xl bg-black/5 dark:bg-white/5 border-none shadow-none hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  <Select.Value className="text-xs font-semibold" />
                  <Select.Indicator className="size-3.5" />
                </Select.Trigger>
                <Select.Popover className="p-1 min-w-[170px] bg-white dark:bg-gray-950 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
                  <ListBox>
                    <ListBox.Item id="metric" textValue={t('app.settings.unitSystemMetric') || 'Metric (g, ml, kg)'} className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                      {t('app.settings.unitSystemMetric') || 'Metric (g, ml, kg)'}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="imperial" textValue={t('app.settings.unitSystemImperial') || 'Imperial (oz, cups, lbs)'} className="px-3.5 py-2.5 text-xs font-semibold rounded-lg">
                      {t('app.settings.unitSystemImperial') || 'Imperial (oz, cups, lbs)'}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          )}

          {/* Theme Option */}
          <div className="p-4 flex items-center justify-between gap-3 max-[400px]:flex-col max-[400px]:items-stretch max-[400px]:gap-2.5 border-b border-black/5 dark:border-white/5 last:border-b-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl shrink-0">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {t('app.settings.theme') || 'Appearance'}
                </p>
              </div>
            </div>
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl shrink-0 max-[400px]:w-full">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer max-[400px]:flex-1 ${
                  theme === 'light'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer max-[400px]:flex-1 ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5 shrink-0" />
                Dark
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Notifications Section */}
      <NotificationSettings />

      {/* Section: Admin */}
      {isAdmin && (() => {
        const websiteUrl = (import.meta.env.VITE_WEBSITE_URL as string | undefined) || 'http://localhost:5174';
        const adminPanelUrl = `${websiteUrl.replace(/\/$/, '')}/admin`;
        return (
          <div className="flex flex-col gap-2">
            <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              {language === 'de' ? 'Verwaltung' : 'Administration'}
            </h3>

          <div style={tint(TINT.violet)} className="tint-surface rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
            <a
              href={adminPanelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                    <span>{language === 'de' ? 'Admin-Bereich' : 'Admin Panel'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                    {language === 'de' ? 'Öffnet das Admin Dashboard auf der Website' : 'Opens the Admin Dashboard on the website'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      );
    })()}

      {/* Section: Help */}
      <div className="flex flex-col gap-2">
        <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {language === 'de' ? 'Hilfe' : 'Help'}
        </h3>

        <div style={tint(TINT.cyan)} className="tint-surface rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
          <button
            onClick={() => window.dispatchEvent(new Event('app:replay-onboarding'))}
            className="w-full p-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.99] text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-950 dark:text-white text-sm">
                  {t('onboarding.replayLabel')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.99] text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-950 dark:text-white text-sm">
                  {t('feedback.rowLabel') || 'Report a bug / Feedback'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Section: Legal (Datenschutz / AGB / Impressum) */}
      <div className="flex flex-col gap-2">
        <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {t('app.settings.legal.section') || 'Rechtliches'}
        </h3>

        <div style={tint(TINT.slate)} className="tint-surface rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
          {[
            { href: LEGAL_URLS.privacy, icon: Shield, label: t('app.settings.legal.privacy') || 'Datenschutzerklärung' },
            { href: LEGAL_URLS.terms, icon: ScrollText, label: t('app.settings.legal.terms') || 'AGB' },
            { href: LEGAL_URLS.imprint, icon: Building2, label: t('app.settings.legal.imprint') || 'Impressum' },
          ].map(({ href, icon: Icon, label }, idx, arr) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.99] text-left cursor-pointer group ${
                idx < arr.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-950 dark:text-white text-sm">
                    {label}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          ))}
        </div>
      </div>

      {/* Section: Account Actions */}
      <div className="flex flex-col gap-2">
        <h3 className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {language === 'de' ? 'Konto-Aktionen' : 'Account Actions'}
        </h3>
        
        <div style={tint(TINT.rose)} className="tint-surface rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden mx-2">
          {/* Logout Option */}
          {!autoSignedIn && (
            <button
              onClick={() => signOut()}
              className="w-full p-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-950 dark:text-white text-sm">
                    {t('auth.signOut') || 'Sign Out'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Delete Account Option */}
          <button
            onClick={handleDeleteAccount}
            disabled={isSaving}
            className="w-full p-4 flex items-center justify-between hover:bg-rose-500/5 dark:hover:bg-rose-500/10 transition-all active:scale-[0.99] text-left cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">
                  {t('app.settings.deleteAccount') || 'Delete Account'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-rose-500/60 dark:text-rose-400/60 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-4 mb-8">
        <p className="text-xs text-gray-400 dark:text-gray-600 font-medium">
          Snagbite {APP_VERSION_LABEL}{otaVersion ? ` · ota ${otaVersion}` : ''}
        </p>
      </div>

      {/* Premium Modal */}
      <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />

      {/* Feedback / Bug Report */}
      <FeedbackDrawer isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
