import React, { useMemo } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import { MealPlanCard } from './MealPlanCard';
import { formatUpcomingDateSeparator } from './mealPlannerUtils';
import type { UpcomingMealPlansProps } from './types';
import type { MealPlanEntry } from '../../types';

interface DayGroup {
  dateStr: string;
  entries: MealPlanEntry[];
}

export const UpcomingMealPlans: React.FC<UpcomingMealPlansProps> = ({
  entries,
  onAddRecipeForDate,
  onUpdateServings,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
  onSelectRecipe,
  onOpenCookMode,
  onSelectDate,
}) => {
  const { t, language } = useI18n();

  // Group upcoming entries by planDate
  const groupedDays = useMemo<DayGroup[]>(() => {
    const map = new Map<string, MealPlanEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.planDate) || [];
      list.push(entry);
      map.set(entry.planDate, list);
    }
    const sortedDates = Array.from(map.keys()).sort();
    return sortedDates.map((dateStr) => ({
      dateStr,
      entries: map.get(dateStr)!,
    }));
  }, [entries]);

  if (groupedDays.length === 0) {
    return null;
  }

  const relativeLabels = {
    today: t('mealPlanner.today'),
    tomorrow: t('mealPlanner.tomorrow'),
    dayAfterTomorrow: t('mealPlanner.dayAfterTomorrow'),
  };

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
            {t('mealPlanner.upcomingTitle')}
          </h3>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            {entries.length === 1
              ? t('mealPlanner.upcomingCountSingle')
              : t('mealPlanner.upcomingCount', { count: entries.length })}
          </span>
        </div>
      </div>

      {/* Day Groups with Date Separator */}
      <div className="space-y-4">
        {groupedDays.map(({ dateStr, entries: dayEntries }) => {
          const dateHeader = formatUpcomingDateSeparator(dateStr, language, relativeLabels);

          return (
            <div key={dateStr} className="space-y-2">
              {/* Date Separator */}
              <div className="flex items-center justify-between gap-2 px-1.5 py-1 select-none">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectDate) {
                      hapticSelection();
                      onSelectDate(dateStr);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-98 transition-colors cursor-pointer border-none bg-transparent p-0 text-left"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.25] shrink-0" />
                  <span className="capitalize">{dateHeader}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onAddRecipeForDate(dateStr);
                  }}
                  title={t('mealPlanner.addRecipeForDay', { date: dateStr })}
                  aria-label={t('mealPlanner.addRecipeForDay', { date: dateStr })}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-950/30 text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400 active:scale-90 transition-all cursor-pointer border-none shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Day Recipes Stack */}
              <div className="space-y-2.5">
                {dayEntries.map((entry) => (
                  <MealPlanCard
                    key={entry.id}
                    entry={entry}
                    onUpdateServings={onUpdateServings}
                    onToggleCooked={onToggleCooked}
                    onDeleteEntry={onDeleteEntry}
                    onMoveToTomorrow={onMoveToTomorrow}
                    onSelectRecipe={onSelectRecipe}
                    onOpenCookMode={onOpenCookMode}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingMealPlans;
