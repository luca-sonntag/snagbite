/**
 * Pure time helper for the weekly leaderboard window. Kept separate so it can be
 * unit-tested without any DB/env coupling.
 */

/**
 * Monday 00:00:00 UTC of the week containing `now`, as an ISO string. Used as the
 * lower bound for summing `point_ledger` XP into the weekly leaderboard.
 */
export function weekStartUtc(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString();
}
