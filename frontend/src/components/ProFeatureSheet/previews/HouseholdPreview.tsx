import { Users, Heart, Sparkles, Check } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';

export default function HouseholdPreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-gray-900">
              DU
            </div>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-gray-900">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
              {isEn ? 'Shared Household' : 'Gemeinsamer Haushalt'}
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">
              {isEn ? 'Cookbook & list synced' : 'Kochbuch & Liste synchron'}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          1 PRO = 2
        </span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-[11px] text-stone-600 dark:text-stone-300">
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
          {isEn ? 'Synced meal planner' : 'Wochenplaner synchronisiert'}
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
          {isEn ? 'Live grocery sync' : 'Live-Einkaufsliste'}
        </span>
      </div>
    </div>
  );
}
