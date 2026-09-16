import React from 'react';
import { Check } from 'lucide-react';
import type { WeekDayPickerProps } from './types';
import { hapticSelection } from '../../utils/haptics';

export const WeekDayPicker: React.FC<WeekDayPickerProps> = ({
  days,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <div className="w-full grid grid-cols-7 gap-1 pt-1 pb-1">
      {days.map((day) => {
        const isSelected = selectedDate !== null && day.dateStr === selectedDate;
        const isAllCooked =
          day.plannedCount > 0 && (day.cookedCount ?? 0) >= day.plannedCount;

        return (
          <button
            key={day.dateStr}
            onClick={() => {
              hapticSelection();
              onSelectDate(day.dateStr);
            }}
            aria-label={`${day.dayName}, ${day.dayNumber}`}
            aria-selected={isSelected}
            className={`group relative flex flex-col items-center justify-center py-2.5 px-0.5 rounded-2xl transition-all duration-200 cursor-pointer border-none select-none active:scale-[0.93] ${
              isSelected
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.03] z-10'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-2xs'
            }`}
          >
            {/* Day of week initial (Mo, Di, ...) */}
            <span
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isSelected
                  ? 'text-emerald-100'
                  : day.isToday
                  ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-gray-400 dark:text-gray-400'
              }`}
            >
              {day.dayName}
            </span>

            {/* Day of month number */}
            <span
              className={`text-sm sm:text-base font-black my-0.5 leading-none transition-colors ${
                isSelected
                  ? 'text-white'
                  : day.isToday
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-800 dark:text-gray-100'
              }`}
            >
              {day.dayNumber}
            </span>

            {/* Harmonious Neutral Gray Status indicator row */}
            <div className="flex items-center justify-center h-4 mt-0.5">
              {isAllCooked ? (
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded-full ${
                    isSelected
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              ) : day.plannedCount > 0 ? (
                <span
                  className={`flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-black leading-none ${
                    isSelected
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {day.plannedCount}
                </span>
              ) : day.isToday ? (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-emerald-500 ring-2 ring-emerald-500/20'
                  }`}
                />
              ) : (
                <span className="w-4 h-4" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default WeekDayPicker;
