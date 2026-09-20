import {
  countKeywordMatches,
  getActiveHolidays,
  getSeason,
  seasonKeywords,
  COMFORT_KEYWORDS,
  BRUNCH_KEYWORDS,
  PASTA_KEYWORDS,
  GRILL_KEYWORDS,
} from './season.js';
import type { RecommendationResult, Season, SharedSavedRecipe, SharedRecipe } from './types.js';

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

interface EvaluatedTheme<T> {
  themeId: string;
  titleKey: string;
  defaultTitle: string;
  badgeEmoji?: string;
  score: number;
  matchedJobs: T[];
}

/**
 * Smart recommendation engine that balances:
 * 1. True Short-Term Holidays (1-5 days, top score 95+)
 * 2. Lookahead Weekly Planning (Sunday/Monday week-ahead prep, Friday comfort, Saturday brunch/project)
 * 3. Daily Thematic Discovery (Tuesday seasonal highlights, Wednesday rediscovery, Thursday pasta classics)
 * 4. Graceful Fallbacks (baseline scores ensure high-quality shelf when primary theme has < 2 matches)
 */
export function getRecommendedShelf<T extends SharedSavedRecipe = SharedSavedRecipe>(
  jobs: T[],
  options: RecommendationOptions = {},
): RecommendationResult<T> | null {
  const now = options.now || new Date();
  const limit = options.limit || 12;
  const validJobs = jobs.filter((j) => j.recipe && j.recipe.title);

  if (validJobs.length < 2) {
    return null;
  }

  const localHour = now.getHours();
  const localWeekday = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentSeason = getSeason(now);
  const themes: EvaluatedTheme<T>[] = [];

  // 1. True Calendar Holidays (Short 1-5 day windows: Valentine's, Halloween, Christmas, Silvester, etc.)
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
        score: 95 + Math.min(matches.length, 5),
        matchedJobs: matches,
      });
    }
  }

  // Day-of-week & hour context flags
  const isSaturdayNight = localWeekday === 0 && localHour < 5; // Sat late night / Sun early morning
  const isFridayComfort = (localWeekday === 5 && localHour >= 12) || (localWeekday === 6 && localHour >= 18) || isSaturdayNight;
  const isWeekendMorning = (localWeekday === 6 || localWeekday === 0) && localHour >= 5 && localHour < 14;
  const isSundayPrep = localWeekday === 0 && localHour >= 15;
  const isMonday = localWeekday === 1;
  const isTuesday = localWeekday === 2;
  const isWednesday = localWeekday === 3;
  const isThursday = localWeekday === 4;
  const isFriday = localWeekday === 5;
  const isSaturday = localWeekday === 6;

  // 2. Quick Dinners / Week-Ahead Prep
  // Boosted on Monday (all day) and Sunday late afternoon/evening for weekly planning
  const quickMatches = validJobs
    .filter((job) => {
      const t = totalRecipeMinutes(job.recipe);
      return t > 0 && t <= 30;
    })
    .sort((a, b) => totalRecipeMinutes(a.recipe) - totalRecipeMinutes(b.recipe));

  if (quickMatches.length >= 2) {
    if (isSundayPrep) {
      themes.push({
        themeId: 'week_ahead',
        titleKey: 'catalog.recommendations.weekAhead',
        defaultTitle: 'Schnelle Ideen für die Woche',
        badgeEmoji: '⚡',
        score: 88 + Math.min(quickMatches.length, 5),
        matchedJobs: quickMatches,
      });
    } else {
      themes.push({
        themeId: 'quick_dinner',
        titleKey: 'catalog.recommendations.quickDinner',
        defaultTitle: 'Schnelle Feierabendküche',
        badgeEmoji: '⚡',
        score: (isMonday ? 88 : 73) + Math.min(quickMatches.length, 5),
        matchedJobs: quickMatches,
      });
    }
  }

  // 3. Seasonal Produce & Kitchen (Boosted on Tuesday, steady baseline on all other days)
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
      score: (isTuesday ? 88 : 75) + Math.min(seasonalMatches.length, 5),
      matchedJobs: seasonalMatches,
    });
  }

  // 4. Rediscovery / Forgotten Gems (Boosted on Wednesday, surfaces recipes untouched >= 14d, saved >= 21d)
  const DAY_MS = 24 * 60 * 60 * 1000;
  const recentMap = options.recentMap || {};
  const agedJobs = validJobs.filter((job) => {
    const ageDays = (now.getTime() - new Date(job.addedAt).getTime()) / DAY_MS;
    const lastSeen = recentMap[job.recipeId];
    const seenDaysAgo = lastSeen ? (now.getTime() - lastSeen) / DAY_MS : 999;
    return ageDays >= 21 && seenDaysAgo >= 14;
  });

  if (agedJobs.length >= 2) {
    const rediscoveryMatches = [...agedJobs].sort((a, b) => {
      const favDiff = Number(!!b.isFavorite) - Number(!!a.isFavorite);
      if (favDiff !== 0) return favDiff;
      return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
    });

    themes.push({
      themeId: 'rediscovery',
      titleKey: 'catalog.recommendations.rediscovery',
      defaultTitle: 'Wiederentdeckt für dich',
      badgeEmoji: '✨',
      score: (isWednesday ? 88 : 70) + Math.min(rediscoveryMatches.length, 5),
      matchedJobs: rediscoveryMatches,
    });
  }

  // 5. Pasta & Quick Classics (Boosted on Thursday for quick mid-week comfort)
  const pastaMatches = validJobs
    .map((job) => ({ job, count: countKeywordMatches(job.recipe!, PASTA_KEYWORDS) }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((m) => m.job);

  if (pastaMatches.length >= 2) {
    themes.push({
      themeId: 'pasta_classics',
      titleKey: 'catalog.recommendations.pastaClassics',
      defaultTitle: 'Pasta & Schnelle Lieblinge',
      badgeEmoji: '🍝',
      score: (isThursday ? 87 : 66) + Math.min(pastaMatches.length, 5),
      matchedJobs: pastaMatches,
    });
  }

  // 6. Weekend-Start & Comfort Food (Boosted on Friday afternoon through Saturday late night)
  const comfortMatches = validJobs
    .map((job) => ({ job, count: countKeywordMatches(job.recipe!, COMFORT_KEYWORDS) }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((m) => m.job);

  if (comfortMatches.length >= 2) {
    const isFri = localWeekday === 5;
    themes.push({
      themeId: isFri ? 'friday_comfort' : 'weekend_comfort',
      titleKey: isFri ? 'catalog.recommendations.fridayComfort' : 'catalog.recommendations.weekendComfort',
      defaultTitle: isFri ? 'Freitagabend Comfort Food' : 'Wochenend-Comfort Food & Snacks',
      badgeEmoji: '🍕',
      score: (isFridayComfort ? 89 : 68) + Math.min(comfortMatches.length, 5),
      matchedJobs: comfortMatches,
    });
  }

  // 7. Weekend Brunch (Saturday and Sunday morning 05:00 - 14:00)
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
      score: (isWeekendMorning ? 88 : 65) + Math.min(brunchMatches.length, 5),
      matchedJobs: brunchMatches,
    });
  }

  // 8. Summer Weekend Grilling (Saturday afternoon in summer)
  if (currentSeason === 'summer') {
    const grillMatches = validJobs
      .map((job) => ({ job, count: countKeywordMatches(job.recipe!, GRILL_KEYWORDS) }))
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((m) => m.job);

    if (grillMatches.length >= 2) {
      const isSaturdayGrill = isSaturday && localHour >= 12 && localHour < 20;
      themes.push({
        themeId: 'summer_grill',
        titleKey: 'catalog.recommendations.holidayGrill',
        defaultTitle: 'Sommer-Rezepte & Grillen',
        badgeEmoji: '🔥',
        score: (isSaturdayGrill ? 88 : 74) + Math.min(grillMatches.length, 5),
        matchedJobs: grillMatches,
      });
    }
  }

  // 9. Weekend Cooking Project (Saturday / Sunday afternoon, recipes >= 35 min)
  const projectMatches = validJobs
    .filter((job) => totalRecipeMinutes(job.recipe) >= 35)
    .sort((a, b) => totalRecipeMinutes(b.recipe) - totalRecipeMinutes(a.recipe));

  if (projectMatches.length >= 2) {
    const isWeekendProjectTime = (isSaturday || (localWeekday === 0 && localHour < 15)) && localHour >= 13;
    themes.push({
      themeId: 'weekend_project',
      titleKey: 'catalog.recommendations.weekendProject',
      defaultTitle: 'Wochenend-Kochprojekt',
      badgeEmoji: '🍲',
      score: (isWeekendProjectTime ? 86 : 64) + Math.min(projectMatches.length, 5),
      matchedJobs: projectMatches,
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
    recipes: bestTheme.matchedJobs.slice(0, limit),
    allRecipes: bestTheme.matchedJobs,
    totalCount: bestTheme.matchedJobs.length,
  };
}
