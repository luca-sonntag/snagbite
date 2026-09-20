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
          ? `flex flex-col rounded-2xl gap-1.5 mb-2 sm:mb-3 shadow-2xs ${
              isToday
                ? 'bg-emerald-500/10 dark:bg-emerald-950/30'
                : isPast
                ? 'bg-gray-100/70 dark:bg-gray-800/60'
                : 'bg-gray-100/90 dark:bg-gray-800/80'
            }`
          : 'flex flex-col gap-2'
      }`}
    >
      {/* Date Header: Clean Gray / Active Emerald Card */}
      <button
        onClick={handleDayCardClick}
        aria-label={isPast ? formattedDate : (t('mealPlanner.addRecipe') || 'Rezept hinzufügen')}
        className={`group w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between select-none border-none touch-manipulation transition-all duration-200 cursor-pointer ${
          isHighlighted
            ? 'rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.01]'
            : hasEntries
            ? 'rounded-t-2xl rounded-b-none bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99]'
            : `rounded-2xl ${
                isToday
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15'
                  : isPast
                  ? 'bg-gray-100/70 dark:bg-gray-800/60 hover:bg-gray-200/70 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 shadow-2xs'
                  : 'bg-gray-100/90 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 shadow-2xs'
              } active:scale-[0.98]`
        }`}
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
        <div className="flex flex-col gap-1.5 sm:gap-2 px-1.5 pb-1.5 sm:px-2 sm:pb-2">
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
