/**
 * Gamification orchestration: turns a "user cooked recipe X" event into a
 * persisted cook_event + ledger row + updated aggregate stats + badges.
 *
 * The pure scoring math lives in gamificationFormula.ts; this module is the I/O
 * shell that loads context, applies streak/level bookkeeping, and writes.
 *
 * Concurrency note: user_stats is updated read-modify-write. Two *concurrent*
 * cooks by the same user could race; for the expected single-user, low-frequency
 * usage this is acceptable, and the duplicate guard below absorbs rapid re-taps.
 * A DB-side transaction/RPC is the natural upgrade if that ever matters.
 */
import type { CookSignals, CookedResult, UserStats } from './types.js';
import { computeAward, levelForXp } from './gamificationFormula.js';
import { DEFAULT_BADGE_XP } from './types.js';
import {
  getGamificationConfig,
  getUserStats,
  getLastCookEvent,
  getCookCountForRecipe,
  getCookCountSince,
  insertCookEvent,
  insertLedgerRows,
  upsertUserStats,
  getUserBadges,
  awardBadges,
  getDistinctCookedRecipeCount,
  getTimerCookCount,
  getWeekendCookCount,
  getMaxCooksForSameRecipe,
} from './db.js';

/** All badge keys the launch set can award (labels live in the frontend i18n). */
export const BADGE_KEYS = [
  'first_cook', 'cook_10', 'cook_25', 'cook_50', 'cook_100',
  'streak_3', 'streak_7', 'streak_30',
  'first_photo', 'distinct_5', 'distinct_10', 'distinct_25',
  'night_owl', 'weekend_chef',
  'timer_first', 'timer_10',
  'same_recipe_3',
] as const;

// ── Date helpers (UTC day boundaries) ────────────────────────────────────────
// Streaks use UTC days so the server stays authoritative without a client TZ.
// Known simplification: a late-evening cook near the UTC boundary may land on
// the next day; acceptable for the first pass.

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDayIso(d: Date): string {
  return `${utcDateStr(d)}T00:00:00.000Z`;
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDateStr(d);
}

interface BadgeEvalParams {
  totalCooks: number;
  currentStreak: number;
  hasPhoto: boolean;
  distinctRecipes: number;
  isNightCook: boolean;
  isWeekendCook: boolean;
  timerCooks: number;
  weekendCooks: number;
  maxSameRecipeCooks: number;
  existing: Set<string>;
}

/** Returns badge keys newly earned by this cook (not already held). */
function evaluateBadges(p: BadgeEvalParams): string[] {
  const earned: string[] = [];
  const add = (k: string) => { if (!p.existing.has(k)) earned.push(k); };
  // Total cooks milestones
  if (p.totalCooks >= 1) add('first_cook');
  if (p.totalCooks >= 10) add('cook_10');
  if (p.totalCooks >= 25) add('cook_25');
  if (p.totalCooks >= 50) add('cook_50');
  if (p.totalCooks >= 100) add('cook_100');
  // Streaks
  if (p.currentStreak >= 3) add('streak_3');
  if (p.currentStreak >= 7) add('streak_7');
  if (p.currentStreak >= 30) add('streak_30');
  // Photo verification
  if (p.hasPhoto) add('first_photo');
  // Variety
  if (p.distinctRecipes >= 5) add('distinct_5');
  if (p.distinctRecipes >= 10) add('distinct_10');
  if (p.distinctRecipes >= 25) add('distinct_25');
  // Time-based
  if (p.isNightCook) add('night_owl');
  if (p.weekendCooks >= 5) add('weekend_chef');
  // Timer
  if (p.timerCooks >= 1) add('timer_first');
  if (p.timerCooks >= 10) add('timer_10');
  // Loyalty
  if (p.maxSameRecipeCooks >= 3) add('same_recipe_3');
  return earned;
}

/**
 * Record that `userId` cooked `recipeId`, awarding XP/coins and updating streak,
 * level and badges. Returns everything the reward overlay needs to animate.
 *
 * Keyed by recipe, not by job: "the same recipe" is a property of the content,
 * which is what the duplicate guard and the repetition factor always meant.
 */
export async function recordCook(
  userId: string,
  recipeId: string,
  signals: CookSignals = {},
): Promise<CookedResult> {
  const config = await getGamificationConfig();
  const prevStats = await getUserStats(userId);
  const previousXp = prevStats.xp;
  const previousLevel = prevStats.level;
  const now = new Date();

  // Duplicate guard: same recipe re-tapped within the velocity window is a no-op
  // so a double-tap doesn't double-award. Different recipes are never blocked.
  const last = await getLastCookEvent(userId);
  if (last && last.recipeId === recipeId) {
    const deltaMs = now.getTime() - new Date(last.cookedAt).getTime();
    if (deltaMs < config.velocityMinSeconds * 1000) {
      return {
        stats: prevStats,
        earned: { xp: 0, coins: 0, reasons: ['duplicate'] },
        newBadges: [],
        previousXp,
        previousLevel,
        leveledUp: false,
        duplicate: true,
      };
    }
  }

  const priorCookCount = await getCookCountForRecipe(
    userId,
    recipeId,
    config.repetitionWindowDays,
  );
  const cooksToday = await getCookCountSince(userId, startOfUtcDayIso(now));
  const cookIndexToday = cooksToday + 1;

  // Streak: at most one increment per day; a gap of >1 day resets to 1.
  const today = utcDateStr(now);
  let currentStreak: number;
  if (prevStats.lastCookDate === today) {
    currentStreak = prevStats.currentStreak || 1; // already cooked today — hold
  } else if (prevStats.lastCookDate && addDaysStr(prevStats.lastCookDate, 1) === today) {
    currentStreak = (prevStats.currentStreak || 0) + 1;
  } else {
    currentStreak = 1;
  }
  const longestStreak = Math.max(prevStats.longestStreak, currentStreak);

  const hasPhoto = !!signals.hasPhoto && !!signals.photoPath;
  const award = computeAward(config, {
    priorCookCount,
    cookIndexToday,
    streakDays: currentStreak,
    hasPhoto,
    difficultyTier: '1', // no difficulty signal on recipes yet — flat at launch
  });

  const cookEventId = await insertCookEvent({
    userId,
    recipeId,
    xp: award.xp,
    coins: award.coins,
    hasPhoto,
    photoPath: signals.photoPath ?? null,
    verified: award.verified,
    leaderboardEligible: award.leaderboardEligible,
    trustScore: award.trustScore,
    viaCookingMode: !!signals.viaCookingMode,
    timerElapsed: !!signals.timerElapsed,
  });

  await insertLedgerRows(userId, cookEventId, [
    { deltaXp: award.xp, deltaCoins: award.coins, reason: 'cook' },
  ]);

  const newXp = previousXp + award.xp;
  const newLevel = levelForXp(newXp, config.levelThresholds);
  const newStats: UserStats = {
    userId,
    xp: newXp,
    level: newLevel,
    coins: prevStats.coins + award.coins,
    currentStreak,
    longestStreak,
    lastCookDate: today,
    totalCooks: prevStats.totalCooks + 1,
  };
  await upsertUserStats(newStats);

  // Badges — counts read after insert so they include this cook.
  const cookHour = now.getUTCHours();
  const cookDay = now.getUTCDay();
  const isNightCook = cookHour >= 22 || cookHour < 5;
  const isWeekendCook = cookDay === 0 || cookDay === 6;

  const [existing, distinctRecipes, timerCooks, weekendCooks, maxSameRecipeCooks] = await Promise.all([
    getUserBadges(userId).then((keys) => new Set(keys)),
    getDistinctCookedRecipeCount(userId),
    getTimerCookCount(userId),
    getWeekendCookCount(userId),
    getMaxCooksForSameRecipe(userId),
  ]);

  const newBadges = evaluateBadges({
    totalCooks: newStats.totalCooks,
    currentStreak,
    hasPhoto,
    distinctRecipes,
    isNightCook,
    isWeekendCook,
    timerCooks,
    weekendCooks,
    maxSameRecipeCooks,
    existing,
  });
  await awardBadges(userId, newBadges);

  // One-off badge XP/coins — server-authoritative (mirrors DEFAULT_BADGE_XP).
  // Badges are awarded at most once, so this never double-counts.
  let badgeXp = 0;
  let badgeCoins = 0;
  const badgeLedgerRows: { deltaXp: number; deltaCoins: number; reason: string }[] = [];
  for (const key of newBadges) {
    const xp = config.badgeXp?.[key] ?? DEFAULT_BADGE_XP[key] ?? 0;
    if (xp > 0) {
      badgeXp += xp;
      badgeCoins += Math.floor(xp * config.coinsPerXp);
      badgeLedgerRows.push({ deltaXp: xp, deltaCoins: Math.floor(xp * config.coinsPerXp), reason: `badge:${key}` });
    }
  }
  if (badgeLedgerRows.length > 0) {
    await insertLedgerRows(userId, cookEventId, badgeLedgerRows);
    newStats.xp += badgeXp;
    newStats.coins += badgeCoins;
    newStats.level = levelForXp(newStats.xp, config.levelThresholds);
    await upsertUserStats(newStats);
  }

  const totalXp = award.xp + badgeXp;
  const totalCoins = award.coins + badgeCoins;
  const reasons = badgeXp > 0
    ? [...award.reasons, ...newBadges.map((k) => `badge_${k}_+${config.badgeXp?.[k] ?? DEFAULT_BADGE_XP[k] ?? 0}`)] as string[]
    : award.reasons;

  return {
    stats: newStats,
    earned: { xp: totalXp, coins: totalCoins, reasons },
    newBadges,
    previousXp,
    previousLevel,
    leveledUp: newStats.level > previousLevel,
  };
}
