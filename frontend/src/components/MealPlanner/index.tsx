import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { MealPlannerViewProps } from './types';
import type { MealPlanEntry } from '../../types';
import { useMealPlanner } from './useMealPlanner';
import { useMealPlanBulkShopping } from './useMealPlanBulkShopping';
import { useMealPlanScrollSpy } from './useMealPlanScrollSpy';
import { MealPlannerHeader } from './MealPlannerHeader';
import { WeekNavigator } from './WeekNavigator';
import { WeekDayPicker } from './WeekDayPicker';
import { DailyInsightPill } from './DailyInsightPill';
import { MealPlanDaySection } from './MealPlanDaySection';
import { MealPlanShoppingSheets } from './MealPlanShoppingSheets';
import { RecipePickerModal } from './RecipePickerModal';
import CookedModal from '../CookedModal';
import { useI18n } from '../../context/I18nContext';
import { formatDateIso, addDays, formatWeekRange } from './mealPlannerUtils';

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  history,
  onSelectRecipe,
  onOpenCookMode,
  addRecipeIngredients,
  onNavigateToShoppingList,
}) => {
  const { t, language } = useI18n();

  const {
    currentWeekStart,
    setCurrentWeekStart,
    weekEnd,
    isCurrentWeek,
    selectedDate,
    setSelectedDate,
    mealPlans,
    agendaDates,
    extendNextWeek,
    nextExtendWeekStart,
    nextExtendWeekEnd,
    activeDayEntries,
    futurePlannedCount,
    weekDays,
    isLoading,
    pickerSlot,
    setPickerSlot,
    goToToday,
    addPlan,
    updateServings,
    moveToTomorrow,
    deletePlan,
  } = useMealPlanner();

  const {
    isAddingToShopping,
    isShopAdded,
    startBulkShopping,
    currentBulkItem,
    handleBulkShoppingConfirm,
    handleBulkShoppingClose,
  } = useMealPlanBulkShopping({
    mealPlans,
    currentWeekStart,
    weekEnd,
    history,
    addRecipeIngredients,
    onNavigateToShoppingList,
  });

  const [cookedModalRecipe, setCookedModalRecipe] = useState<{ id: string; title: string } | null>(null);

  const handleToggleCooked = useCallback((entry: MealPlanEntry) => {
    if (!entry.isCooked) {
      setCookedModalRecipe({
        id: entry.recipeId,
        title: entry.recipe?.title || 'Rezept',
      });
    }
  }, []);

  const todayStr = useMemo(() => formatDateIso(new Date()), []);

  const handleDeselectDay = useCallback(() => {
    setSelectedDate(null);
  }, [setSelectedDate]);

  // Bidirectional ScrollSpy: connects vertical list with sticky calendar header
  const { highlightedDate, scrollToDate } = useMealPlanScrollSpy({
    agendaDates,
    currentWeekStart,
    onWeekChange: setCurrentWeekStart,
    onDeselectDay: handleDeselectDay,
  });

  const hasInitialScrolledRef = useRef(false);

  // Initial scroll alignment to 'Heute' (centered) on mount once agenda dates are populated
  useEffect(() => {
    if (hasInitialScrolledRef.current) return;
    if (agendaDates.length > 0) {
      hasInitialScrolledRef.current = true;
      const timer = setTimeout(() => {
        scrollToDate(todayStr, 'auto', 'center');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [todayStr, scrollToDate, agendaDates]);

  return (
    <div className="w-full flex flex-col gap-3 pb-24">
      {/* Sticky Calendar Top Container */}
      <div
        id="meal-planner-sticky-header"
        className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md z-20 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-col gap-2"
      >
        {/* Header with title & bulk shopping action */}
        <MealPlannerHeader
          plannedTotalCount={futurePlannedCount}
          isAddingToShopping={isAddingToShopping}
          isShopAdded={isShopAdded}
          onShopWeek={startBulkShopping}
        />

        {/* Week Navigator */}
        <WeekNavigator
          weekStart={currentWeekStart}
          weekEnd={weekEnd}
          isCurrentWeek={isCurrentWeek}
          onPrevWeek={() => {
            const prevMonday = addDays(currentWeekStart, -7);
            setCurrentWeekStart(prevMonday);
            scrollToDate(formatDateIso(prevMonday), 'smooth');
          }}
          onNextWeek={() => {
            const nextMonday = addDays(currentWeekStart, 7);
            setCurrentWeekStart(nextMonday);
            scrollToDate(formatDateIso(nextMonday), 'smooth');
          }}
          onToday={() => {
            goToToday();
            setSelectedDate(todayStr);
            scrollToDate(todayStr, 'smooth', 'center');
          }}
        />

        {/* 7-Days Strip */}
        <WeekDayPicker
          days={weekDays}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            scrollToDate(d, 'smooth', d === todayStr ? 'center' : 'start');
          }}
        />

        {/* Daily Insight Pill (Nutrition & Cooking Time for active day) */}
        <DailyInsightPill entries={activeDayEntries} />
      </div>

      {/* Unified Agenda Stream */}
      {isLoading && mealPlans.length === 0 ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-gray-200/60 dark:bg-gray-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5 pt-1">
          {agendaDates.map((dateStr) => {
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
                onAddRecipeForDate={(d) => setPickerSlot({ date: d })}
                onUpdateServings={updateServings}
                onToggleCooked={handleToggleCooked}
                onDeleteEntry={deletePlan}
                onMoveToTomorrow={moveToTomorrow}
              />
            );
          })}

          {/* Progressive Week Extension Button */}
          <div className="pt-2 pb-4 flex justify-center">
            <button
              onClick={extendNextWeek}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/80 hover:bg-gray-200/90 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] cursor-pointer border-none shadow-2xs touch-manipulation"
            >
              <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 stroke-[2.25]" />
              <span>
                {t('mealPlanner.planNextWeek', {
                  range: formatWeekRange(nextExtendWeekStart, nextExtendWeekEnd, language),
                }) || `+ Nächste Woche planen (${formatWeekRange(nextExtendWeekStart, nextExtendWeekEnd, language)})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Recipe Picker Modal */}
      <RecipePickerModal
        isOpen={!!pickerSlot}
        mealType={pickerSlot?.mealType ?? null}
        dateStr={pickerSlot?.date ?? selectedDate ?? todayStr}
        history={history}
        onClose={() => setPickerSlot(null)}
        onSelectRecipe={(saved, targetDate) => {
          const dateToUse = targetDate || pickerSlot?.date || selectedDate || todayStr;
          if (dateToUse) {
            addPlan(saved, dateToUse);
          }
          setPickerSlot(null);
        }}
      />

      {/* Sequential Shopping Confirmation Sheet for Week Shopping */}
      <MealPlanShoppingSheets
        currentBulkItem={currentBulkItem}
        onConfirm={handleBulkShoppingConfirm}
        onClose={handleBulkShoppingClose}
      />

      {/* Gamification Cooked Verification Modal */}
      {cookedModalRecipe && (
        <CookedModal
          isOpen={!!cookedModalRecipe}
          recipeId={cookedModalRecipe.id}
          recipeTitle={cookedModalRecipe.title}
          onClose={() => setCookedModalRecipe(null)}
        />
      )}
    </div>
  );
};

export default MealPlannerView;
