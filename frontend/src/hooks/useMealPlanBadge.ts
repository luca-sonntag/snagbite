import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../api';
import { getMonday, formatDateIso, addDays } from '../components/MealPlanner/mealPlannerUtils';

interface UseMealPlanBadgeProps {
  user: { id: string } | null;
  authLoading?: boolean;
  getAccessToken: () => Promise<string | null>;
}

export function useMealPlanBadge({ user, authLoading, getAccessToken }: UseMealPlanBadgeProps) {
  const [outstandingCount, setOutstandingCount] = useState<number>(0);

  const fetchCurrentWeekOutstanding = useCallback(async () => {
    if (!user || authLoading) {
      if (!user) setOutstandingCount(0);
      return;
    }
    try {
      const today = new Date();
      const monday = getMonday(today);
      const sunday = addDays(monday, 6);
      const startStr = formatDateIso(monday);
      const endStr = formatDateIso(sunday);
      const todayStr = formatDateIso(today);

      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(apiUrl(`/api/meal-plan?startDate=${startStr}&endDate=${endStr}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const plans = data.mealPlans || data.data || [];
      if (data.success && Array.isArray(plans)) {
        // Count meals for today or later in the current week that are not cooked yet
        const count = plans.filter(
          (p: { planDate: string; isCooked: boolean }) => p.planDate >= todayStr && !p.isCooked
        ).length;
        setOutstandingCount(count);
      }
    } catch (err) {
      console.error('[useMealPlanBadge] Failed to fetch count:', err);
    }
  }, [user, authLoading, getAccessToken]);

  useEffect(() => {
    fetchCurrentWeekOutstanding();

    const handleUpdate = () => {
      fetchCurrentWeekOutstanding();
    };

    window.addEventListener('meal-plans-updated', handleUpdate);
    window.addEventListener('app:recipe-cooked', handleUpdate);
    return () => {
      window.removeEventListener('meal-plans-updated', handleUpdate);
      window.removeEventListener('app:recipe-cooked', handleUpdate);
    };
  }, [fetchCurrentWeekOutstanding]);

  return { outstandingCount, refreshMealPlanBadge: fetchCurrentWeekOutstanding };
}

