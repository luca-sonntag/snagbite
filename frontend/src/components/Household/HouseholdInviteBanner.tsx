import { useState } from 'react';
import { Users, ArrowRight, X } from 'lucide-react';
import { useHousehold } from './useHousehold';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

export const HOUSEHOLD_BANNER_STORAGE_KEY = 'snagbite_household_banner_dismissed';

export const isHouseholdBannerDismissed = (): boolean => {
  return typeof window !== 'undefined'
    && localStorage.getItem(HOUSEHOLD_BANNER_STORAGE_KEY) === '1';
};

interface HouseholdInviteBannerProps {
  onOpenHousehold: () => void;
  className?: string;
}

export default function HouseholdInviteBanner({
  onOpenHousehold,
  className = '',
}: HouseholdInviteBannerProps) {
  const { status } = useHousehold();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(isHouseholdBannerDismissed);

  // Banner only appears when user does not have an active household connection and hasn't dismissed it
  if (status === 'active' || dismissed) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    localStorage.setItem(HOUSEHOLD_BANNER_STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      onClick={() => {
        hapticLight();
        onOpenHousehold();
      }}
      className={`w-full rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 p-4 flex items-center justify-between gap-3 text-stone-900 dark:text-stone-100 select-none cursor-pointer transition-all active:scale-[0.99] ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-bold tracking-tight leading-snug">
            {t('household.banner.title')}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-tight truncate">
            {t('household.banner.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
            onOpenHousehold();
          }}
          className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 border-none shadow-xs shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <span>{t('household.banner.action')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none cursor-pointer"
          aria-label={t('household.banner.dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
