import CookingTimerCard from '../../CookingMode/CookingTimerCard';
import { useI18n } from '../../../context/I18nContext';

export default function CookingModePreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 sm:p-4.5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3 select-none">
      {/* Mini Step Header */}
      <div className="flex items-center gap-3 w-full">
        <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-xs shadow-xs shrink-0">
          3
        </div>
        <div className="flex-1 bg-black/[0.06] dark:bg-white/[0.08] h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full w-3/5" />
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
          3 / 5
        </span>
      </div>

      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
        {isEn
          ? 'Add coconut milk, stir well, and simmer gently on medium heat for 12 minutes.'
          : 'Kokosmilch hinzugeben, gut umrühren und bei mittlerer Hitze für 12 Minuten sanft köcheln lassen.'}
      </p>

      {/* Reused CookingTimerCard */}
      <CookingTimerCard
        label={isEn ? 'Simmer gently' : 'Sanft köcheln'}
        countdownStr="08:45"
        progress={0.7}
        isFinished={false}
      />
    </div>
  );
}
