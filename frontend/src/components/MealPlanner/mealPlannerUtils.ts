import type { Ingredient, IngredientGroup, MealPlanEntry } from '../../types';
import type { WeekDayInfo } from './types';
import { categoryOrder, legacyCategoryMap } from '../../i18n';

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function scaleIngredientGroups(
  ingredients: IngredientGroup[] | undefined,
  targetServings: number,
  baseServings: number,
): Ingredient[] {
  if (!ingredients || ingredients.length === 0) return [];
  const scaleFactor = (targetServings || baseServings) / (baseServings || 2);
  const scaled: Ingredient[] = [];

  for (const group of ingredients) {
    for (const item of group.items) {
      scaled.push({
        ...item,
        amount: (item.amount || 0) * scaleFactor,
      });
    }
  }
  return scaled;
}

/**
 * Formats a date string (YYYY-MM-DD) into a user-friendly separator label.
 * e.g. "Morgen • Mittwoch, 16. September" or "Freitag, 18. September"
 */
export function formatUpcomingDateSeparator(
  dateStr: string,
  language: string,
  relativeLabels?: { today?: string; tomorrow?: string; dayAfterTomorrow?: string },
): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(y, m - 1, d);
  targetMidnight.setHours(0, 0, 0, 0);

  const diffMs = targetMidnight.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const locale = language === 'en' ? 'en-US' : 'de-DE';
  const weekday = targetDate.toLocaleDateString(locale, { weekday: 'long' });
  const dayMonth = language === 'en'
    ? targetDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })
    : `${targetDate.getDate()}. ${targetDate.toLocaleDateString(locale, { month: 'long' })}`;

  const fullDate = `${weekday}, ${dayMonth}`;

  if (diffDays === 0 && relativeLabels?.today) {
    return `${relativeLabels.today} • ${fullDate}`;
  }
  if (diffDays === 1 && relativeLabels?.tomorrow) {
    return `${relativeLabels.tomorrow} • ${fullDate}`;
  }
  if (diffDays === 2 && relativeLabels?.dayAfterTomorrow) {
    return `${relativeLabels.dayAfterTomorrow} • ${fullDate}`;
  }

  return fullDate;
}

/**
 * Sorts ingredient groups by category order
 */
export function sortIngredientGroupsByCategory(
  ingredients: IngredientGroup[] | undefined,
): Array<{ group: IngredientGroup; originalIdx: number }> {
  if (!ingredients) return [];
  const mapped = ingredients.map((group, originalIdx) => ({ group, originalIdx }));
  return mapped.sort((a, b) => {
    const rank = (name: string) => {
      const up = name.trim().toUpperCase();
      const direct = categoryOrder.indexOf(up as any);
      if (direct !== -1) return direct;
      const key = legacyCategoryMap[name.trim().toLowerCase()];
      return key ? categoryOrder.indexOf(key) : 999;
    };
    return rank(a.group.name) - rank(b.group.name);
  });
}

export function formatShoppingAmount(amount: number | undefined): string {
  if (!amount) return '';
  const r = Math.round(amount * 10) / 10;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}

export function formatDateHuman(iso: string | undefined, language: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const locale = language === 'en' ? 'en-US' : 'de-DE';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function buildWeekDaysInfo(
  currentWeekStart: Date,
  mealPlans: MealPlanEntry[],
  language: string,
  todayStr: string,
): WeekDayInfo[] {
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
}

export function formatWeekRange(start: Date, end: Date, language: string): string {
  const locale = language === 'en' ? 'en-US' : 'de-DE';
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString(locale, { month: 'short' });
  const endMonth = end.toLocaleDateString(locale, { month: 'short' });

  if (startMonth === endMonth) {
    return locale === 'en-US'
      ? `${startMonth} ${startDay} – ${endDay}`
      : `${startDay}. – ${endDay}. ${startMonth}`;
  }

  return `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;
}

/**
 * Builds the chronological list of dates to render in the Unified Agenda Stream.
 * Stably includes all 7 days of the current week, any progressively extended future weeks,
 * plus any dates that have planned recipes (past & future).
 */
export function buildAgendaDates(
  todayDate: Date,
  mealPlans: MealPlanEntry[],
  activeWeekStartOrExpanded: Date | string | string[] | Set<string> = [],
): string[] {
  const dateSet = new Set<string>();
  const todayStr = formatDateIso(todayDate);
  const currentMonday = getMonday(todayDate);
  const currentMondayStr = formatDateIso(currentMonday);

  // 1. Current real week: only today and future days (>= todayStr)
  for (let i = 0; i < 7; i++) {
    const d = formatDateIso(addDays(currentMonday, i));
    if (d >= todayStr) {
      dateSet.add(d);
    }
  }

  // 2. Currently active week (if in future) or explicit active weeks
  const weeksToInclude: Date[] = [];
  if (activeWeekStartOrExpanded instanceof Date) {
    weeksToInclude.push(activeWeekStartOrExpanded);
  } else if (typeof activeWeekStartOrExpanded === 'string') {
    if (activeWeekStartOrExpanded) {
      weeksToInclude.push(new Date(activeWeekStartOrExpanded + 'T00:00:00'));
    }
  } else if (typeof activeWeekStartOrExpanded === 'number') {
    for (let w = 1; w <= activeWeekStartOrExpanded; w++) {
      weeksToInclude.push(addDays(currentMonday, w * 7));
    }
  } else if (Array.isArray(activeWeekStartOrExpanded) || activeWeekStartOrExpanded instanceof Set) {
    for (const item of activeWeekStartOrExpanded) {
      if (item) {
        weeksToInclude.push(new Date(item + 'T00:00:00'));
      }
    }
  }

  for (const weekDate of weeksToInclude) {
    const monday = getMonday(weekDate);
    const mondayStr = formatDateIso(monday);
    if (mondayStr > currentMondayStr) {
      for (let i = 0; i < 7; i++) {
        const d = formatDateIso(addDays(monday, i));
        if (d >= todayStr) {
          dateSet.add(d);
        }
      }
    }
  }

  // 3. Planned recipes:
  // - Future planned recipes: include their dates
  // - Past planned recipes (< todayStr): include ONLY the specific dates that have recipes
  for (const plan of mealPlans) {
    if (plan.planDate) {
      dateSet.add(plan.planDate);
    }
  }

  return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
}

export interface AgendaWeekGroup {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  dates: string[];
  isComplete: boolean;
}

/**
 * Groups an array of sorted date strings (YYYY-MM-DD) by calendar week (Monday–Sunday).
 */
export function groupDatesByWeek(dates: string[]): AgendaWeekGroup[] {
  const groupsMap = new Map<string, AgendaWeekGroup>();

  for (const dateStr of dates) {
    const d = new Date(dateStr + 'T00:00:00');
    const monday = getMonday(d);
    const mondayStr = formatDateIso(monday);

    let group = groupsMap.get(mondayStr);
    if (!group) {
      group = {
        weekKey: mondayStr,
        weekStart: monday,
        weekEnd: addDays(monday, 6),
        dates: [],
        isComplete: false,
      };
      groupsMap.set(mondayStr, group);
    }
    group.dates.push(dateStr);
  }

  const groups = Array.from(groupsMap.values());
  for (const g of groups) {
    g.isComplete = g.dates.length === 7;
  }
  return groups;
}

/**
 * Calculates the ISO-8601 calendar week number for a given date.
 */
export function getCalendarWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Formats a calendar week header label (e.g. "KW 38 · 14. – 20. Sep").
 */
export function formatWeekGroupHeader(
  weekStart: Date,
  weekEnd: Date,
  language: string,
): string {
  const kw = getCalendarWeek(weekStart);
  const kwPrefix = language === 'en' ? `CW ${kw}` : `KW ${kw}`;
  const range = formatWeekRange(weekStart, weekEnd, language);
  return `${kwPrefix} · ${range}`;
}

