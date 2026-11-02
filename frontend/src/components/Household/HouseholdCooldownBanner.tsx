import { Clock } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface HouseholdCooldownBannerProps {
  cooldownUntil: string;
}

export default function HouseholdCooldownBanner({ cooldownUntil }: HouseholdCooldownBannerProps) {
  const { t, language } = useI18n();

  const formattedDate = new Date(cooldownUntil).toLocaleDateString(
    language === 'de' ? 'de-DE' : 'en-US',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );

  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 text-amber-900 dark:text-amber-200 border-none select-none">
      <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-bold text-sm text-amber-950 dark:text-amber-100 leading-tight">
          {t('household.cooldown.title')}
        </span>
        <span className="leading-relaxed text-amber-800 dark:text-amber-300">
          {t('household.cooldown.desc', { date: formattedDate })}
        </span>
      </div>
    </div>
  );
}
