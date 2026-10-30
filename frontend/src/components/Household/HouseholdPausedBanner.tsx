import { useState } from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { useHousehold } from './useHousehold';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

export const HOUSEHOLD_PAUSED_BANNER_STORAGE_KEY = 'snagbite_household_paused_banner_dismissed';

export const isHouseholdPausedBannerDismissed = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(HOUSEHOLD_PAUSED_BANNER_STORAGE_KEY) === '1';
};

export interface HouseholdPausedBannerProps {
  onOpenUpgrade?: () => void;
  onOpenHousehold?: () => void;
  className?: string;
  dismissible?: boolean;
}

export default function HouseholdPausedBanner({
  onOpenUpgrade,
  onOpenHousehold,
  className = '',
  dismissible = true,
}: HouseholdPausedBannerProps) {
  const { status, isPauseLocked, partnerProfile } = useHousehold();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(isHouseholdPausedBannerDismissed);

  // Only render if the household is actually in paused state
  if ((status !== 'paused' && !isPauseLocked) || (dismissible && dismissed)) {
    return null;
  }

  const partnerName = partnerProfile?.displayName || t('household.partnerDefault');

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    sessionStorage.setItem(HOUSEHOLD_PAUSED_BANNER_STORAGE_KEY, '1');
    setDismissed(true);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    if (onOpenUpgrade) {
      onOpenUpgrade();
    } else if (onOpenHousehold) {
      onOpenHousehold();
    }
  };

  const handleContainerClick = () => {
    hapticLight();
    if (onOpenHousehold) {
      onOpenHousehold();
    } else if (onOpenUpgrade) {
      onOpenUpgrade();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`relative w-full rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 p-3.5 sm:p-4 flex flex-col gap-2 text-stone-900 dark:text-stone-100 select-none cursor-pointer transition-all active:scale-[0.99] border-none shadow-2xs ${className}`}
    >
      {/* Dismiss button top right */}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none cursor-pointer z-10"
          aria-label={t('common.close') || 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Top row: Icon + Title */}
      <div className="flex items-center gap-2.5 pr-7">
        <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold tracking-tight text-rose-900 dark:text-rose-200">
          {t('household.pausedBanner.title')}
        </span>
      </div>

      {/* Content row: Subtitle + Action CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <p className="text-xs text-rose-800/80 dark:text-rose-200/80 leading-snug flex-1">
          {t('household.pausedBanner.desc', { name: partnerName })}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="h-8 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 border-none shadow-xs shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>{t('household.pausedBanner.action')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
