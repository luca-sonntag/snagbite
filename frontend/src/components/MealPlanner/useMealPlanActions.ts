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
    [getAccessToken, fetchPlans, setMealPlans],
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
    [getAccessToken, toast, t, fetchPlans, setMealPlans],
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
    [getAccessToken, toast, t, fetchPlans, setMealPlans],
  );

  return {
    updateServings,
    toggleCooked,
    moveToTomorrow,
    deletePlan,
  };
}
