import type { Ingredient, IngredientGroup } from '../../types';
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

