import React from 'react';
import { Plus } from 'lucide-react';
import type { MealPlanDaySectionProps } from './types';
import { MealPlanCard } from './MealPlanCard';
import { PastMealPlanCard } from './PastMealPlanCard';
import { formatUpcomingDateSeparator } from './mealPlannerUtils';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

export const MealPlanDaySection = React.memo<MealPlanDaySectionProps>(({
  dateStr,
  entries,
  isToday,
  isPast,
  isHighlighted,
  onSelectDay,
  onSelectRecipe,
  onOpenCookMode,
  onAddRecipeForDate,
  onUpdateServings,
  onToggleCooked,
  onCookTodayAndPull,
  onDeleteEntry,
  onMoveToTomorrow,
  onMoveToToday,
  onAddToShoppingList,
}) => {
  const { t, language } = useI18n();

  const formattedDate = formatUpcomingDateSeparator(dateStr, language, {
    today: t('mealPlanner.today') || 'Heute',
    tomorrow: t('mealPlanner.tomorrow') || 'Morgen',
    dayAfterTomorrow: t('mealPlanner.dayAfterTomorrow') || 'Übermorgen',
  });

  const handleDayCardClick = () => {
    hapticLight();
    onSelectDay?.(dateStr);
    if (!isPast) {
      onAddRecipeForDate(dateStr);
    }
  };

  const hasEntries = entries.length > 0;

  return (
    <section
      id={`day-section-${dateStr}`}
      data-date={dateStr}
      className={`w-full transition-all duration-200 ${
        hasEntries
          ? 'flex flex-col gap-1.5 mb-3 sm:mb-4'
          : 'flex flex-col gap-2'
      }`}
    >
      {/* Date Header: Open Canvas / Active Emerald Header */}
      <button
        id={isToday || isHighlighted ? 'tour-planner-day-section' : undefined}
        onClick={handleDayCardClick}
        aria-label={isPast ? formattedDate : (t('mealPlanner.addRecipe') || 'Rezept hinzufügen')}
        className={`group w-full min-h-[44px] px-1 py-2 flex items-center justify-between select-none touch-manipulation transition-all duration-200 cursor-pointer ${
          isHighlighted
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.01] rounded-2xl px-3 border-none'
            : isToday
            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15 rounded-2xl px-3 border-none'
            : hasEntries
            ? 'bg-transparent border-none'
            : isPast
            ? 'bg-transparent border-b border-black/[0.05] dark:border-white/[0.06] text-gray-500 dark:text-gray-400'
            : 'bg-transparent border-b border-black/[0.06] dark:border-white/[0.08] text-gray-800 dark:text-gray-200'
        } active:scale-[0.98]`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs sm:text-sm font-extrabold tracking-tight truncate ${
              isHighlighted
                ? 'text-white'
                : isToday
                ? 'text-emerald-700 dark:text-emerald-300'
                : isPast
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-gray-800 dark:text-gray-200'
            }`}
          >
            {formattedDate}
          </span>
        </div>

        {!isPast && (
          <Plus
            className={`w-4 h-4 shrink-0 stroke-[2.25] transition-colors ${
              isHighlighted
                ? 'text-white'
                : isToday
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
            }`}
          />
        )}
      </button>

      {/* Recipe Cards List */}
      {hasEntries && (
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {entries.map((entry) =>
            isPast ? (
              <PastMealPlanCard
                key={entry.id}
                entry={entry}
                onSelectRecipe={onSelectRecipe}
              />
            ) : (
              <MealPlanCard
                key={entry.id}
                entry={entry}
                onUpdateServings={onUpdateServings}
                onToggleCooked={onToggleCooked}
                onCookTodayAndPull={onCookTodayAndPull}
                onDeleteEntry={onDeleteEntry}
                onMoveToTomorrow={onMoveToTomorrow}
                onMoveToToday={onMoveToToday}
                onSelectRecipe={onSelectRecipe}
                onOpenCookMode={onOpenCookMode}
                onAddToShoppingList={onAddToShoppingList}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
});

export default MealPlanDaySection;
