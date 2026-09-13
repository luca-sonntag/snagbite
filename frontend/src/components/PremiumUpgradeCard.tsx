import { useState, useEffect } from 'react';
import { Crown, X, Timer } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { hapticMedium } from '../utils/haptics';
import {
  isTrialBannerDismissed,
  TRIAL_BANNER_DISMISS_EVENT,
  TRIAL_BANNER_STORAGE_KEY,
} from './TrialBanner';

interface PremiumUpgradeCardProps {
  onUpgradeClick: () => void;
  className?: string;
}

export default function PremiumUpgradeCard({ onUpgradeClick, className = '' }: PremiumUpgradeCardProps) {
  const { t, language } = useI18n();
  const { user, hasTrialAvailable, trialDays, trialLoading } = useAuth();
  const [trialDismissed, setTrialDismissed] = useState(isTrialBannerDismissed);

  useEffect(() => {
    const onDismiss = () => setTrialDismissed(true);
    window.addEventListener(TRIAL_BANNER_DISMISS_EVENT, onDismiss);
    return () => window.removeEventListener(TRIAL_BANNER_DISMISS_EVENT, onDismiss);
  }, []);

  const isRealPremium = user?.app_metadata?.tier === 'premium';
  if (isRealPremium) return null;

  const showTrial = !trialLoading && hasTrialAvailable && trialDays > 0 && !trialDismissed;

  const handleDismissTrial = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(TRIAL_BANNER_STORAGE_KEY, '1');
    setTrialDismissed(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TRIAL_BANNER_DISMISS_EVENT));
    }
  };

  return (
    <div
      onClick={() => {
        hapticMedium();
        onUpgradeClick();
      }}
      className={`cursor-pointer p-4 tint-premium rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:brightness-[0.98] dark:hover:brightness-110 active:scale-[0.99] transition-all relative overflow-hidden group ${className}`}
    >
      {showTrial && (
        <button
          type="button"
          onClick={handleDismissTrial}
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 transition-all z-10"
          aria-label={t('premium.modal.trialBanner.dismiss')}
        >
          <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        </button>
      )}

      <div className={`flex items-center gap-3 min-w-0 flex-1 ${showTrial ? 'pr-2' : ''}`}>
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          {showTrial ? (
            <>
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
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Snagbite PRO
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                {language === 'de'
                  ? 'Mehr Rezept-Importe, Nährwerte, KI-Chat, Sammlungen & Kochmodus'
                  : 'More recipe imports, nutrition info, AI chat, collections & cooking mode'}
              </p>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-sm shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1 shrink-0 border-none cursor-pointer"
      >
        <span>{showTrial ? t('premium.modal.trialBanner.cta') : 'Upgrade'}</span>
      </button>
    </div>
  );
}

