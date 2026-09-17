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
import { MealPlanWeekGroup } from './MealPlanWeekGroup';
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
  isActive = true,
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
    agendaWeekGroups,
    expandWeek,
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

  const [cookedModalTarget, setCookedModalTarget] = useState<{
    id: string;
    title: string;
    entry: MealPlanEntry;
    pullToToday?: boolean;
  } | null>(null);

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
        scrollToDate(todayStr, 'auto', 'center');
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isActive, todayStr, scrollToDate, agendaDates, isLoading, setSelectedDate, goToToday]);

  return (
    <div className="w-full flex flex-col gap-3 pb-24">
      {/* Sticky Calendar Top Container */}
      <div
        id="meal-planner-sticky-header"
        className="sticky top-0 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md z-20 -mt-4 pt-3 sm:pt-3.5 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-col gap-2"
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
            setCurrentWeekStart(prevMonday);
            setSelectedDate(mondayStr);
            scrollToDate(mondayStr, 'smooth');
          }}
          onNextWeek={() => {
            const nextMonday = addDays(currentWeekStart, 7);
            const mondayStr = formatDateIso(nextMonday);
            expandWeek(mondayStr);
            setCurrentWeekStart(nextMonday);
            setSelectedDate(mondayStr);
            scrollToDate(mondayStr, 'smooth');
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
      {cookedModalTarget && (
        <CookedModal
          isOpen={!!cookedModalTarget}
          recipeId={cookedModalTarget.id}
          recipeTitle={cookedModalTarget.title}
          onSuccess={() => {
            if (cookedModalTarget.pullToToday) {
              pullToTodayAndMarkCooked(cookedModalTarget.entry);
            } else {
              toggleCooked(cookedModalTarget.entry);
            }
            setCookedModalTarget(null);
          }}
          onClose={() => setCookedModalTarget(null)}
        />
      )}
    </div>
  );
};

export default MealPlannerView;
