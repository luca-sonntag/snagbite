import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { WeekNavigatorProps } from './types';
import { formatWeekRange } from './mealPlannerUtils';

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  weekStart,
  weekEnd,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onToday,
}) => {
  const { t, language } = useI18n();

  const handlePrev = () => {
    hapticLight();
    onPrevWeek();
  };

  const handleNext = () => {
    hapticLight();
    onNextWeek();
  };

  const handleToday = () => {
    hapticLight();
    onToday();
  };

  return (
    <div className="flex items-center justify-between px-1.5 py-1">
      <button
        onClick={handlePrev}
        aria-label={t('mealPlanner.prevWeek')}
        className="w-11 h-11 flex items-center justify-center rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.92] transition-transform duration-150 cursor-pointer border-none"
      >
        <ChevronLeft className="w-5 h-5 stroke-[2.25]" />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
          {formatWeekRange(weekStart, weekEnd, language)}
        </span>
        {!isCurrentWeek && (
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-2xs active:scale-95 transition-all duration-150 cursor-pointer border-none"
          >
            {t('mealPlanner.today')}
          </button>
        )}
      </div>

      <button
        onClick={handleNext}
        aria-label={t('mealPlanner.nextWeek')}
        className="w-11 h-11 flex items-center justify-center rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.92] transition-transform duration-150 cursor-pointer border-none"
      >
        <ChevronRight className="w-5 h-5 stroke-[2.25]" />
      </button>
    </div>
  );
};

export default WeekNavigator;
