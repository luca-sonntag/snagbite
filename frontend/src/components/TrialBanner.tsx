import { useState } from 'react';
import { Crown, X, ChevronRight, Timer } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';

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
}

/**
 * One-time trial banner shown to free users after login.
 * Renders only when RevenueCat reports a free-trial offering; the
 * displayed "N Tage" badge is derived from the longest trial length
 * across all packages (no hardcoded value). Dismissed state is
 * persisted in localStorage and broadcast via a CustomEvent so other
 * components (e.g. ExtractForm's UpgradeCard) can react synchronously.
 */
export default function TrialBanner({ onOpenPremium }: TrialBannerProps) {
  const { t } = useI18n();
  const { isPremium, hasTrialAvailable, trialDays, trialLoading } = useAuth();
  // Local dismiss state so the component can immediately unmount itself
  // without waiting for a re-render driven by AuthContext or storage events.
  const [dismissed, setDismissed] = useState(isTrialBannerDismissed);

  const dismiss = () => {
    localStorage.setItem(TRIAL_BANNER_STORAGE_KEY, '1');
    setDismissed(true);
    // Notify other components on the same page (storage events don't fire
    // in the originating tab/window).
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TRIAL_BANNER_DISMISS_EVENT));
    }
  };

  // Show the banner only when RevenueCat has confirmed a trial offering
  // exists, the user hasn't dismissed it, and they aren't already premium.
  const show = !trialLoading
    && !isPremium
    && !dismissed
    && hasTrialAvailable
    && trialDays > 0;

  if (!show) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-emerald-500/10 dark:bg-emerald-500/15 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="relative px-3.5 py-3">
        {/* Dismiss button — flat, matches the soft surface */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 transition-all z-10"
          aria-label={t('premium.modal.trialBanner.dismiss')}
        >
          <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        </button>

        <div className="flex items-center gap-3 pr-7">
          {/* Crown icon — same gold-on-soft language as PremiumHint */}
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Headline row — clear hierarchy: "N Tage" badge + title */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                {t('premium.modal.trialBanner.title')}
              </h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                <Timer className="w-2.5 h-2.5" />
                {trialDays} {t('premium.modal.trialBanner.days')}
              </span>
            </div>

            {/* Body — single line, trusts the user */}
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              {t('premium.modal.trialBanner.body')}
            </p>

            {/* Inline CTA — emerald action language, matches PremiumModal */}
            <button
              type="button"
              onClick={() => {
                dismiss();
                onOpenPremium();
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 active:scale-[0.97] transition-all"
            >
              {t('premium.modal.trialBanner.cta')}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}