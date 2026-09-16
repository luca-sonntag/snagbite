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

  const calendarSwipe = useSwipeGesture({
    onSwipeLeft: goToNextWeek,
    onSwipeRight: goToPrevWeek,
    nextClassName: 'animate-week-in-right',
    prevClassName: 'animate-week-in-left',
  });

  const daySwipe = useSwipeGesture({
    onSwipeLeft: goToNextDay,
    onSwipeRight: goToPrevDay,
    nextClassName: 'animate-tab-in-right',
    prevClassName: 'animate-tab-in-left',
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
      <div className="w-full flex flex-col gap-1.5 p-2 rounded-3xl bg-gray-100/75 dark:bg-gray-900/90 border-none shadow-2xs select-none">
        <WeekNavigator
          weekStart={currentWeekStart}
          weekEnd={weekEnd}
          isCurrentWeek={isCurrentWeek}
          onPrevWeek={() => {
            calendarSwipe.setNavDirection('prev');
            goToPrevWeek();
          }}
          onNextWeek={() => {
            calendarSwipe.setNavDirection('next');
            goToNextWeek();
          }}
          onToday={() => {
            calendarSwipe.setNavDirection(null);
            goToToday();
          }}
        />

        {/* Swipeable Calendar Days Strip */}
        <div
          className="w-full overflow-hidden"
          onTouchStart={calendarSwipe.onTouchStart}
          onTouchMove={calendarSwipe.onTouchMove}
          onTouchEnd={calendarSwipe.onTouchEnd}
        >
          <div
            key={currentWeekStart.toISOString()}
            className={`w-full ${calendarSwipe.animationClass}`}
            style={calendarSwipe.containerStyle}
          >
            <WeekDayPicker
              days={weekDays}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                daySwipe.setNavDirection(null);
                setSelectedDate(d);
              }}
            />
          </div>
        </div>

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
          className={`space-y-4 ${daySwipe.animationClass || 'animate-fade-in'}`}
          style={daySwipe.containerStyle}
          onTouchStart={daySwipe.onTouchStart}
          onTouchMove={daySwipe.onTouchMove}
          onTouchEnd={daySwipe.onTouchEnd}
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
