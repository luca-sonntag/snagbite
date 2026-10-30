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
  if (status === 'active' || status === 'paused' || dismissed) {
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
      className={`relative w-full rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 p-3.5 sm:p-4 flex flex-col gap-2 text-stone-900 dark:text-stone-100 select-none cursor-pointer transition-all active:scale-[0.99] ${className}`}
    >
      {/* Dismiss button top right */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none cursor-pointer z-10"
        aria-label={t('household.banner.dismiss')}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Top row: Icon + Title */}
      <div className="flex items-center gap-2.5 pr-7">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold tracking-tight">
          {t('household.banner.title')}
        </span>
      </div>

      {/* Content row: Subtitle + Harmonious Amber CTA */}
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-snug flex-1">
          {t('household.banner.subtitle')}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
            onOpenHousehold();
          }}
          className="h-8 px-3 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center gap-1 border-none shadow-xs shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <span>{t('household.banner.action')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
