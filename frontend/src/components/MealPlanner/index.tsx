import React, { useState, useCallback } from 'react';
import type { MealPlannerViewProps } from './types';
import type { MealPlanEntry } from '../../types';
import { useMealPlanner } from './useMealPlanner';
import { useMealPlanBulkShopping } from './useMealPlanBulkShopping';
import { MealPlannerHeader } from './MealPlannerHeader';
import { WeekNavigator } from './WeekNavigator';
import { WeekDayPicker } from './WeekDayPicker';
import { DailyInsightPill } from './DailyInsightPill';
import { DayMealSlots } from './DayMealSlots';
import { UpcomingMealPlans } from './UpcomingMealPlans';
import { MealPlanShoppingSheets } from './MealPlanShoppingSheets';
import { RecipePickerModal } from './RecipePickerModal';
import CookedModal from '../CookedModal';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { hapticSelection } from '../../utils/haptics';

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  history,
  onSelectRecipe,
  onOpenCookMode,
  addRecipeIngredients,
  onNavigateToShoppingList,
}) => {
  const {
    currentWeekStart,
    weekEnd,
    isCurrentWeek,
    selectedDate,
    setSelectedDate,
    mealPlans,
    activeDayEntries,
    futurePlannedEntries,
    upcomingPlannedEntries,
    futurePlannedCount,
    weekDays,
    isLoading,
    pickerSlot,
    setPickerSlot,
    goToPrevWeek,
    goToNextWeek,
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

  const goToNextDay = useCallback(() => {
    hapticSelection();
    const days = weekDays;
    const idx = days.findIndex((d) => d.dateStr === selectedDate);
    if (idx < days.length - 1) {
      setSelectedDate(days[idx + 1].dateStr);
    } else {
      goToNextWeek();
    }
  }, [weekDays, selectedDate, setSelectedDate, goToNextWeek]);

  const goToPrevDay = useCallback(() => {
    hapticSelection();
    const days = weekDays;
    const idx = days.findIndex((d) => d.dateStr === selectedDate);
    if (idx > 0) {
      setSelectedDate(days[idx - 1].dateStr);
    } else {
      goToPrevWeek();
    }
  }, [weekDays, selectedDate, setSelectedDate, goToPrevWeek]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextDay,
    onSwipeRight: goToPrevDay,
  });

  const calendarSwipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextWeek,
    onSwipeRight: goToPrevWeek,
  });

  return (
    <div className="w-full flex flex-col gap-3 pb-24 overflow-hidden">
      {/* Header with page title & shopping action */}
      <MealPlannerHeader
        plannedTotalCount={futurePlannedCount}
        isAddingToShopping={isAddingToShopping}
        isShopAdded={isShopAdded}
        onShopWeek={startBulkShopping}
      />

      {/* Unified Calendar Widget Card */}
      <div
        className="w-full flex flex-col gap-1.5 p-2 rounded-3xl bg-gray-100/75 dark:bg-gray-900/90 border-none shadow-2xs select-none touch-pan-y"
        {...calendarSwipeHandlers}
      >
        <WeekNavigator
          weekStart={currentWeekStart}
          weekEnd={weekEnd}
          isCurrentWeek={isCurrentWeek}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToToday}
        />
        <WeekDayPicker
          days={weekDays}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        {/* Daily Macro/Time Insight integrated into widget */}
        <DailyInsightPill entries={activeDayEntries} />
      </div>

      {/* Loading state skeleton vs Day Slots */}
      {isLoading && mealPlans.length === 0 ? (
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-gray-200/60 dark:bg-gray-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          key={selectedDate}
          className="space-y-4 animate-fade-in"
          style={{ animationDuration: '200ms' }}
          {...swipeHandlers}
        >
          {/* Active selected day meal slots or empty banner */}
          <DayMealSlots
            selectedDateStr={selectedDate}
            entries={activeDayEntries}
            hasAnyFutureEntries={futurePlannedEntries.length > 0}
            onAddRecipe={() => setPickerSlot({ date: selectedDate })}
            onUpdateServings={updateServings}
            onToggleCooked={handleToggleCooked}
            onDeleteEntry={deletePlan}
            onMoveToTomorrow={moveToTomorrow}
            onSelectRecipe={onSelectRecipe}
            onOpenCookMode={onOpenCookMode}
          />

          {/* All upcoming planned recipes grouped by day with date separator */}
          <UpcomingMealPlans
            entries={upcomingPlannedEntries}
            onAddRecipeForDate={(dateStr) => setPickerSlot({ date: dateStr })}
            onUpdateServings={updateServings}
            onToggleCooked={handleToggleCooked}
            onDeleteEntry={deletePlan}
            onMoveToTomorrow={moveToTomorrow}
            onSelectRecipe={onSelectRecipe}
            onOpenCookMode={onOpenCookMode}
            onSelectDate={setSelectedDate}
          />
        </div>
      )}

      {/* Recipe Picker Modal */}
      <RecipePickerModal
        isOpen={!!pickerSlot}
        mealType={pickerSlot?.mealType ?? null}
        dateStr={pickerSlot?.date ?? selectedDate}
        history={history}
        onClose={() => setPickerSlot(null)}
        onSelectRecipe={(saved, targetDate) => {
          const dateToUse = targetDate || pickerSlot?.date || selectedDate;
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
