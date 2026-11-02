import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { MealPlannerViewProps } from './types';
import type { MealPlanEntry } from '../../types';
import { useMealPlanner } from './useMealPlanner';
import { useMealPlanBulkShopping } from './useMealPlanBulkShopping';
import { useMealPlanScrollSpy } from './useMealPlanScrollSpy';
import { MealPlannerHeader } from './MealPlannerHeader';
import { WeekNavigator } from './WeekNavigator';
import { WeekDayPicker } from './WeekDayPicker';
import { MealPlanWeekGroup } from './MealPlanWeekGroup';
import { ExtendNextWeekButton } from './ExtendNextWeekButton';
import { HouseholdPausedBanner } from '../Household';
import { MealPlanModals, type CookedModalTargetState } from './MealPlanModals';
import { useSpotlightTour } from '../../hooks/useSpotlightTour';
import { formatDateIso, addDays } from './mealPlannerUtils';

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  history,
  onSelectRecipe,
  onOpenCookMode,
  addRecipeIngredients,
  onNavigateToShoppingList,
  isActive = true,
}) => {

  const {
    currentWeekStart,
    setCurrentWeekStart,
    weekEnd,
    isCurrentWeek,
    selectedDate,
    setSelectedDate,
    mealPlans,
    agendaDates,
    agendaWeekGroups,
    expandWeek,
    extendNextWeek,
    nextExtendWeekStart,
    nextExtendWeekEnd,
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
    toggleCooked,
    pullToTodayAndMarkCooked,
    moveToTomorrow,
    moveToToday,
    deletePlan,
  } = useMealPlanner();

  const {
    isAddingToShopping,
    isShopAdded,
    startBulkShopping,
    startSingleShopping,
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

  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [cookedModalTarget, setCookedModalTarget] = useState<CookedModalTargetState | null>(null);

  const todayStr = useMemo(() => formatDateIso(new Date()), []);

  const handleToggleCooked = useCallback((entry: MealPlanEntry) => {
    if (entry.isCooked) {
      toggleCooked(entry);
    } else {
      setCookedModalTarget({
        id: entry.recipeId,
        title: entry.recipe?.title || 'Rezept',
        entry,
        pullToToday: entry.planDate !== todayStr,
      });
    }
  }, [toggleCooked, todayStr]);

  const handleCookTodayAndPull = useCallback((entry: MealPlanEntry) => {
    setCookedModalTarget({
      id: entry.recipeId,
      title: entry.recipe?.title || 'Rezept',
      entry,
      pullToToday: true,
    });
  }, []);

  // Bidirectional ScrollSpy: connects vertical list with sticky calendar header
  const { highlightedDate, scrollToDate } = useMealPlanScrollSpy({
    agendaDates,
    currentWeekStart,
    onWeekChange: setCurrentWeekStart,
  });

  const hasInitialScrolledRef = useRef(false);
  const prevIsActiveRef = useRef(false);

  // When switching into the meal planner or when agenda dates are populated, preselect today and scroll into view
  useEffect(() => {
    if (!isActive) {
      prevIsActiveRef.current = false;
      hasInitialScrolledRef.current = false;
      return;
    }

    if (!prevIsActiveRef.current) {
      prevIsActiveRef.current = true;
      hasInitialScrolledRef.current = false;
      setSelectedDate(todayStr);
      goToToday();
    }

    if (!hasInitialScrolledRef.current && !isLoading && agendaDates.includes(todayStr)) {
      hasInitialScrolledRef.current = true;
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToDate(todayStr, 'auto', 'start');
        });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isActive, todayStr, scrollToDate, agendaDates, isLoading, setSelectedDate, goToToday]);

  useSpotlightTour('mealPlanner', {
    enabled: isActive && !isLoading && !pickerSlot && !cookedModalTarget,
    delayMs: 600,
  });

  return (
    <div className="w-full flex flex-col gap-3 pb-24">
      {/* Sticky Calendar Top Container */}
      <div
        id="meal-planner-sticky-header"
        className="sticky top-[var(--app-sticky-top,0px)] bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md z-20 pt-2 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-col gap-2"
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
            const mondayStr = formatDateIso(prevMonday);
            goToPrevWeek();
            scrollToDate(mondayStr, 'smooth', 'start');
          }}
          onNextWeek={() => {
            const nextMonday = addDays(currentWeekStart, 7);
            const mondayStr = formatDateIso(nextMonday);
            goToNextWeek();
            scrollToDate(mondayStr, 'smooth', 'start');
          }}
          onToday={() => {
            goToToday();
            scrollToDate(todayStr, 'smooth', 'start');
          }}
        />

        {/* 7-Days Strip */}
        <WeekDayPicker
          days={weekDays}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            scrollToDate(d, 'smooth', 'start');
          }}
        />
      </div>

      <HouseholdPausedBanner
        onOpenUpgrade={() => setIsPremiumModalOpen(true)}
        onOpenHousehold={() => setIsHouseholdOpen(true)}
      />

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
        <div className="flex flex-col gap-6 pt-1">
          {agendaWeekGroups.map((weekGroup, weekIndex) => (
            <MealPlanWeekGroup
              key={weekGroup.weekKey}
              weekGroup={weekGroup}
              weekIndex={weekIndex}
              prevWeek={weekIndex > 0 ? agendaWeekGroups[weekIndex - 1] : null}
              mealPlans={mealPlans}
              todayStr={todayStr}
              selectedDate={selectedDate}
              highlightedDate={highlightedDate}
              onSelectDay={setSelectedDate}
              onExpandWeek={expandWeek}
              onSelectRecipe={onSelectRecipe}
              onOpenCookMode={onOpenCookMode}
              onAddRecipeForDate={(d) => setPickerSlot({ date: d })}
              onUpdateServings={updateServings}
              onToggleCooked={handleToggleCooked}
              onCookTodayAndPull={handleCookTodayAndPull}
              onDeleteEntry={deletePlan}
              onMoveToTomorrow={moveToTomorrow}
              onMoveToToday={moveToToday}
              onAddToShoppingList={startSingleShopping}
            />
          ))}

          <ExtendNextWeekButton
            onExtend={extendNextWeek}
            nextWeekStart={nextExtendWeekStart}
            nextWeekEnd={nextExtendWeekEnd}
          />
        </div>
      )}

      {/* Modals and Drawers */}
      <MealPlanModals
        pickerSlot={pickerSlot}
        selectedDate={selectedDate}
        todayStr={todayStr}
        history={history}
        onClosePicker={() => setPickerSlot(null)}
        onSelectRecipe={(saved, targetDate) => {
          const dateToUse = targetDate || pickerSlot?.date || selectedDate || todayStr;
          if (dateToUse) {
            addPlan(saved, dateToUse);
          }
          setPickerSlot(null);
        }}
        currentBulkItem={currentBulkItem}
        onConfirmBulkShopping={handleBulkShoppingConfirm}
        onCloseBulkShopping={handleBulkShoppingClose}
        cookedModalTarget={cookedModalTarget}
        onSuccessCooked={() => {
          if (!cookedModalTarget) return;
          if (cookedModalTarget.pullToToday) {
            pullToTodayAndMarkCooked(cookedModalTarget.entry);
          } else {
            toggleCooked(cookedModalTarget.entry);
          }
          setCookedModalTarget(null);
        }}
        onCloseCooked={() => setCookedModalTarget(null)}
        isHouseholdOpen={isHouseholdOpen}
        onOpenHouseholdChange={setIsHouseholdOpen}
        onOpenUpgrade={() => setIsPremiumModalOpen(true)}
        isPremiumModalOpen={isPremiumModalOpen}
        onOpenPremiumModalChange={setIsPremiumModalOpen}
      />
    </div>
  );
};

export default MealPlannerView;
