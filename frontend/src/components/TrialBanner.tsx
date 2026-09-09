import { useState, useEffect } from 'react';
import { Crown, X, Timer } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { hapticMedium } from '../utils/haptics';

/** Custom event name fired whenever the banner is dismissed on this device. */
export const TRIAL_BANNER_DISMISS_EVENT = 'snagbite:trial-banner-dismissed';
/** localStorage key shared with ExtractForm so the upgrade card can react. */
export const TRIAL_BANNER_STORAGE_KEY = 'snagbite_trial_banner_dismissed';

/** Read the current dismiss state from localStorage. Safe to call during SSR. */
export const isTrialBannerDismissed = (): boolean => {
  return typeof window !== 'undefined'
    && localStorage.getItem(TRIAL_BANNER_STORAGE_KEY) === '1';
};

interface TrialBannerProps {
  onOpenPremium: () => void;
  className?: string;
}

/**
 * One-time trial banner shown to free users after login.
 * Renders only when RevenueCat reports a free-trial offering; the
 * displayed "N Tage" badge is derived from the longest trial length
 * across all packages (no hardcoded value). Dismissed state is
 * persisted in localStorage and broadcast via a CustomEvent so other
 * components can react synchronously.
 */
export default function TrialBanner({ onOpenPremium, className = '' }: TrialBannerProps) {
  const { t } = useI18n();
  const { user, hasTrialAvailable, trialDays, trialLoading } = useAuth();
  const [dismissed, setDismissed] = useState(isTrialBannerDismissed);

  useEffect(() => {
    const handleDismiss = () => setDismissed(true);
    window.addEventListener(TRIAL_BANNER_DISMISS_EVENT, handleDismiss);
    return () => window.removeEventListener(TRIAL_BANNER_DISMISS_EVENT, handleDismiss);
  }, []);

  const isRealPremium = user?.app_metadata?.tier === 'premium';

  const dismiss = () => {
    localStorage.setItem(TRIAL_BANNER_STORAGE_KEY, '1');
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TRIAL_BANNER_DISMISS_EVENT));
    }
  };

  const show = !trialLoading
    && !isRealPremium
    && !dismissed
    && hasTrialAvailable
    && trialDays > 0;

  if (!show) return null;

  return (
    <div
      onClick={() => {
        hapticMedium();
        onOpenPremium();
      }}
      className={`cursor-pointer p-4 tint-premium rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:brightness-[0.98] dark:hover:brightness-110 active:scale-[0.99] transition-all relative overflow-hidden group ${className}`}
    >
      {/* Dismiss button — top right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 transition-all z-10"
        aria-label={t('premium.modal.trialBanner.dismiss')}
      >
        <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
      </button>

      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        {/* Crown icon — same amber square language as PremiumUpgradeCard */}
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {t('premium.modal.trialBanner.title')}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold shrink-0">
              <Timer className="w-2.5 h-2.5" />
              {trialDays} {t('premium.modal.trialBanner.days')}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            {t('premium.modal.trialBanner.body')}
          </p>
        </div>
      </div>

      {/* Amber action button */}
      <button
        type="button"
        className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-sm shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1 shrink-0 border-none cursor-pointer"
      >
        <span>{t('premium.modal.trialBanner.cta')}</span>
      </button>
    </div>
  );
}
