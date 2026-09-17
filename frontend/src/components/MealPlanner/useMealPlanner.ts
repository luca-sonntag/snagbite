import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MealPlanEntry, MealType, SavedRecipe } from '../../types';
import type { WeekDayInfo } from './types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { apiUrl } from '../../api';
import { hapticLight } from '../../utils/haptics';
import { getMonday, formatDateIso, addDays, buildWeekDaysInfo, buildAgendaDates, groupDatesByWeek } from './mealPlannerUtils';
import { useMealPlanActions } from './useMealPlanActions';

export { getMonday, formatDateIso, addDays, buildWeekDaysInfo, buildAgendaDates, groupDatesByWeek };

export function useMealPlanner() {
  const { getAccessToken, user } = useAuth();
  const toast = useToast();
  const { t, language } = useI18n();

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(() => formatDateIso(new Date()));
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

  // Load from 28 days before today's Monday to include recent history in agenda stream
  const historyStartDateStr = useMemo(() => {
    const pastMonday = addDays(getMonday(new Date()), -28);
    return formatDateIso(pastMonday);
  }, []);

  // Fetch meal plans starting from 4 weeks in the past into the future
  const fetchPlans = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const token = await getAccessToken();
      const res = await fetch(apiUrl(`/api/meal-plan?startDate=${historyStartDateStr}`), {
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
  }, [user, getAccessToken, historyStartDateStr]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Listen to external cook & sync events (e.g. from RecipeDetails or CookingMode)
  useEffect(() => {
    const handleRecipeCooked = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId?: string }>;
      const cookedRecipeId = customEvent.detail?.recipeId;
      if (cookedRecipeId) {
        setMealPlans((prev) =>
          prev.map((p) =>
            p.recipeId === cookedRecipeId
              ? { ...p, isCooked: true }
              : p,
          ),
        );
      }
      fetchPlans();
    };

    const handleMealPlansUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ source?: string }>;
      if (customEvent.detail?.source === 'useMealPlanActions') {
        return;
      }
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

  const todayStr = useMemo(() => formatDateIso(new Date()), []);

  // Compute 7 days info for the week picker
  const weekDays = useMemo<WeekDayInfo[]>(() => {
    return buildWeekDaysInfo(currentWeekStart, mealPlans, language, todayStr);
  }, [currentWeekStart, mealPlans, language, todayStr]);

  // Add a recipe to meal plan
  const addPlan = useCallback(
    async (
      recipe: SavedRecipe,
      planDate: string,
      arg3?: MealType | number,
      arg4?: number,
    ) => {
      if (!user) {
        toast.danger(t('auth.pleaseSignIn') || 'Bitte melde dich an, um Rezepte zu planen');
        return;
      }

      const targetRecipeId =
        recipe.recipeId ||
        (recipe as unknown as { id?: string }).id ||
        recipe.recipe?.id;

      if (!targetRecipeId) {
        console.error('addPlan: Cannot resolve recipeId from recipe:', recipe);
        toast.danger(t('mealPlanner.addError') || 'Fehler beim Planen des Rezepts');
        return;
      }

      const targetDate = planDate || selectedDate;
      if (!targetDate) {
        console.error('addPlan: Missing target planDate');
        toast.danger(t('mealPlanner.addError') || 'Fehler beim Planen des Rezepts');
        return;
      }

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
            recipeId: targetRecipeId,
            planDate: targetDate,
            mealType,
            servings: targetServings,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          console.error('Failed to create meal plan:', res.status, data);
          toast.danger(data?.error?.message || t('mealPlanner.addError') || 'Fehler beim Planen des Rezepts');
          return;
        }

        if (data.mealPlan) {
          setMealPlans((prev) => [...prev.filter((p) => p.id !== data.mealPlan.id), data.mealPlan]);
          window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
          toast.success(t('mealPlanner.addedToPlan'));
        }
      } catch (err) {
        console.error('Failed to create meal plan:', err);
        toast.danger(t('common.networkError') || 'Netzwerkfehler beim Planen');
      }
    },
    [user, getAccessToken, toast, t, selectedDate],
  );

  // Meal plan CRUD mutations
  const {
    updateServings,
    toggleCooked,
    pullToTodayAndMarkCooked,
    moveToTomorrow,
    moveToToday,
    deletePlan,
  } = useMealPlanActions({
    setMealPlans,
    fetchPlans,
    getAccessToken,
  });


  const activeDayEntries = useMemo(() => {
    if (!selectedDate) return [];
    return mealPlans.filter((p) => p.planDate === selectedDate);
  }, [mealPlans, selectedDate]);

  const futurePlannedEntries = useMemo(() => {
    return mealPlans.filter((p) => p.planDate >= todayStr);
  }, [mealPlans, todayStr]);

  const upcomingPlannedEntries = useMemo(() => {
    return mealPlans.filter((p) => p.planDate >= todayStr && p.planDate !== selectedDate);
  }, [mealPlans, todayStr, selectedDate]);

  const futurePlannedCount = futurePlannedEntries.length;

  const [expandedWeekKeys, setExpandedWeekKeys] = useState<string[]>([]);

  const expandWeek = useCallback((weekKey: string) => {
    hapticLight();
    setExpandedWeekKeys((prev) => (prev.includes(weekKey) ? prev : [...prev, weekKey]));
  }, []);

  const agendaDates = useMemo(() => {
    return buildAgendaDates(new Date(), mealPlans, expandedWeekKeys);
  }, [mealPlans, expandedWeekKeys]);

  const agendaWeekGroups = useMemo(() => groupDatesByWeek(agendaDates), [agendaDates]);

  const nextExtendWeekStart = useMemo(() => {
    const currentMonday = getMonday(new Date());
    if (agendaWeekGroups.length === 0) return addDays(currentMonday, 7);
    const latestWeek = agendaWeekGroups[agendaWeekGroups.length - 1];
    return addDays(latestWeek.weekStart, 7);
  }, [agendaWeekGroups]);

  const nextExtendWeekEnd = useMemo(() => {
    return addDays(nextExtendWeekStart, 6);
  }, [nextExtendWeekStart]);

  const extendNextWeek = useCallback(() => {
    expandWeek(formatDateIso(nextExtendWeekStart));
  }, [expandWeek, nextExtendWeekStart]);

  return {
    currentWeekStart,
    setCurrentWeekStart,
    weekEnd,
    isCurrentWeek,
    selectedDate,
    setSelectedDate,
    mealPlans,
    agendaDates,
    agendaWeekGroups,
    expandedWeekKeys,
    expandWeek,
    extendNextWeek,
    nextExtendWeekStart,
    nextExtendWeekEnd,
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
    pullToTodayAndMarkCooked,
    moveToTomorrow,
    moveToToday,
    deletePlan,
  };
}
