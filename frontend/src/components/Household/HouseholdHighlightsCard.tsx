import { Sparkles, Clock } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

export default function HouseholdHighlightsCard() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2.5 p-4 rounded-3xl bg-black/[0.03] dark:bg-white/[0.04] border-none select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('household.highlights.title')}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg shrink-0">
          <Clock className="w-3 h-3" />
          <span>{t('household.highlights.trialBadge')}</span>
        </div>
      </div>
      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
        {t('household.highlights.desc')}
      </p>
    </div>
  );
}
