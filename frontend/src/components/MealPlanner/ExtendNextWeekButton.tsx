import { Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { formatWeekRange } from './mealPlannerUtils';

interface ExtendNextWeekButtonProps {
  onExtend: () => void;
  nextWeekStart: Date;
  nextWeekEnd: Date;
}

export function ExtendNextWeekButton({
  onExtend,
  nextWeekStart,
  nextWeekEnd,
}: ExtendNextWeekButtonProps) {
  const { t, language } = useI18n();
  return (
    <div className="pt-2 pb-4 flex justify-center">
      <button
        type="button"
        onClick={onExtend}
        className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/80 hover:bg-gray-200/90 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer border-none shadow-2xs touch-manipulation"
      >
        <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 stroke-[2.25]" />
        <span>
          {t('mealPlanner.planNextWeek', {
            range: formatWeekRange(nextWeekStart, nextWeekEnd, language),
          }) || `+ Nächste Woche planen (${formatWeekRange(nextWeekStart, nextWeekEnd, language)})`}
        </span>
      </button>
    </div>
  );
}
