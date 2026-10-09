import type { Profile, UserStats } from '../types.js';
import { db, getDbPool } from './drizzle.js';
import { profiles, friendships } from './schema/social.js';
import { userStats } from './schema/gamification.js';
import { eq, or, and, inArray, desc } from 'drizzle-orm';
import type { ProfileRow, FriendshipRow, RawUserStatsRow } from './types.js';

export type { ProfileRow, FriendshipRow, RawUserStatsRow };

export function rowToProfile(row: any): Profile {
  return {
    userId: row.userId ?? row.user_id,
    displayName: row.displayName ?? row.display_name,
    avatarUrl: row.avatarUrl ?? row.avatar_url,
    friendCode: row.friendCode ?? row.friend_code,
  };
}

const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateFriendCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += FRIEND_CODE_ALPHABET[Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length)];
  }
  return out;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return row ? rowToProfile(row) : null;
}

export async function ensureProfile(
  userId: string,
  seed: { displayName?: string | null; avatarUrl?: string | null }
): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 6; attempt++) {
    const friendCode = generateFriendCode(6);
    const displayName = (seed.displayName || '').trim().slice(0, 40) || `Chef #${friendCode}`;

    try {
      const [inserted] = await db
        .insert(profiles)
        .values({
          userId,
          displayName,
          avatarUrl: seed.avatarUrl ?? null,
          friendCode,
        })
        .returning();

      return rowToProfile(inserted);
    } catch (err: any) {
      if (err?.code === '23505') {
        const now = await getProfile(userId);
        if (now) return now;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to allocate a unique friend code after several attempts');
}

export async function updateDisplayName(userId: string, name: string): Promise<Profile> {
  const [row] = await db
    .update(profiles)
    .set({ displayName: name, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .returning();

  if (!row) throw new Error(`Profile not found for user ${userId}`);
  return rowToProfile(row);
}

export async function findProfileByFriendCode(code: string): Promise<Profile | null> {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.friendCode, code.toUpperCase()))
    .limit(1);

  return row ? rowToProfile(row) : null;
}

export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (ids.length === 0) return map;

  const rows = await db
    .select()
    .from(profiles)
    .where(inArray(profiles.userId, ids));

  for (const row of rows) {
    map.set(row.userId, rowToProfile(row));
  }
  return map;
}

export async function getAcceptedFriends(
  userId: string
): Promise<{ friendId: string; friendshipId: string }[]> {
  const rows = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(and(
      eq(friendships.status, 'accepted'),
      or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
    ));

  return rows.map((r) => ({
    friendshipId: r.id,
    friendId: r.requesterId === userId ? r.addresseeId : r.requesterId,
  }));
}

export async function getIncomingRequests(
  userId: string
): Promise<{ friendshipId: string; requesterId: string }[]> {
  const rows = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
    })
    .from(friendships)
    .where(and(
      eq(friendships.addresseeId, userId),
      eq(friendships.status, 'pending')
    ));

  return rows.map((r) => ({
    friendshipId: r.id,
    requesterId: r.requesterId,
  }));
}

export async function findFriendshipBetween(
  a: string,
  b: string
): Promise<FriendshipRow | null> {
  const rows = await db
    .select()
    .from(friendships)
    .where(or(
      and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
      and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a))
    ));

  if (rows.length === 0) return null;
  const accepted = rows.find((r) => r.status === 'accepted');
  const target = accepted ?? rows[0];

  return {
    id: target.id,
    requester_id: target.requesterId,
    addressee_id: target.addresseeId,
    status: target.status as 'pending' | 'accepted',
    created_at: target.createdAt instanceof Date ? target.createdAt.toISOString() : String(target.createdAt),
    responded_at: target.respondedAt ? (target.respondedAt instanceof Date ? target.respondedAt.toISOString() : String(target.respondedAt)) : null,
  };
}

export async function getFriendshipById(id: string): Promise<FriendshipRow | null> {
  const [row] = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, id))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    requester_id: row.requesterId,
    addressee_id: row.addresseeId,
    status: row.status as 'pending' | 'accepted',
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    responded_at: row.respondedAt ? (row.respondedAt instanceof Date ? row.respondedAt.toISOString() : String(row.respondedAt)) : null,
  };
}

export async function createFriendship(
  requesterId: string,
  addresseeId: string,
  status: 'pending' | 'accepted'
): Promise<FriendshipRow> {
  const [row] = await db
    .insert(friendships)
    .values({
      requesterId,
      addresseeId,
      status,
      respondedAt: status === 'accepted' ? new Date() : null,
    })
    .returning();

  return {
    id: row.id,
    requester_id: row.requesterId,
    addressee_id: row.addresseeId,
    status: row.status as 'pending' | 'accepted',
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    responded_at: row.respondedAt ? (row.respondedAt instanceof Date ? row.respondedAt.toISOString() : String(row.respondedAt)) : null,
  };
}

export async function acceptFriendship(id: string): Promise<void> {
  await db
    .update(friendships)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(eq(friendships.id, id));
}

export async function deleteFriendship(id: string): Promise<void> {
  await db
    .delete(friendships)
    .where(eq(friendships.id, id));
}

function parseUserStats(row: any): UserStats {
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

export async function getUserStatsForIds(ids: string[]): Promise<Map<string, UserStats>> {
  const map = new Map<string, UserStats>();
  if (ids.length === 0) return map;

  const rows = await db
    .select()
    .from(userStats)
    .where(inArray(userStats.userId, ids));

  for (const row of rows) {
    map.set(row.userId, parseUserStats(row));
  }
  return map;
}

export async function getWeeklyXp(
  userIds: string[],
  sinceIso: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;

  const { rows } = await getDbPool().query(
    'SELECT * FROM weekly_xp_for_users($1::uuid[], $2::timestamptz)',
    [userIds, sinceIso]
  );

  for (const row of rows as Array<{ user_id: string; xp: number }>) {
    map.set(row.user_id, Number(row.xp));
  }
  return map;
}

export async function getAllFriendshipsForUser(userId: string): Promise<FriendshipRow[]> {
  const rows = await db
    .select()
    .from(friendships)
    .where(or(
      eq(friendships.requesterId, userId),
      eq(friendships.addresseeId, userId)
    ));

  return rows.map((r) => ({
    id: r.id,
    requester_id: r.requesterId,
    addressee_id: r.addresseeId,
    status: r.status as 'pending' | 'accepted',
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    responded_at: r.respondedAt ? (r.respondedAt instanceof Date ? r.respondedAt.toISOString() : String(r.respondedAt)) : null,
  }));
}

export async function getGlobalAllTimeStats(limit = 50): Promise<UserStats[]> {
  const rows = await db
    .select()
    .from(userStats)
    .orderBy(desc(userStats.xp))
    .limit(limit);

  return rows.map(parseUserStats);
}

export async function getGlobalWeeklyXp(
  sinceIso: string,
  limit = 50
): Promise<{ userId: string; xp: number }[]> {
  const { rows } = await getDbPool().query(
    'SELECT * FROM global_weekly_xp($1::timestamptz, $2::integer)',
    [sinceIso, limit]
  );

  return (rows as Array<{ user_id: string; xp: number }>).map((row) => ({
    userId: row.user_id,
    xp: Number(row.xp),
  }));
}
