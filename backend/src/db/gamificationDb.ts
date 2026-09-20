import { randomUUID } from 'node:crypto';
import type {
  GamificationConfig,
  UserStats,
} from '../types.js';
import { DEFAULT_GAMIFICATION_CONFIG } from '../types.js';
import { getClient, wrapError } from './client.js';
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


function rowToUserStats(row: UserStatsRow): UserStats {
  return {
    userId: row.user_id,
    xp: Number(row.xp),
    level: row.level,
    coins: Number(row.coins),
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastCookDate: row.last_cook_date,
    totalCooks: row.total_cooks,
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
    const { data, error } = await getClient()
      .from('global_settings')
      .select('value')
      .eq('key', 'gamification_config')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = {
        ...DEFAULT_GAMIFICATION_CONFIG,
        ...JSON.parse(String(data.value)),
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
  const { data, error } = await getClient()
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw wrapError(`Failed to get user_stats for ${userId}`, error);
  return data ? rowToUserStats(data as UserStatsRow) : emptyUserStats(userId);
}

export async function getCookCountForRecipe(
  userId: string,
  recipeId: string,
  windowDays?: number
): Promise<number> {
  let query = getClient()
    .from('cook_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('recipe_id', recipeId);

  if (windowDays && windowDays > 0) {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('cooked_at', since);
  }

  const { count, error } = await query;
  if (error) throw wrapError('Failed to count cook events for recipe', error);
  return count ?? 0;
}

export async function getCookCountSince(userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await getClient()
    .from('cook_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('cooked_at', sinceIso);

  if (error) throw wrapError('Failed to count recent cook events', error);
  return count ?? 0;
}

export async function getLastCookEvent(
  userId: string
): Promise<{ recipeId: string | null; cookedAt: string } | null> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('recipe_id, cooked_at')
    .eq('user_id', userId)
    .order('cooked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw wrapError('Failed to fetch last cook event', error);
  if (!data) return null;
  const row = data as { recipe_id: string | null; cooked_at: string };
  return { recipeId: row.recipe_id, cookedAt: row.cooked_at };
}



export async function insertCookEvent(args: InsertCookEventArgs): Promise<string> {
  const { data, error } = await getClient()
    .from('cook_events')
    .insert({
      user_id: args.userId,
      recipe_id: args.recipeId,
      xp_awarded: args.xp,
      coins_awarded: args.coins,
      has_photo: args.hasPhoto,
      photo_path: args.photoPath,
      verified: args.verified,
      leaderboard_eligible: args.leaderboardEligible,
      trust_score: args.trustScore,
      via_cooking_mode: args.viaCookingMode,
      timer_elapsed: args.timerElapsed,
    })
    .select('id')
    .single();

  if (error) throw wrapError('Failed to insert cook event', error);
  return (data as { id: string }).id;
}



export async function getCookHistoryForRecipe(
  userId: string,
  recipeId: string,
  limit = 20
): Promise<CookHistory> {
  const { data, error, count } = await getClient()
    .from('cook_events')
    .select(
      'id, cooked_at, xp_awarded, coins_awarded, has_photo, photo_path, verified, via_cooking_mode, timer_elapsed',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .order('cooked_at', { ascending: false })
    .limit(limit);

  if (error) throw wrapError('Failed to fetch cook history for recipe', error);
  if (!data || data.length === 0) {
    return { count: 0, firstCookedAt: null, lastCookedAt: null, items: [] };
  }

  const items = await Promise.all(
    (
      data as Array<{
        id: string;
        cooked_at: string;
        xp_awarded?: number;
        coins_awarded?: number;
        has_photo: boolean;
        photo_path?: string | null;
        verified?: boolean;
        via_cooking_mode: boolean;
        timer_elapsed: boolean;
      }>
    ).map(async (row): Promise<CookHistoryItem> => {
      let photoUrl: string | null = null;
      const photoPath = row.photo_path;
      if (photoPath && !photoPath.startsWith('http') && !photoPath.startsWith('data:')) {
        try {
          const { data: signedData } = await getClient()
            .storage.from('cook-photos')
            .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
          photoUrl =
            signedData?.signedUrl ??
            getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
        } catch {
          photoUrl = getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
        }
      } else if (photoPath) {
        photoUrl = photoPath;
      }
      return {
        id: row.id,
        cookedAt: row.cooked_at,
        xpAwarded: row.xp_awarded ?? 0,
        coinsAwarded: row.coins_awarded ?? 0,
        hasPhoto: row.has_photo,
        photoUrl,
        verified: row.verified ?? false,
        viaCookingMode: row.via_cooking_mode,
        timerElapsed: row.timer_elapsed,
      };
    })
  );

  return {
    count: count ?? data.length,
    firstCookedAt: items[items.length - 1]?.cookedAt ?? null,
    lastCookedAt: items[0]?.cookedAt ?? null,
    items,
  };
}

export async function getRecentCookPhotos(
  userId: string,
  limit = 10
): Promise<CookPhotoItem[]> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('id, recipe_id, photo_path, cooked_at, recipes(title)')
    .eq('user_id', userId)
    .not('photo_path', 'is', null)
    .neq('photo_path', '')
    .order('cooked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentCookPhotos] Query error:', error);
    return [];
  }
  if (!data || data.length === 0) return [];

  const rows = data as unknown as Array<{
    id: string;
    recipe_id: string | null;
    photo_path: string;
    cooked_at: string;
    recipes?: { title?: string } | null;
  }>;

  return Promise.all(
    rows.map(async (row) => {
      const photoPath = row.photo_path;
      let photoUrl = photoPath;
      if (photoPath && !photoPath.startsWith('http') && !photoPath.startsWith('data:')) {
        try {
          const { data: signedData } = await getClient()
            .storage.from('cook-photos')
            .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
          if (signedData?.signedUrl) {
            photoUrl = signedData.signedUrl;
          } else {
            photoUrl = getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
          }
        } catch {
          photoUrl = getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
        }
      }
      return {
        id: row.id,
        jobId: row.recipe_id || '',
        recipeId: row.recipe_id,
        photoUrl,
        cookedAt: row.cooked_at,
        recipeTitle: row.recipes?.title || 'Gekochtes Gericht',
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
    user_id: userId,
    cook_event_id: cookEventId,
    delta_xp: r.deltaXp,
    delta_coins: r.deltaCoins,
    reason: r.reason,
  }));
  const { error } = await getClient().from('point_ledger').insert(payload);
  if (error) throw wrapError('Failed to insert ledger rows', error);
}

export async function upsertUserStats(stats: UserStats): Promise<void> {
  const { error } = await getClient().from('user_stats').upsert({
    user_id: stats.userId,
    xp: stats.xp,
    level: stats.level,
    coins: stats.coins,
    current_streak: stats.currentStreak,
    longest_streak: stats.longestStreak,
    last_cook_date: stats.lastCookDate,
    total_cooks: stats.totalCooks,
    updated_at: new Date().toISOString(),
  });
  if (error) throw wrapError('Failed to upsert user_stats', error);
}

export async function getUserBadges(userId: string): Promise<string[]> {
  const { data, error } = await getClient()
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to fetch user badges', error);
  return (data || []).map((r: { badge_key: string }) => r.badge_key);
}

export async function getUserBadgesDetailed(
  userId: string
): Promise<{ key: string; earnedAt: string }[]> {
  const { data, error } = await getClient()
    .from('user_badges')
    .select('badge_key, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: true });
  if (error) throw wrapError('Failed to fetch detailed user badges', error);
  return (data || []).map((r: { badge_key: string; earned_at: string }) => ({
    key: r.badge_key,
    earnedAt: r.earned_at,
  }));
}

export async function awardBadges(userId: string, badgeKeys: string[]): Promise<void> {
  if (badgeKeys.length === 0) return;
  const rows = badgeKeys.map((k) => ({ user_id: userId, badge_key: k }));
  const { error } = await getClient()
    .from('user_badges')
    .upsert(rows, { onConflict: 'user_id,badge_key', ignoreDuplicates: true });
  if (error) throw wrapError('Failed to award badges', error);
}

export async function getDistinctCookedRecipeCount(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('recipe_id')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to count distinct cooked recipes', error);
  const set = new Set((data || []).map((r: { recipe_id?: string | null }) => r.recipe_id).filter(Boolean));
  return set.size;
}

export async function getTimerCookCount(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('id')
    .eq('user_id', userId)
    .eq('timer_elapsed', true);
  if (error) throw wrapError('Failed to count timer cooks', error);
  return (data || []).length;
}

export async function getWeekendCookCount(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('cooked_at')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to count weekend cooks', error);
  return (data || []).filter((r: { cooked_at: string }) => {
    const day = new Date(r.cooked_at).getUTCDay();
    return day === 0 || day === 6;
  }).length;
}

export async function getMaxCooksForSameRecipe(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('recipe_id')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to count same-recipe cooks', error);
  const counts = new Map<string, number>();
  for (const r of (data || []) as Array<{ recipe_id?: string | null }>) {
    if (r.recipe_id) counts.set(r.recipe_id, (counts.get(r.recipe_id) ?? 0) + 1);
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}

export async function uploadCookPhoto(
  userId: string,
  cookId: string,
  base64: string
): Promise<string> {
  const clean = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(clean, 'base64');
  const storagePath = `${userId}/${cookId}.jpg`;
  const { error } = await getClient()
    .storage.from('cook-photos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw wrapError('Failed to upload cook photo', error as unknown as import('@supabase/supabase-js').PostgrestError);
  return storagePath;
}
