import { useCallback } from 'react';
import type { MealPlanEntry } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { apiUrl } from '../../api';
import { addDays, formatDateIso } from './mealPlannerUtils';

interface UseMealPlanActionsProps {
  setMealPlans: React.Dispatch<React.SetStateAction<MealPlanEntry[]>>;
  fetchPlans: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export function useMealPlanActions({
  setMealPlans,
  fetchPlans,
  getAccessToken,
}: UseMealPlanActionsProps) {
  const toast = useToast();
  const { t } = useI18n();

  // Update servings
  const updateServings = useCallback(
    async (id: string, newServings: number) => {
      if (newServings < 1) return;
      setMealPlans((prev) => prev.map((p) => (p.id === id ? { ...p, servings: newServings } : p)));
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/meal-plan/${id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ servings: newServings }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to update servings');
        }
        window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
      } catch (err) {
        console.error('Failed to update servings:', err);
        fetchPlans();
      }
    },
    [getAccessToken, fetchPlans, setMealPlans],
  );

  // Toggle cooked status
  const toggleCooked = useCallback(
    async (entry: MealPlanEntry) => {
      const nextCooked = !entry.isCooked;
      setMealPlans((prev) => prev.map((p) => (p.id === entry.id ? { ...p, isCooked: nextCooked } : p)));
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/meal-plan/${entry.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isCooked: nextCooked }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to toggle cooked state');
        }
        window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
      } catch (err) {
        console.error('Failed to toggle cooked state:', err);
        fetchPlans();
      }
    },
    [getAccessToken, fetchPlans, setMealPlans],
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
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/meal-plan/${entry.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planDate: tomorrowStr }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to move plan to tomorrow');
        }
        toast.success(t('mealPlanner.movedToTomorrow'));
        window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
      } catch (err) {
        console.error('Failed to move plan to tomorrow:', err);
        toast.danger(t('common.networkError') || 'Fehler beim Verschieben');
        fetchPlans();
      }
    },
    [getAccessToken, toast, t, fetchPlans, setMealPlans],
  );

  // Move entry to today (pull forward)
  const moveToToday = useCallback(
    async (entry: MealPlanEntry) => {
      const todayStr = formatDateIso(new Date());
      if (entry.planDate === todayStr) return;
      setMealPlans((prev) =>
        prev.map((p) => (p.id === entry.id ? { ...p, planDate: todayStr } : p)),
      );
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/meal-plan/${entry.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planDate: todayStr }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to move plan to today');
        }
        toast.success(t('mealPlanner.movedToToday'));
        window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
      } catch (err) {
        console.error('Failed to move plan to today:', err);
        toast.danger(t('common.networkError') || 'Fehler beim Verschieben');
        fetchPlans();
      }
    },
    [getAccessToken, toast, t, fetchPlans, setMealPlans],
  );

  // Move entry to today and mark cooked (pull forward & cook)
  const pullToTodayAndMarkCooked = useCallback(
    async (entry: MealPlanEntry) => {
      const todayStr = formatDateIso(new Date());
      setMealPlans((prev) =>
        prev.map((p) =>
          p.id === entry.id ? { ...p, planDate: todayStr, isCooked: true } : p,
        ),
      );
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/meal-plan/${entry.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planDate: todayStr, isCooked: true }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to pull to today and mark cooked');
        }
        window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
      } catch (err) {
        console.error('Failed to pull to today and mark cooked:', err);
        fetchPlans();
      }
    },
    [getAccessToken, fetchPlans, setMealPlans],
  );

  // Delete plan entry
  const deletePlan = useCallback(
    async (id: string) => {
      setMealPlans((prev) => prev.filter((p) => p.id !== id));
      try {
        const token = await getAccessToken();
        const res = await fetch(apiUrl(`/api/meal-plan/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error?.message || 'Failed to delete meal plan');
        }
        toast.info(t('mealPlanner.removeFromPlan'));
        window.dispatchEvent(new CustomEvent('meal-plans-updated', { detail: { source: 'useMealPlanActions' } }));
      } catch (err) {
        console.error('Failed to delete meal plan:', err);
        fetchPlans();
      }
    },
    [getAccessToken, toast, t, fetchPlans, setMealPlans],
  );

  return {
    updateServings,
    toggleCooked,
    pullToTodayAndMarkCooked,
    moveToTomorrow,
    moveToToday,
    deletePlan,
  };
}
