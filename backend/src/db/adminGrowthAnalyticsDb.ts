import { db } from './drizzle.js';
import {
  user as userTable,
  session as sessionTable,
  jobs,
  userRecipes,
  cookEvents,
  shoppingList,
  mealPlans,
  pushTokens,
  notificationLog,
} from './schema/index.js';
import { gte } from 'drizzle-orm';

export interface TierDistributionMetrics {
  totalUsers: number;
  freeCount: number;
  premiumCount: number;
  alphaCount: number;
  freePct: number;
  premiumPct: number;
  alphaPct: number;
  usersWithBonusCredits: number;
  totalBonusCredits: number;
  customLimitUsers: number;
}

export interface ActiveUserMetrics {
  dau: number;
  wau: number;
  mau: number;
  stickinessPct: number;
}

export interface CohortRetentionRow {
  cohortWeekStart: string;
  cohortLabel: string;
  size: number;
  d1Pct: number | null;
  d7Pct: number | null;
  d14Pct: number | null;
  d30Pct: number | null;
}

export interface NotificationAnalyticsMetrics {
  totalUsers: number;
  notificationsEnabledUsers: number;
  activePushUsers: number;
  optInRatePct: number;
  activeTokens: number;
  disabledTokens: number;
  deliveredInRange: number;
  byCategory: { category: string; count: number }[];
}

export interface GrowthAndRetentionAnalytics {
  tiers: TierDistributionMetrics;
  activeUsers: ActiveUserMetrics;
  cohorts: CohortRetentionRow[];
  notifications: NotificationAnalyticsMetrics;
}

function getMondayUtc(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy;
}

function formatCohortLabel(monday: Date): string {
  const day = String(monday.getUTCDate()).padStart(2, '0');
  const month = String(monday.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.`;
}

export async function getGrowthAndRetentionAnalytics(
  since: Date | null = null,
): Promise<GrowthAndRetentionAnalytics> {
  const now = new Date();
  const cutoff1d = new Date(now.getTime() - 24 * 3600 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const cutoff30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const cutoff90d = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

  const [
    users,
    sessions,
    jobRows,
    recipeRows,
    cookRows,
    shoppingRows,
    planRows,
    tokenRows,
    notifRows,
  ] = await Promise.all([
    db
      .select({
        id: userTable.id,
        createdAt: userTable.createdAt,
        tier: userTable.tier,
        bonusCredits: userTable.bonusCredits,
        customExtractionLimit: userTable.customExtractionLimit,
        notificationsEnabled: userTable.notificationsEnabled,
      })
      .from(userTable),
    db
      .select({ userId: sessionTable.userId, ts: sessionTable.updatedAt })
      .from(sessionTable)
      .where(gte(sessionTable.updatedAt, cutoff90d)),
    db
      .select({ userId: jobs.userId, ts: jobs.createdAt })
      .from(jobs)
      .where(gte(jobs.createdAt, cutoff90d)),
    db
      .select({ userId: userRecipes.userId, ts: userRecipes.addedAt })
      .from(userRecipes)
      .where(gte(userRecipes.addedAt, cutoff90d)),
    db
      .select({ userId: cookEvents.userId, ts: cookEvents.cookedAt })
      .from(cookEvents)
      .where(gte(cookEvents.cookedAt, cutoff90d)),
    db
      .select({ userId: shoppingList.userId, ts: shoppingList.updatedAt })
      .from(shoppingList)
      .where(gte(shoppingList.updatedAt, cutoff90d)),
    db
      .select({ userId: mealPlans.userId, ts: mealPlans.createdAt })
      .from(mealPlans)
      .where(gte(mealPlans.createdAt, cutoff90d)),
    db
      .select({
        userId: pushTokens.userId,
        disabled: pushTokens.disabled,
      })
      .from(pushTokens),
    db
      .select({
        category: notificationLog.category,
        sentAt: notificationLog.sentAt,
      })
      .from(notificationLog)
      .where(since ? gte(notificationLog.sentAt, since) : undefined),
  ]);

  // 1. Tier distribution & Bonus Credits
  const totalUsers = users.length;
  let freeCount = 0;
  let premiumCount = 0;
  let alphaCount = 0;
  let usersWithBonusCredits = 0;
  let totalBonusCredits = 0;
  let customLimitUsers = 0;
  let notificationsEnabledUsers = 0;

  for (const u of users) {
    const tier = (u.tier || 'free').toLowerCase();
    if (tier === 'premium') premiumCount++;
    else if (tier === 'alpha') alphaCount++;
    else freeCount++;

    const credits = Number(u.bonusCredits ?? 0) || 0;
    if (credits > 0) {
      usersWithBonusCredits++;
      totalBonusCredits += credits;
    }
    if (u.customExtractionLimit !== null && u.customExtractionLimit !== undefined) {
      customLimitUsers++;
    }
    if (u.notificationsEnabled) {
      notificationsEnabledUsers++;
    }
  }

  const pct = (part: number, total: number): number =>
    total > 0 ? parseFloat(((part / total) * 100).toFixed(1)) : 0;

  // 2. Collect activity timestamps per user
  const userTimestamps = new Map<string, number[]>();
  const addActivity = (userId: string | null | undefined, ts: Date | null | undefined) => {
    if (!userId || !ts) return;
    const ms = ts.getTime();
    if (Number.isNaN(ms)) return;
    let list = userTimestamps.get(userId);
    if (!list) {
      list = [];
      userTimestamps.set(userId, list);
    }
    list.push(ms);
  };

  for (const r of sessions) addActivity(r.userId, r.ts);
  for (const r of jobRows) addActivity(r.userId, r.ts);
  for (const r of recipeRows) addActivity(r.userId, r.ts);
  for (const r of cookRows) addActivity(r.userId, r.ts);
  for (const r of shoppingRows) addActivity(r.userId, r.ts);
  for (const r of planRows) addActivity(r.userId, r.ts);

  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();
  const c1dMs = cutoff1d.getTime();
  const c7dMs = cutoff7d.getTime();
  const c30dMs = cutoff30d.getTime();

  for (const [uid, timestamps] of userTimestamps.entries()) {
    for (const ms of timestamps) {
      if (ms >= c1dMs) dauSet.add(uid);
      if (ms >= c7dMs) wauSet.add(uid);
      if (ms >= c30dMs) mauSet.add(uid);
    }
  }

  const dau = dauSet.size;
  const wau = wauSet.size;
  const mau = mauSet.size;
  const stickinessPct = mau > 0 ? parseFloat(((dau / mau) * 100).toFixed(1)) : 0;

  // 3. 8-Week Cohort Retention Matrix
  const currentMonday = getMondayUtc(now);
  const cohorts: CohortRetentionRow[] = [];
  const DAY_MS = 24 * 3600 * 1000;
  const nowMs = now.getTime();

  for (let w = 0; w < 8; w++) {
    const weekStart = new Date(currentMonday.getTime() - w * 7 * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    const wsMs = weekStart.getTime();
    const weMs = weekEnd.getTime();

    const cohortUsers = users.filter((u) => {
      if (!u.createdAt) return false;
      const ms = u.createdAt.getTime();
      return ms >= wsMs && ms < weMs;
    });

    const size = cohortUsers.length;
    const calcBucketPct = (daysThreshold: number): number | null => {
      if (size === 0) return null;
      // Only evaluate users whose registration is at least `daysThreshold` days in the past
      const eligible = cohortUsers.filter(
        (u) => nowMs - u.createdAt.getTime() >= daysThreshold * DAY_MS,
      );
      if (eligible.length === 0) return null;

      let retained = 0;
      for (const u of eligible) {
        const regMs = u.createdAt.getTime();
        const targetMs = regMs + daysThreshold * DAY_MS;
        const events = userTimestamps.get(u.id) || [];
        if (events.some((evMs) => evMs >= targetMs)) {
          retained++;
        }
      }
      return parseFloat(((retained / eligible.length) * 100).toFixed(1));
    };

    cohorts.push({
      cohortWeekStart: weekStart.toISOString().split('T')[0],
      cohortLabel: formatCohortLabel(weekStart),
      size,
      d1Pct: calcBucketPct(1),
      d7Pct: calcBucketPct(7),
      d14Pct: calcBucketPct(14),
      d30Pct: calcBucketPct(30),
    });
  }

  // 4. Push Notifications Opt-in & Delivery
  let activeTokens = 0;
  let disabledTokens = 0;
  const usersWithActiveToken = new Set<string>();
  for (const t of tokenRows) {
    if (t.disabled) {
      disabledTokens++;
    } else {
      activeTokens++;
      if (t.userId) usersWithActiveToken.add(t.userId);
    }
  }

  const enabledUserIds = new Set(
    users.filter((u) => u.notificationsEnabled).map((u) => u.id),
  );
  let activePushUsers = 0;
  for (const uid of usersWithActiveToken) {
    if (enabledUserIds.has(uid)) activePushUsers++;
  }

  const catCounts: Record<string, number> = {};
  for (const n of notifRows) {
    const cat = n.category || 'general';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const byCategory = Object.entries(catCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    tiers: {
      totalUsers,
      freeCount,
      premiumCount,
      alphaCount,
      freePct: pct(freeCount, totalUsers),
      premiumPct: pct(premiumCount, totalUsers),
      alphaPct: pct(alphaCount, totalUsers),
      usersWithBonusCredits,
      totalBonusCredits,
      customLimitUsers,
    },
    activeUsers: {
      dau,
      wau,
      mau,
      stickinessPct,
    },
    cohorts,
    notifications: {
      totalUsers,
      notificationsEnabledUsers,
      activePushUsers,
      optInRatePct: pct(activePushUsers, totalUsers),
      activeTokens,
      disabledTokens,
      deliveredInRange: notifRows.length,
      byCategory,
    },
  };
}
