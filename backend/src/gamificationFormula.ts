/**
 * Pure gamification formula — no I/O, no DB, no env. This is the testable core
 * that turns "a user cooked a recipe" into an XP/coins award. The orchestration
 * (loading stats, persisting events, streaks, badges) lives in gamification.ts.
 *
 * Design notes:
 * - Trust is a *bonus*, never a penalty: any honest cook gets the full base;
 *   a finished-dish photo adds a percentage on top and makes the cook
 *   leaderboard-eligible. We never punish people who cook without the app's
 *   cooking mode / timers.
 * - Repetition is only gently diminished (a floor, not a punishment) and only
 *   within `repetitionWindowDays`. Cooking the same favorite every week is
 *   encouraged, not penalized — the daily soft-cap handles anti-grind instead.
 */
import type { GamificationConfig, DailySoftcap, StreakTier } from './types.js';

export interface AwardContext {
  /** Times this recipe was cooked *before* this cook (0 = first time). */
  priorCookCount: number;
  /** 1-based index of this cook among today's cooks (for the daily soft-cap). */
  cookIndexToday: number;
  /** The user's streak length in weeks *after* this cook (for the streak multiplier). */
  streakDays?: number;
  streakWeeks?: number;
  /** Whether a finished-dish photo is attached. */
  hasPhoto: boolean;
  /** Reserved — applied once recipes carry a cuisine signal. */
  isNewCuisine?: boolean;
  /** Difficulty tier "1"|"2"|"3"; defaults to "1" (flat at launch). */
  difficultyTier?: string;
}

export interface AwardResult {
  xp: number;
  coins: number;
  reasons: string[];
  verified: boolean;
  leaderboardEligible: boolean;
  trustScore: number;
}

/** Daily soft-cap factor for the Nth cook of the day (1-based). */
export function softcapFactor(indexToday: number, sc: DailySoftcap): number {
  if (indexToday <= sc.fullCount) return 1;
  if (indexToday <= sc.reducedUntilCount) return sc.reducedFactor;
  return sc.tailFactor;
}

/** Highest matching streak-tier multiplier for a given streak length (in weeks/units). */
export function streakMultiplier(streakUnits: number, tiers: StreakTier[]): number {
  let mult = 1;
  for (const t of [...tiers].sort((a, b) => a.minDays - b.minDays)) {
    if (streakUnits >= t.minDays) mult = t.mult;
  }
  return mult;
}

/**
 * Level for a cumulative XP total. `thresholds[i]` is the XP needed for level
 * i+1 (thresholds[0] = 0 = level 1). Level is capped at thresholds.length.
 */
export function levelForXp(xp: number, thresholds: number[]): number {
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

/** Compute the XP/coins award for one cook. Pure — same inputs, same output. */
export function computeAward(config: GamificationConfig, ctx: AwardContext): AwardResult {
  if (!ctx.hasPhoto) {
    return {
      xp: 0,
      coins: 0,
      reasons: ['unverified_no_photo'],
      verified: false,
      leaderboardEligible: false,
      trustScore: 0,
    };
  }

  const reasons: string[] = [];
  const tier = ctx.difficultyTier ?? '1';
  const base = config.baseXp;
  const diff = config.difficultyMultipliers[tier] ?? 1;

  const repIdx = Math.min(Math.max(ctx.priorCookCount, 0), config.repetitionFactors.length - 1);
  const rep = config.repetitionFactors[repIdx] ?? 0;

  let xp = base * diff * rep;
  reasons.push(`base_${base}`, `difficulty_x${diff}`, `repetition_x${rep}`);

  // Novelty — flat bonuses added before the photo percentage.
  if (ctx.priorCookCount === 0) {
    xp += config.noveltyRecipeBonus;
    reasons.push(`novelty_recipe_+${config.noveltyRecipeBonus}`);
  }
  if (ctx.isNewCuisine) {
    xp += config.noveltyCuisineBonus;
    reasons.push(`novelty_cuisine_+${config.noveltyCuisineBonus}`);
  }

  // Daily soft-cap.
  const sc = softcapFactor(ctx.cookIndexToday, config.dailySoftcap);
  if (sc !== 1) reasons.push(`softcap_x${sc}`);
  xp *= sc;

  // Streak multiplier — rewards consistency, applied to the whole cook.
  const streak = ctx.streakWeeks ?? ctx.streakDays ?? 0;
  const sm = streakMultiplier(streak, config.streakTiers);
  if (sm !== 1) reasons.push(`streak_x${sm}`);
  xp *= sm;

  const finalXp = Math.round(xp);
  const coins = Math.floor(finalXp * config.coinsPerXp);

  return {
    xp: finalXp,
    coins,
    reasons,
    verified: true,
    leaderboardEligible: true,
    trustScore: 1.0,
  };
}

/** Returns YYYY-MM-DD string in UTC. */
export function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Adds days to a YYYY-MM-DD date string and returns the new YYYY-MM-DD in UTC. */
export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDateStr(d);
}

/** Returns Monday (YYYY-MM-DD) in UTC for a given ISO date string or Date. */
export function utcWeekStartStr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T00:00:00.000Z`) : new Date(d);
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diffToMonday);
  return utcDateStr(monday);
}
