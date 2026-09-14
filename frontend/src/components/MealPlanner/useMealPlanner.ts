import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealPlanEntry, MealType, SavedRecipe } from '../../types';
import type { WeekDayInfo } from './types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { apiUrl } from '../../api';
import { hapticLight } from '../../utils/haptics';
import { getMonday, formatDateIso, addDays } from './mealPlannerUtils';

export { getMonday, formatDateIso, addDays };

export function useMealPlanner() {
  const { getAccessToken, user } = useAuth();
  const toast = useToast();
  const { t, language } = useI18n();

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateIso(new Date()));
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  const pickerSlot = useMemo(() => {
    return pickerDate ? { date: pickerDate, mealType: 'dinner' as MealType } : null;
  }, [pickerDate]);

  const setPickerSlot = useCallback((slot: { date: string; mealType?: MealType } | null) => {
    setPickerDate(slot ? slot.date : null);
  }, []);

  const weekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart]);
  const startDateStr = useMemo(() => formatDateIso(currentWeekStart), [currentWeekStart]);

  const isCurrentWeek = useMemo(() => {
    const todayMonday = getMonday(new Date());
    return formatDateIso(todayMonday) === startDateStr;
  }, [startDateStr]);

  // Fetch meal plans starting from the viewed week into the future
  const fetchPlans = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const token = await getAccessToken();
      const res = await fetch(apiUrl(`/api/meal-plan?startDate=${startDateStr}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.mealPlans)) {
        setMealPlans(data.mealPlans);
      }
    } catch (err) {
      console.error('Failed to fetch meal plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, getAccessToken, startDateStr]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Listen to external cook & sync events (e.g. from RecipeDetails or CookingMode)
  useEffect(() => {
    const handleRecipeCooked = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId?: string }>;
      const cookedRecipeId = customEvent.detail?.recipeId;
      if (cookedRecipeId) {
        const todayIso = formatDateIso(new Date());
        setMealPlans((prev) =>
          prev.map((p) =>
            p.recipeId === cookedRecipeId && (p.planDate === todayIso || p.planDate === selectedDate)
              ? { ...p, isCooked: true }
              : p,
          ),
        );
      }
      fetchPlans();
    };

    const handleMealPlansUpdated = () => {
      fetchPlans();
    };

    window.addEventListener('app:recipe-cooked', handleRecipeCooked);
    window.addEventListener('meal-plans-updated', handleMealPlansUpdated);

    return () => {
      window.removeEventListener('app:recipe-cooked', handleRecipeCooked);
      window.removeEventListener('meal-plans-updated', handleMealPlansUpdated);
    };
  }, [fetchPlans]);

  // Navigation handlers
  const goToPrevWeek = useCallback(() => {
    hapticLight();
    setCurrentWeekStart((prev) => {
      const next = addDays(prev, -7);
      setSelectedDate(formatDateIso(next));
      return next;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    hapticLight();
    setCurrentWeekStart((prev) => {
      const next = addDays(prev, 7);
      setSelectedDate(formatDateIso(next));
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    hapticLight();
    const today = new Date();
    setCurrentWeekStart(getMonday(today));
    setSelectedDate(formatDateIso(today));
  }, []);

  // Compute 7 days info for the week picker
  const weekDays = useMemo<WeekDayInfo[]>(() => {
    const todayStr = formatDateIso(new Date());
    const dayNamesDe = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayNames = language === 'en' ? dayNamesEn : dayNamesDe;

    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(currentWeekStart, i);
      const dStr = formatDateIso(d);
      const dayPlans = mealPlans.filter((p) => p.planDate === dStr);
      const plannedCount = dayPlans.length;
      const cookedCount = dayPlans.filter((p) => p.isCooked).length;

      return {
        date: d,
        dateStr: dStr,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        isToday: dStr === todayStr,
        plannedCount,
        cookedCount,
      };
    });
  }, [currentWeekStart, mealPlans, language]);

  // Add a recipe to meal plan
  const addPlan = useCallback(
    async (
      recipe: SavedRecipe,
      planDate: string,
      arg3?: MealType | number,
      arg4?: number,
    ) => {
      if (!user) return;
      const mealType: MealType = typeof arg3 === 'string' ? arg3 : 'dinner';
      const servingsParam = typeof arg3 === 'number' ? arg3 : arg4;
      const targetServings =
        servingsParam ??
        (recipe.recipe?.servings ? Number(recipe.recipe.servings) : 2);
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl('/api/meal-plan'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipeId: recipe.recipeId,
            planDate,
            mealType,
            servings: targetServings,
          }),
        });
        const data = await res.json();
        if (data.success && data.mealPlan) {
          setMealPlans((prev) => [...prev, data.mealPlan]);
          window.dispatchEvent(new CustomEvent('meal-plans-updated'));
          toast.success(t('mealPlanner.addedToPlan'));
        }
      } catch (err) {
        console.error('Failed to create meal plan:', err);
      }
    },
    [user, getAccessToken, toast, t],
  );

  // Update servings
  const updateServings = useCallback(
    async (id: string, newServings: number) => {
      if (newServings < 1) return;
      setMealPlans((prev) => prev.map((p) => (p.id === id ? { ...p, servings: newServings } : p)));
      try {
        const token = await getAccessToken();
        await fetch(apiUrl(`/api/meal-plan/${id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ servings: newServings }),
        });
      } catch (err) {
        console.error('Failed to update servings:', err);
        fetchPlans();
      }
    },
    [getAccessToken, fetchPlans],
  );

  // Toggle cooked status
  const toggleCooked = useCallback(
    async (entry: MealPlanEntry) => {
      const nextCooked = !entry.isCooked;
      setMealPlans((prev) => prev.map((p) => (p.id === entry.id ? { ...p, isCooked: nextCooked } : p)));
      window.dispatchEvent(new CustomEvent('meal-plans-updated'));
      try {
        const token = await getAccessToken();
        await fetch(apiUrl(`/api/meal-plan/${entry.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isCooked: nextCooked }),
        });
      } catch (err) {
        console.error('Failed to toggle cooked state:', err);
        fetchPlans();
      }
    },
    [getAccessToken, fetchPlans],
  );

  // Move entry to tomorrow
  const moveToTomorrow = useCallback(
    async (entry: MealPlanEntry) => {
      const currentDate = new Date(entry.planDate + 'T00:00:00');
      const tomorrow = addDays(currentDate, 1);
      const tomorrowStr = formatDateIso(tomorrow);
      setMealPlans((prev) =>
        prev.map((p) => (p.id === entry.id ? { ...p, planDate: tomorrowStr } : p)),
      );
      window.dispatchEvent(new CustomEvent('meal-plans-updated'));
      try {
        const token = await getAccessToken();
        await fetch(apiUrl(`/api/meal-plan/${entry.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planDate: tomorrowStr }),
        });
        toast.success(t('mealPlanner.movedToTomorrow'));
      } catch (err) {
        console.error('Failed to move plan to tomorrow:', err);
        fetchPlans();
      }
    },
    [getAccessToken, toast, t, fetchPlans],
  );

  // Delete plan entry
  const deletePlan = useCallback(
    async (id: string) => {
      setMealPlans((prev) => prev.filter((p) => p.id !== id));
      window.dispatchEvent(new CustomEvent('meal-plans-updated'));
      try {
        const token = await getAccessToken();
        await fetch(apiUrl(`/api/meal-plan/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.info(t('mealPlanner.removeFromPlan'));
      } catch (err) {
        console.error('Failed to delete meal plan:', err);
        fetchPlans();
      }
    },
    [getAccessToken, toast, t, fetchPlans],
  );

  const activeDayEntries = useMemo(() => {
    return mealPlans.filter((p) => p.planDate === selectedDate);
  }, [mealPlans, selectedDate]);

  const todayStr = useMemo(() => formatDateIso(new Date()), []);

  const futurePlannedEntries = useMemo(() => {
    return mealPlans.filter((p) => p.planDate >= todayStr);
  }, [mealPlans, todayStr]);

  const upcomingPlannedEntries = useMemo(() => {
    return mealPlans.filter((p) => p.planDate >= todayStr && p.planDate !== selectedDate);
  }, [mealPlans, todayStr, selectedDate]);

  const futurePlannedCount = futurePlannedEntries.length;

  return {
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
    toggleCooked,
    moveToTomorrow,
    deletePlan,
  };
}
