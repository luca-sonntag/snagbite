import { Sparkles, BookOpen, ShoppingCart } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

export default function HouseholdHighlightsCard() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3 p-4 rounded-3xl bg-black/[0.03] dark:bg-white/[0.04] border-none select-none">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs w-fit">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{t('household.highlights.title')}</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 text-xs text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span className="font-medium text-stone-700 dark:text-stone-200">{t('household.highlights.bullet1')}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span className="font-medium text-stone-700 dark:text-stone-200">{t('household.highlights.bullet2')}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span className="font-medium text-stone-700 dark:text-stone-200">{t('household.highlights.bullet3')}</span>
        </div>
      </div>
    </div>
  );
}
