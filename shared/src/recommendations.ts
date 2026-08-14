import { countKeywordMatches, getActiveHolidays, getSeason, seasonKeywords } from './season.js';
import type { RecommendationResult, Season, SharedJob, SharedRecipe } from './types.js';

export interface RecommendationOptions {
  now?: Date;
  recentMap?: Record<string, number>;
  limit?: number;
}

export function totalRecipeMinutes(recipe?: SharedRecipe | null): number {
  if (!recipe) return 0;
  const toNum = (val: unknown) => {
    if (typeof val === 'number') return val;
    return parseInt(String(val ?? ''), 10) || 0;
  };
  return toNum(recipe.prepTime) + toNum(recipe.cookTime);
}

const SEASON_THEME_KEYS: Record<Season, { titleKey: string; defaultTitle: string; badgeEmoji: string }> = {
  spring: {
    titleKey: 'catalog.recommendations.spring',
    defaultTitle: 'Frische Frühlings-Küche',
    badgeEmoji: '🌸',
  },
  summer: {
    titleKey: 'catalog.recommendations.summer',
    defaultTitle: 'Sommer-Rezepte & Frische Küche',
    badgeEmoji: '☀️',
  },
  autumn: {
    titleKey: 'catalog.recommendations.autumn',
    defaultTitle: 'Herbst-Genuss & Saisonales',
    badgeEmoji: '🍂',
  },
  winter: {
    titleKey: 'catalog.recommendations.winter',
    defaultTitle: 'Wärmende Winter-Küche',
    badgeEmoji: '❄️',
  },
};

const COMFORT_KEYWORDS = [
  'pizza', 'burger', 'pasta', 'taco', 'nacho', 'fries', 'fritten', 'pommes',
  'comfort', 'cheese', 'käse', 'snack', 'dip', 'fingerfood', 'wings', 'wrap',
  'sandwich', 'toast', 'overload', 'cremig', 'creamy', 'fondue'
];

const BRUNCH_KEYWORDS = [
  'pancake', 'waffel', 'waffle', 'ei', 'egg', 'omelett', 'omelette', 'rührei',
  'toast', 'brunch', 'frühstück', 'breakfast', 'smoothie', 'bowl', 'porridge',
  'müsli', 'croissant', 'crepe', 'stulle', 'avocado'
];

/**
 * Pure recommendation engine that analyzes a user's completed jobs and ranks
 * candidate contextual themes (holidays, seasons, Friday comfort, weekend projects, quick dinners).
 */
export function getRecommendedShelf<T extends SharedJob = SharedJob>(
  jobs: T[],
  options: RecommendationOptions = {},
): RecommendationResult<T> | null {
  const now = options.now || new Date();
  const limit = options.limit || 12;
  const validJobs = jobs.filter((j) => j.status === 'completed' && j.recipe && j.recipe.title);

  if (validJobs.length < 2) {
    return null;
  }

  const localHour = now.getHours();
  const localWeekday = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

  interface EvaluatedTheme {
    themeId: string;
    titleKey: string;
    defaultTitle: string;
    badgeEmoji?: string;
    score: number;
    matchedJobs: T[];
  }

  const themes: EvaluatedTheme[] = [];

  // 1. Holiday / Culinary Season Events (High priority when active in calendar)
  const activeHolidays = getActiveHolidays(now);
  for (const holiday of activeHolidays) {
    const matches = validJobs
      .map((job) => ({ job, count: countKeywordMatches(job.recipe!, holiday.keywords) }))
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((m) => m.job);

    if (matches.length >= 2) {
      themes.push({
        themeId: `holiday_${holiday.id}`,
        titleKey: holiday.titleKey,
        defaultTitle: holiday.defaultTitle,
        badgeEmoji: holiday.badgeEmoji,
        score: 90 + Math.min(matches.length, 5) * 2,
        matchedJobs: matches,
      });
    }
  }

  // 2. Friday Night Comfort Food (Friday 12:00+ through Saturday 04:00)
  const isFridayEvening = (localWeekday === 5 && localHour >= 12) || (localWeekday === 6 && localHour < 4);
  if (isFridayEvening) {
    const comfortMatches = validJobs
      .map((job) => ({ job, count: countKeywordMatches(job.recipe!, COMFORT_KEYWORDS) }))
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((m) => m.job);

    if (comfortMatches.length >= 2) {
      themes.push({
        themeId: 'friday_comfort',
        titleKey: 'catalog.recommendations.fridayComfort',
        defaultTitle: 'Freitagabend Comfort Food',
        badgeEmoji: '🍕',
        score: 85 + Math.min(comfortMatches.length, 5),
        matchedJobs: comfortMatches,
      });
    }
  }

  // 3. Weekend Morning Brunch (Saturday & Sunday 06:00 - 13:00)
  const isWeekendMorning = (localWeekday === 0 || localWeekday === 6) && localHour >= 6 && localHour < 14;
  if (isWeekendMorning) {
    const brunchMatches = validJobs
      .map((job) => ({ job, count: countKeywordMatches(job.recipe!, BRUNCH_KEYWORDS) }))
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((m) => m.job);

    if (brunchMatches.length >= 2) {
      themes.push({
        themeId: 'weekend_brunch',
        titleKey: 'catalog.recommendations.weekendBrunch',
        defaultTitle: 'Wochenend-Frühstück & Brunch',
        badgeEmoji: '🥞',
        score: 82 + Math.min(brunchMatches.length, 5),
        matchedJobs: brunchMatches,
      });
    }
  }

  // 4. Weekend Cooking Project (Saturday & Sunday 14:00 - 23:00)
  const isWeekendAfternoon = (localWeekday === 0 || localWeekday === 6) && localHour >= 14;
  if (isWeekendAfternoon) {
    const projectMatches = validJobs
      .filter((job) => totalRecipeMinutes(job.recipe) >= 35)
      .sort((a, b) => totalRecipeMinutes(b.recipe) - totalRecipeMinutes(a.recipe));

    if (projectMatches.length >= 2) {
      themes.push({
        themeId: 'weekend_project',
        titleKey: 'catalog.recommendations.weekendProject',
        defaultTitle: 'Wochenend-Kochprojekt',
        badgeEmoji: '🍲',
        score: 78 + Math.min(projectMatches.length, 5),
        matchedJobs: projectMatches,
      });
    }
  }

  // 5. Quick Weeknight Dinner (Monday - Thursday 15:00 - 22:00)
  const isWeeknight = localWeekday >= 1 && localWeekday <= 4 && localHour >= 15 && localHour <= 22;
  if (isWeeknight) {
    const quickMatches = validJobs
      .filter((job) => {
        const t = totalRecipeMinutes(job.recipe);
        return t > 0 && t <= 30;
      })
      .sort((a, b) => totalRecipeMinutes(a.recipe) - totalRecipeMinutes(b.recipe));

    if (quickMatches.length >= 2) {
      themes.push({
        themeId: 'quick_dinner',
        titleKey: 'catalog.recommendations.quickDinner',
        defaultTitle: 'Schnelle Feierabendküche',
        badgeEmoji: '⚡',
        score: 75 + Math.min(quickMatches.length, 5),
        matchedJobs: quickMatches,
      });
    }
  }

  // 6. Seasonal Produce & Kitchen (Always evaluated as reliable seasonal anchor)
  const currentSeason = getSeason(now);
  const sKws = seasonKeywords(currentSeason);
  const seasonalMatches = validJobs
    .map((job) => ({ job, count: countKeywordMatches(job.recipe!, sKws) }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((m) => m.job);

  if (seasonalMatches.length >= 2) {
    const sTheme = SEASON_THEME_KEYS[currentSeason];
    themes.push({
      themeId: `seasonal_${currentSeason}`,
      titleKey: sTheme.titleKey,
      defaultTitle: sTheme.defaultTitle,
      badgeEmoji: sTheme.badgeEmoji,
      score: 70 + Math.min(seasonalMatches.length, 5) * 2,
      matchedJobs: seasonalMatches,
    });
  }

  // 7. Rediscovery / Forgotten Gems (Fallback when recipes saved > 21 days ago)
  const DAY_MS = 24 * 60 * 60 * 1000;
  const recentMap = options.recentMap || {};
  const agedJobs = validJobs.filter((job) => {
    const ageDays = (now.getTime() - new Date(job.createdAt).getTime()) / DAY_MS;
    const lastSeen = recentMap[job.id];
    const seenDaysAgo = lastSeen ? (now.getTime() - lastSeen) / DAY_MS : 999;
    return ageDays >= 21 && seenDaysAgo >= 14;
  });

  if (agedJobs.length >= 2) {
    // Sort favorites first, then older
    const rediscoveryMatches = [...agedJobs].sort((a, b) => {
      const favDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite);
      if (favDiff !== 0) return favDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    themes.push({
      themeId: 'rediscovery',
      titleKey: 'catalog.recommendations.rediscovery',
      defaultTitle: 'Wiederentdeckt für dich',
      badgeEmoji: '✨',
      score: 50,
      matchedJobs: rediscoveryMatches,
    });
  }

  if (themes.length === 0) {
    return null;
  }

  // Pick the highest scoring theme
  themes.sort((a, b) => b.score - a.score);
  const bestTheme = themes[0];

  return {
    themeId: bestTheme.themeId,
    titleKey: bestTheme.titleKey,
    defaultTitle: bestTheme.defaultTitle,
    badgeEmoji: bestTheme.badgeEmoji,
    jobs: bestTheme.matchedJobs.slice(0, limit),
    allJobs: bestTheme.matchedJobs,
    totalCount: bestTheme.matchedJobs.length,
  };
}
