import type { SavedRecipe } from '../../types';

export interface TimelineGroup {
  id: string;
  label: string;
  items: SavedRecipe[];
}

export interface TimelineGroupTranslations {
  today: string;
  yesterday: string;
  thisWeek: string;
  lastWeek: string;
}

/**
 * Normalizes a date to start-of-day timestamp (midnight local time)
 */
function getStartOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Groups recipes into human-friendly chronological time clusters:
 * "Heute" -> "Gestern" -> "Diese Woche" -> "Letzte Woche" -> Month/Year names
 */
export function groupRecipesByTimeline(
  recipes: SavedRecipe[],
  translations: TimelineGroupTranslations,
  locale: string = 'de-DE',
  now: Date = new Date()
): TimelineGroup[] {
  if (!recipes || recipes.length === 0) return [];

  // Sort newest first
  const sorted = [...recipes].sort((a, b) => {
    const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return timeB - timeA;
  });

  const todayMidnight = getStartOfDay(now);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const groupsMap = new Map<string, TimelineGroup>();

  for (const job of sorted) {
    const rawDate = job.addedAt ? new Date(job.addedAt) : now;
    const jobDate = isNaN(rawDate.getTime()) ? now : rawDate;
    const jobMidnight = getStartOfDay(jobDate);
    const diffDays = Math.round((todayMidnight - jobMidnight) / oneDayMs);

    let id: string;
    let label: string;

    if (diffDays <= 0) {
      id = 'today';
      label = translations.today;
    } else if (diffDays === 1) {
      id = 'yesterday';
      label = translations.yesterday;
    } else if (diffDays <= 7) {
      id = 'this_week';
      label = translations.thisWeek;
    } else if (diffDays <= 14) {
      id = 'last_week';
      label = translations.lastWeek;
    } else {
      const year = jobDate.getFullYear();
      const month = jobDate.getMonth();
      const isCurrentYear = year === now.getFullYear();
      id = `month_${year}_${month}`;
      const rawLabel = jobDate.toLocaleDateString(locale, {
        month: 'long',
        year: isCurrentYear ? undefined : 'numeric',
      });
      label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    }

    let group = groupsMap.get(id);
    if (!group) {
      group = { id, label, items: [] };
      groupsMap.set(id, group);
    }
    group.items.push(job);
  }

  return Array.from(groupsMap.values());
}
