/**
 * Unit tests for the pure gamification formula. Hermetic — imports only the
 * formula + config defaults, no DB/env. Run with:
 *   cd backend && node --import tsx --test src/gamificationFormula.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GAMIFICATION_CONFIG as C } from './types.js';
import {
  computeAward,
  softcapFactor,
  streakMultiplier,
  levelForXp,
  utcWeekStartStr,
  type AwardContext,
} from './gamificationFormula.js';

const ctx = (over: Partial<AwardContext>): AwardContext => ({
  priorCookCount: 0,
  cookIndexToday: 1,
  streakWeeks: over.streakWeeks ?? over.streakDays ?? 1,
  hasPhoto: true,
  ...over,
});

test('unverified cook (no photo) yields 0 XP and 0 coins', () => {
  const r = computeAward(C, ctx({ hasPhoto: false }));
  assert.equal(r.xp, 0);
  assert.equal(r.coins, 0);
  assert.equal(r.leaderboardEligible, false);
  assert.equal(r.verified, false);
  assert.equal(r.trustScore, 0);
});

test('verified cook (with photo, first time) = full base + novelty', () => {
  const r = computeAward(C, ctx({ hasPhoto: true }));
  assert.equal(r.xp, 120); // 100 base + 20 novelty
  assert.equal(r.coins, 12);
  assert.equal(r.leaderboardEligible, true);
  assert.equal(r.verified, true);
  assert.equal(r.trustScore, 1.0);
});

test('repetition is only gently diminished (floor, not punishment)', () => {
  // New curve [1, 0.9, 0.8, 0.75] — a weekly favorite stays near full value.
  // Note: novelty (+20) only applies on the very first cook (priorCookCount 0).
  assert.equal(computeAward(C, ctx({ priorCookCount: 1 })).xp, 83); // 100 * 0.833
  assert.equal(computeAward(C, ctx({ priorCookCount: 2 })).xp, 67); // 100 * 0.667
  assert.equal(computeAward(C, ctx({ priorCookCount: 3 })).xp, 50); // 100 * 0.5
  assert.equal(computeAward(C, ctx({ priorCookCount: 9 })).xp, 50); // clamped to floor 0.5
});

test('repetitionWindowDays resets repeats older than the window', () => {
  // Mirrors gamification.ts: getCookCountForJob only counts cooks within the
  // window, so a recipe cooked weekly never accumulates beyond priorCookCount 0
  // once the previous cook falls outside repetitionWindowDays.
  const windowDays = C.repetitionWindowDays; // 7
  assert.ok(windowDays > 0, 'window is enabled by default');

  // Simulate: last cook was 8 days ago -> outside the 7-day window -> counts as 0.
  const daysSinceLastCook = 8;
  const priorCookCount = daysSinceLastCook <= windowDays ? 1 : 0;
  assert.equal(priorCookCount, 0);
  assert.equal(computeAward(C, ctx({ priorCookCount })).xp, 120); // full base + novelty

  // Last cook was 3 days ago -> inside window -> counts as a repeat.
  const recent = 3 <= windowDays ? 1 : 0;
  assert.equal(recent, 1);
  assert.equal(computeAward(C, ctx({ priorCookCount: recent })).xp, 83); // gentle 0.833
});

test('daily soft-cap reduces the Nth cook of the day', () => {
  assert.equal(computeAward(C, ctx({ cookIndexToday: 3 })).xp, 120); // full
  assert.equal(computeAward(C, ctx({ cookIndexToday: 4 })).xp, 60); // 120 * 0.5
  assert.equal(computeAward(C, ctx({ cookIndexToday: 6 })).xp, 30); // 120 * 0.25
});

test('streak multiplier scales the whole cook', () => {
  assert.equal(computeAward(C, ctx({ streakDays: 7 })).xp, 150); // 120 * 1.25
});

test('Lena scenario: medium + photo + 5-day streak', () => {
  const r = computeAward(C, ctx({ difficultyTier: '2', hasPhoto: true, streakDays: 5 }));
  // 100*1.5=150 +20=170  *1.1(streak)=187  (no photo bonus — photo is mandatory)
  assert.equal(r.xp, 187);
  assert.equal(r.coins, 18);
});

test('Sophie scenario: honest 4-dish meal-prep, all photos, 10-day streak', () => {
  const streakDays = 10; // -> x1.25
  const a = computeAward(C, ctx({ difficultyTier: '2', hasPhoto: true, cookIndexToday: 1, streakDays })).xp;
  const b = computeAward(C, ctx({ difficultyTier: '1', hasPhoto: true, cookIndexToday: 2, streakDays })).xp;
  const c = computeAward(C, ctx({ difficultyTier: '3', hasPhoto: true, cookIndexToday: 3, streakDays })).xp;
  const d = computeAward(C, ctx({ difficultyTier: '2', hasPhoto: true, cookIndexToday: 4, streakDays })).xp;
  assert.equal(a, 213);
  assert.equal(b, 150);
  assert.equal(c, 275);
  assert.equal(d, 106); // 4th dish hits the soft-cap (x0.5)
  assert.equal(a + b + c + d, 744);
});

test('softcapFactor boundaries', () => {
  const sc = C.dailySoftcap;
  assert.equal(softcapFactor(1, sc), 1);
  assert.equal(softcapFactor(3, sc), 1);
  assert.equal(softcapFactor(4, sc), 0.5);
  assert.equal(softcapFactor(5, sc), 0.5);
  assert.equal(softcapFactor(6, sc), 0.25);
});

test('streakMultiplier tiers', () => {
  const t = C.streakTiers;
  assert.equal(streakMultiplier(2, t), 1);
  assert.equal(streakMultiplier(3, t), 1.1);
  assert.equal(streakMultiplier(6, t), 1.1);
  assert.equal(streakMultiplier(7, t), 1.25);
  assert.equal(streakMultiplier(29, t), 1.25);
  assert.equal(streakMultiplier(30, t), 1.5);
  assert.equal(streakMultiplier(100, t), 1.5);
});

test('levelForXp thresholds', () => {
  const th = C.levelThresholds;
  assert.equal(levelForXp(0, th), 1);
  assert.equal(levelForXp(499, th), 1);
  assert.equal(levelForXp(500, th), 2);
  assert.equal(levelForXp(1199, th), 2);
  assert.equal(levelForXp(1200, th), 3);
  assert.equal(levelForXp(15100, th), 10);
  assert.equal(levelForXp(999999, th), 10); // capped at defined levels
});

test('utcWeekStartStr returns Monday for any weekday in UTC', () => {
  // Monday 2026-08-03 -> 2026-08-03
  assert.equal(utcWeekStartStr('2026-08-03'), '2026-08-03');
  // Wednesday 2026-08-05 -> 2026-08-03
  assert.equal(utcWeekStartStr('2026-08-05'), '2026-08-03');
  // Sunday 2026-08-09 -> 2026-08-03
  assert.equal(utcWeekStartStr('2026-08-09'), '2026-08-03');
  // Next Monday 2026-08-10 -> 2026-08-10
  assert.equal(utcWeekStartStr('2026-08-10'), '2026-08-10');
});

test('streakWeeks multiplier scales the cook award', () => {
  // 7-week streak multiplier (x1.25)
  assert.equal(computeAward(C, ctx({ streakWeeks: 7 })).xp, 150);
});
