import { db } from './drizzle.js';
import { userBadges, cookEvents } from './schema/gamification.js';
import { eq, and, asc } from 'drizzle-orm';

export async function getUserBadges(userId: string): Promise<string[]> {
  const rows = await db
    .select({ badgeKey: userBadges.badgeKey })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  return rows.map((r) => r.badgeKey);
}

export async function getUserBadgesDetailed(
  userId: string
): Promise<{ key: string; earnedAt: string }[]> {
  const rows = await db
    .select({ badgeKey: userBadges.badgeKey, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))
    .orderBy(asc(userBadges.earnedAt));

  return rows.map((r) => ({
    key: r.badgeKey,
    earnedAt: r.earnedAt instanceof Date ? r.earnedAt.toISOString() : String(r.earnedAt),
  }));
}

export async function awardBadges(userId: string, badgeKeys: string[]): Promise<void> {
  if (badgeKeys.length === 0) return;
  const values = badgeKeys.map((k) => ({ userId, badgeKey: k }));
  await db
    .insert(userBadges)
    .values(values)
    .onConflictDoNothing({ target: [userBadges.userId, userBadges.badgeKey] });
}

export async function getDistinctCookedRecipeCount(userId: string): Promise<number> {
  const rows = await db
    .select({ recipeId: cookEvents.recipeId })
    .from(cookEvents)
    .where(eq(cookEvents.userId, userId));

  const set = new Set(rows.map((r) => r.recipeId).filter(Boolean));
  return set.size;
}

export async function getTimerCookCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: cookEvents.id })
    .from(cookEvents)
    .where(and(eq(cookEvents.userId, userId), eq(cookEvents.timerElapsed, true)));

  return rows.length;
}

export async function getWeekendCookCount(userId: string): Promise<number> {
  const rows = await db
    .select({ cookedAt: cookEvents.cookedAt })
    .from(cookEvents)
    .where(eq(cookEvents.userId, userId));

  return rows.filter((r) => {
    const d = r.cookedAt instanceof Date ? r.cookedAt : new Date(String(r.cookedAt));
    const day = d.getUTCDay();
    return day === 0 || day === 6;
  }).length;
}

export async function getMaxCooksForSameRecipe(userId: string): Promise<number> {
  const rows = await db
    .select({ recipeId: cookEvents.recipeId })
    .from(cookEvents)
    .where(eq(cookEvents.userId, userId));

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.recipeId) {
      counts.set(r.recipeId, (counts.get(r.recipeId) ?? 0) + 1);
    }
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}
