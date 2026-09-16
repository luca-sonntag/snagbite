import React from 'react';
import { Plus } from 'lucide-react';
import type { MealPlanEntry } from '../../types';
import { MealPlanCard } from './MealPlanCard';
import { PastMealPlanCard } from './PastMealPlanCard';
import { formatUpcomingDateSeparator } from './mealPlannerUtils';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

export interface MealPlanDaySectionProps {
  dateStr: string;
  entries: MealPlanEntry[];
  isToday: boolean;
  isPast: boolean;
  isHighlighted?: boolean;
  onSelectRecipe: (recipeId: string) => void;
  onOpenCookMode?: (recipeId: string) => void;
  onAddRecipeForDate: (dateStr: string) => void;
  onUpdateServings: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
}

export const MealPlanDaySection = React.memo<MealPlanDaySectionProps>(({
  dateStr,
  entries,
  isToday,
  isPast,
  isHighlighted,
  onSelectRecipe,
  onOpenCookMode,
  onAddRecipeForDate,
  onUpdateServings,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
}) => {
  const { t, language } = useI18n();

  const formattedDate = formatUpcomingDateSeparator(dateStr, language, {
    today: t('mealPlanner.today') || 'Heute',
    tomorrow: t('mealPlanner.tomorrow') || 'Morgen',
    dayAfterTomorrow: t('mealPlanner.dayAfterTomorrow') || 'Übermorgen',
  });

  const handleAddClick = () => {
    hapticLight();
    onAddRecipeForDate(dateStr);
  };

  return (
    <section
      id={`day-section-${dateStr}`}
      data-date={dateStr}
      className="w-full flex flex-col gap-2"
    >
      {/* Date Header: Clean Gray / Active Emerald Card */}
      {isPast ? (
        <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-gray-100/60 dark:bg-gray-900/60 select-none border-none opacity-80">
          <span className="text-xs sm:text-sm font-bold tracking-tight text-gray-500 dark:text-gray-400 truncate">
            {formattedDate}
          </span>
        </div>
      ) : (
        <button
          onClick={handleAddClick}
          aria-label={t('mealPlanner.addRecipe') || 'Rezept hinzufügen'}
          className={`group w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none border-none touch-manipulation ${
            isHighlighted
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.01]'
              : isToday
              ? 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15'
              : 'bg-gray-100/90 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 shadow-2xs'
          } active:scale-[0.98]`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs sm:text-sm font-extrabold tracking-tight truncate ${
                isHighlighted
                  ? 'text-white'
                  : isToday
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {formattedDate}
            </span>
          </div>

          <Plus
            className={`w-4 h-4 shrink-0 stroke-[2.25] transition-colors ${
              isHighlighted
                ? 'text-white'
                : isToday
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
            }`}
          />
        </button>
      )}

      {/* Recipe Cards List */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
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
                onDeleteEntry={onDeleteEntry}
                onMoveToTomorrow={onMoveToTomorrow}
                onSelectRecipe={onSelectRecipe}
                onOpenCookMode={onOpenCookMode}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
});

export default MealPlanDaySection;
