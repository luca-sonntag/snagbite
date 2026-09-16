import React from 'react';
import { Plus } from 'lucide-react';
import type { MealPlanEntry } from '../../types';
import type { AgendaWeekGroup } from './mealPlannerUtils';
import { formatWeekRange, formatWeekGroupHeader, formatDateIso, addDays } from './mealPlannerUtils';
import { MealPlanDaySection } from './MealPlanDaySection';
import { useI18n } from '../../context/I18nContext';

export interface MealPlanWeekGroupProps {
  weekGroup: AgendaWeekGroup;
  weekIndex: number;
  prevWeek: AgendaWeekGroup | null;
  mealPlans: MealPlanEntry[];
  todayStr: string;
  selectedDate: string | null;
  highlightedDate: string | null;
  onExpandWeek: (weekKey: string) => void;
  onSelectRecipe: (recipeId: string) => void;
  onOpenCookMode?: (recipeId: string) => void;
  onAddRecipeForDate: (dateStr: string) => void;
  onUpdateServings: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
}

export const MealPlanWeekGroup = React.memo<MealPlanWeekGroupProps>(({
  weekGroup,
  weekIndex,
  prevWeek,
  mealPlans,
  todayStr,
  selectedDate,
  highlightedDate,
  onExpandWeek,
  onSelectRecipe,
  onOpenCookMode,
  onAddRecipeForDate,
  onUpdateServings,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
}) => {
  const { t, language } = useI18n();

  const hasSkippedWeeksBefore =
    prevWeek &&
    weekGroup.weekStart.getTime() - prevWeek.weekStart.getTime() > 7 * 24 * 60 * 60 * 1000;
  const nextMissingMonday = prevWeek ? addDays(prevWeek.weekStart, 7) : null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Skipped week in-between reload button */}
      {hasSkippedWeeksBefore && nextMissingMonday && (
        <div className="pt-1 pb-1 flex justify-center">
          <button
            onClick={() => onExpandWeek(formatDateIso(nextMissingMonday))}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/80 hover:bg-gray-200/90 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer border-none shadow-2xs touch-manipulation"
          >
            <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 stroke-[2.25]" />
            <span>
              {t('mealPlanner.expandWeek', {
                range: formatWeekRange(nextMissingMonday, addDays(nextMissingMonday, 6), language),
              }) || `Woche planen (${formatWeekRange(nextMissingMonday, addDays(nextMissingMonday, 6), language)})`}
            </span>
          </button>
        </div>
      )}

      {/* Week Header */}
      {weekIndex > 0 && (
        <div
          className="w-full flex items-center px-1.5 pt-3 pb-0.5 select-none"
          aria-hidden="true"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {formatWeekGroupHeader(weekGroup.weekStart, weekGroup.weekEnd, language)}
          </span>
        </div>
      )}

      {/* Incomplete Week expansion button */}
      {!weekGroup.isComplete && (
        <div className="pt-1 pb-1 flex justify-center">
          <button
            onClick={() => onExpandWeek(weekGroup.weekKey)}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/80 hover:bg-gray-200/90 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer border-none shadow-2xs touch-manipulation"
          >
            <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 stroke-[2.25]" />
            <span>
              {t('mealPlanner.expandWeek', {
                range: formatWeekRange(weekGroup.weekStart, weekGroup.weekEnd, language),
              }) || `Woche planen (${formatWeekRange(weekGroup.weekStart, weekGroup.weekEnd, language)})`}
            </span>
          </button>
        </div>
      )}

      {weekGroup.dates.map((dateStr) => {
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const dayEntries = mealPlans.filter((p) => p.planDate === dateStr);
        const isHighlighted = highlightedDate === dateStr || selectedDate === dateStr;

        return (
          <MealPlanDaySection
            key={dateStr}
            dateStr={dateStr}
            entries={dayEntries}
            isToday={isToday}
            isPast={isPast}
            isHighlighted={isHighlighted}
            onSelectRecipe={onSelectRecipe}
            onOpenCookMode={onOpenCookMode}
            onAddRecipeForDate={onAddRecipeForDate}
            onUpdateServings={onUpdateServings}
            onToggleCooked={onToggleCooked}
            onDeleteEntry={onDeleteEntry}
            onMoveToTomorrow={onMoveToTomorrow}
          />
        );
      })}
    </div>
  );
});

export default MealPlanWeekGroup;
