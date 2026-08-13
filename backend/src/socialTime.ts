/**
 * Pure time helpers for leaderboard windows. Kept separate so they can be
 * unit-tested without any DB/env coupling.
 */

/**
 * 1st day of the month 00:00:00 UTC containing `now`, as an ISO string. Used as the
 * lower bound for summing `point_ledger` XP into the monthly leaderboard.
 */
export function monthStartUtc(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return d.toISOString();
}

/**
 * Monday 00:00:00 UTC of the week containing `now`, as an ISO string.
 */
export function weekStartUtc(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString();
}
