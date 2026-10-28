import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@heroui/react';
import { useHousehold } from './useHousehold';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

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

  // Banner only appears when user does not have an active household connection
  if (status === 'active') {
    return null;
  }

  return (
    <div
      className={`w-full rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 p-4 flex items-center justify-between gap-3 text-stone-900 dark:text-stone-100 select-none ${className}`}
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

      <Button
        size="sm"
        onClick={() => {
          hapticLight();
          onOpenHousehold();
        }}
        className="h-9 px-3 shrink-0 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
      >
        <span>{t('household.banner.action')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
