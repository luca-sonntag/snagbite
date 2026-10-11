import { randomUUID } from 'node:crypto';
import type {
  GamificationConfig,
  UserStats,
} from '../types.js';
import { DEFAULT_GAMIFICATION_CONFIG } from '../types.js';
import { db } from './drizzle.js';
import { cookEvents, pointLedger, userStats } from './schema/gamification.js';
import { globalSettings } from './schema/system.js';
import { recipes } from './schema/recipes.js';
import { eq, and, desc, gte, count, isNotNull, ne } from 'drizzle-orm';
import {
  ensureBucketExists,
  uploadFile,
  getSignedUrl,
  getPublicUrl,
} from '../storage/s3Client.js';
import type {
  UserStatsRow,
  InsertCookEventArgs,
  CookPhotoItem,
  CookHistoryItem,
  CookHistory,
  LedgerRow,
} from './types.js';

export type {
  UserStatsRow,
  InsertCookEventArgs,
  CookPhotoItem,
  CookHistoryItem,
  CookHistory,
  LedgerRow,
};

export {
  getUserBadges,
  getUserBadgesDetailed,
  awardBadges,
  getDistinctCookedRecipeCount,
  getTimerCookCount,
  getWeekendCookCount,
  getMaxCooksForSameRecipe,
} from './badgesDb.js';

async function resolveCookPhotoUrl(photoPath: string | null | undefined): Promise<string | null> {
  if (!photoPath) return null;
  if (photoPath.startsWith('http') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  try {
    return await getSignedUrl('cook-photos', photoPath, 7 * 24 * 3600);
  } catch {
    return getPublicUrl('cook-photos', photoPath);
  }
}

function rowToUserStats(row: any): UserStats {
  return {
    userId: row.userId ?? row.user_id,
    xp: Number(row.xp),
    level: row.level,
    coins: Number(row.coins),
    currentStreak: row.currentStreak ?? row.current_streak,
    longestStreak: row.longestStreak ?? row.longest_streak,
    lastCookDate: row.lastCookDate ?? row.last_cook_date,
    totalCooks: row.totalCooks ?? row.total_cooks,
  };
}

export function emptyUserStats(userId: string): UserStats {
  return {
    userId,
    xp: 0,
    level: 1,
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCookDate: null,
    totalCooks: 0,
  };
}

let gamificationConfigCache: { value: GamificationConfig; timestamp: number } | null = null;

export async function getGamificationConfig(): Promise<GamificationConfig> {
  const now = Date.now();
  if (gamificationConfigCache && now - gamificationConfigCache.timestamp < 60000) {
    return gamificationConfigCache.value;
  }

  try {
    const [row] = await db
      .select({ value: globalSettings.value })
      .from(globalSettings)
      .where(eq(globalSettings.key, 'gamification_config'))
      .limit(1);

    if (row?.value) {
      const parsed = {
        ...DEFAULT_GAMIFICATION_CONFIG,
        ...JSON.parse(String(row.value)),
      } as GamificationConfig;
      gamificationConfigCache = { value: parsed, timestamp: now };
      return parsed;
    }
  } catch (err) {
    console.warn('Error reading gamification_config, using defaults:', err);
  }

  return DEFAULT_GAMIFICATION_CONFIG;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const [row] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  return row ? rowToUserStats(row) : emptyUserStats(userId);
}

export async function getCookCountForRecipe(
  userId: string,
  recipeId: string,
  windowDays?: number
): Promise<number> {
  const conditions = [eq(cookEvents.userId, userId), eq(cookEvents.recipeId, recipeId)];

  if (windowDays && windowDays > 0) {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    conditions.push(gte(cookEvents.cookedAt, since));
  }

  const [row] = await db
    .select({ count: count() })
    .from(cookEvents)
    .where(and(...conditions));

  return Number(row?.count ?? 0);
}

export async function getCookCountSince(userId: string, sinceIso: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(cookEvents)
    .where(and(eq(cookEvents.userId, userId), gte(cookEvents.cookedAt, new Date(sinceIso))));

  return Number(row?.count ?? 0);
}

export async function getLastCookEvent(
  userId: string
): Promise<{ recipeId: string | null; cookedAt: string } | null> {
  const [row] = await db
    .select({ recipeId: cookEvents.recipeId, cookedAt: cookEvents.cookedAt })
    .from(cookEvents)
    .where(eq(cookEvents.userId, userId))
    .orderBy(desc(cookEvents.cookedAt))
    .limit(1);

  if (!row) return null;
  return {
    recipeId: row.recipeId,
    cookedAt: row.cookedAt instanceof Date ? row.cookedAt.toISOString() : String(row.cookedAt),
  };
}

export async function insertCookEvent(args: InsertCookEventArgs): Promise<string> {
  const [row] = await db
    .insert(cookEvents)
    .values({
      userId: args.userId,
      recipeId: args.recipeId,
      xpAwarded: args.xp,
      coinsAwarded: args.coins,
      hasPhoto: args.hasPhoto,
      photoPath: args.photoPath,
      verified: args.verified,
      leaderboardEligible: args.leaderboardEligible,
      trustScore: args.trustScore !== undefined && args.trustScore !== null ? String(args.trustScore) : '0',
      viaCookingMode: args.viaCookingMode,
      timerElapsed: args.timerElapsed,
    })
    .returning({ id: cookEvents.id });

  return row.id;
}

export async function getCookHistoryForRecipe(
  userId: string,
  recipeId: string,
  limit = 20
): Promise<CookHistory> {
  const [countRes] = await db
    .select({ count: count() })
    .from(cookEvents)
    .where(and(eq(cookEvents.userId, userId), eq(cookEvents.recipeId, recipeId)));

  const total = Number(countRes?.count ?? 0);
  if (total === 0) {
    return { count: 0, firstCookedAt: null, lastCookedAt: null, items: [] };
  }

  const rows = await db
    .select()
    .from(cookEvents)
    .where(and(eq(cookEvents.userId, userId), eq(cookEvents.recipeId, recipeId)))
    .orderBy(desc(cookEvents.cookedAt))
    .limit(limit);

  const items = await Promise.all(
    rows.map(async (row): Promise<CookHistoryItem> => {
      const photoUrl = await resolveCookPhotoUrl(row.photoPath);
      return {
        id: row.id,
        cookedAt: row.cookedAt instanceof Date ? row.cookedAt.toISOString() : String(row.cookedAt),
        xpAwarded: row.xpAwarded,
        coinsAwarded: row.coinsAwarded,
        hasPhoto: row.hasPhoto,
        photoUrl,
        verified: row.verified,
        viaCookingMode: row.viaCookingMode,
        timerElapsed: row.timerElapsed,
      };
    })
  );

  return {
    count: total,
    firstCookedAt: items[items.length - 1]?.cookedAt ?? null,
    lastCookedAt: items[0]?.cookedAt ?? null,
    items,
  };
}

export async function getRecentCookPhotos(
  userId: string,
  limit = 10
): Promise<CookPhotoItem[]> {
  const rows = await db
    .select({
      id: cookEvents.id,
      recipeId: cookEvents.recipeId,
      photoPath: cookEvents.photoPath,
      cookedAt: cookEvents.cookedAt,
      recipeTitle: recipes.title,
    })
    .from(cookEvents)
    .leftJoin(recipes, eq(cookEvents.recipeId, recipes.id))
    .where(and(
      eq(cookEvents.userId, userId),
      isNotNull(cookEvents.photoPath),
      ne(cookEvents.photoPath, '')
    ))
    .orderBy(desc(cookEvents.cookedAt))
    .limit(limit);

  return Promise.all(
    rows.map(async (row) => {
      const photoUrl = await resolveCookPhotoUrl(row.photoPath);
      return {
        id: row.id,
        jobId: row.recipeId || '',
        recipeId: row.recipeId,
        photoUrl: photoUrl || '',
        cookedAt: row.cookedAt instanceof Date ? row.cookedAt.toISOString() : String(row.cookedAt),
        recipeTitle: row.recipeTitle || 'Gekochtes Gericht',
      };
    })
  );
}

export async function insertLedgerRows(
  userId: string,
  cookEventId: string,
  rows: LedgerRow[]
): Promise<void> {
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    id: randomUUID(),
    userId,
    cookEventId,
    deltaXp: r.deltaXp,
    deltaCoins: r.deltaCoins,
    reason: r.reason,
  }));
  await db.insert(pointLedger).values(payload);
}

export async function upsertUserStats(stats: UserStats): Promise<void> {
  await db
    .insert(userStats)
    .values({
      userId: stats.userId,
      xp: stats.xp,
      level: stats.level,
      coins: stats.coins,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastCookDate: stats.lastCookDate,
      totalCooks: stats.totalCooks,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        xp: stats.xp,
        level: stats.level,
        coins: stats.coins,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        lastCookDate: stats.lastCookDate,
        totalCooks: stats.totalCooks,
        updatedAt: new Date(),
      },
    });
}

export async function uploadCookPhoto(
  userId: string,
  cookId: string,
  base64: string
): Promise<string> {
  const clean = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(clean, 'base64');
  const storagePath = `${userId}/${cookId}.jpg`;
  await ensureBucketExists('cook-photos');
  await uploadFile('cook-photos', storagePath, buffer, 'image/jpeg');
  return storagePath;
}
