import type { Profile, UserStats } from '../types.js';
import { getClient, wrapError, PG_UNIQUE_VIOLATION } from './client.js';
import type { ProfileRow, FriendshipRow, RawUserStatsRow } from './types.js';

export type { ProfileRow, FriendshipRow, RawUserStatsRow };


export function rowToProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    friendCode: row.friend_code,
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
  const { data, error } = await getClient()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw wrapError(`Failed to get profile for ${userId}`, error);
  return data ? rowToProfile(data as ProfileRow) : null;
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

    const { data, error } = await getClient()
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        avatar_url: seed.avatarUrl ?? null,
        friend_code: friendCode,
      })
      .select('*')
      .single();

    if (!error && data) return rowToProfile(data as ProfileRow);

    if (error && error.code === PG_UNIQUE_VIOLATION) {
      const now = await getProfile(userId);
      if (now) return now;
      continue;
    }
    if (error) throw wrapError('Failed to create profile', error);
  }
  throw new Error('Failed to allocate a unique friend code after several attempts');
}

export async function updateDisplayName(userId: string, name: string): Promise<Profile> {
  const { data, error } = await getClient()
    .from('profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw wrapError('Failed to update display name', error);
  if (!data) throw new Error('Profile not found: no profile row');
  return rowToProfile(data as ProfileRow);
}

export async function findProfileByFriendCode(code: string): Promise<Profile | null> {
  const { data, error } = await getClient()
    .from('profiles')
    .select('*')
    .eq('friend_code', code.toUpperCase())
    .maybeSingle();
  if (error) throw wrapError('Failed to look up friend code', error);
  return data ? rowToProfile(data as ProfileRow) : null;
}

export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (ids.length === 0) return map;
  const { data, error } = await getClient().from('profiles').select('*').in('user_id', ids);
  if (error) throw wrapError('Failed to batch-fetch profiles', error);
  for (const row of (data || []) as ProfileRow[]) map.set(row.user_id, rowToProfile(row));
  return map;
}



export async function getAcceptedFriends(
  userId: string
): Promise<{ friendId: string; friendshipId: string }[]> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw wrapError('Failed to fetch friends', error);
  return ((data || []) as Array<{ id: string; requester_id: string; addressee_id: string }>).map(
    (r) => ({
      friendshipId: r.id,
      friendId: r.requester_id === userId ? r.addressee_id : r.requester_id,
    })
  );
}

export async function getIncomingRequests(
  userId: string
): Promise<{ friendshipId: string; requesterId: string }[]> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', userId)
    .eq('status', 'pending');
  if (error) throw wrapError('Failed to fetch friend requests', error);
  return ((data || []) as Array<{ id: string; requester_id: string }>).map((r) => ({
    friendshipId: r.id,
    requesterId: r.requester_id,
  }));
}

export async function findFriendshipBetween(
  a: string,
  b: string
): Promise<FriendshipRow | null> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('*')
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`);
  if (error) throw wrapError('Failed to look up friendship', error);
  const rows = (data || []) as FriendshipRow[];
  if (rows.length === 0) return null;
  return rows.find((r) => r.status === 'accepted') ?? rows[0];
}

export async function getFriendshipById(id: string): Promise<FriendshipRow | null> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw wrapError('Failed to get friendship', error);
  return (data as FriendshipRow) ?? null;
}

export async function createFriendship(
  requesterId: string,
  addresseeId: string,
  status: 'pending' | 'accepted'
): Promise<FriendshipRow> {
  const { data, error } = await getClient()
    .from('friendships')
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status,
      responded_at: status === 'accepted' ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (error) throw wrapError('Failed to create friendship', error);
  return data as FriendshipRow;
}

export async function acceptFriendship(id: string): Promise<void> {
  const { error } = await getClient()
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw wrapError('Failed to accept friendship', error);
}

export async function deleteFriendship(id: string): Promise<void> {
  const { error } = await getClient().from('friendships').delete().eq('id', id);
  if (error) throw wrapError('Failed to delete friendship', error);
}



function parseUserStatsRow(row: RawUserStatsRow): UserStats {
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

export async function getUserStatsForIds(ids: string[]): Promise<Map<string, UserStats>> {
  const map = new Map<string, UserStats>();
  if (ids.length === 0) return map;
  const { data, error } = await getClient().from('user_stats').select('*').in('user_id', ids);
  if (error) throw wrapError('Failed to batch-fetch user_stats', error);
  for (const row of (data || []) as RawUserStatsRow[]) {
    map.set(row.user_id, parseUserStatsRow(row));
  }
  return map;
}

export async function getWeeklyXp(
  userIds: string[],
  sinceIso: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;
  const { data, error } = await getClient().rpc('weekly_xp_for_users', {
    uids: userIds,
    since: sinceIso,
  });
  if (error) throw wrapError('Failed to fetch weekly xp', error);
  for (const row of (data || []) as { user_id: string; xp: number }[]) {
    map.set(row.user_id, Number(row.xp));
  }
  return map;
}

export async function getAllFriendshipsForUser(userId: string): Promise<FriendshipRow[]> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw wrapError('Failed to fetch friendships for user', error);
  return (data || []) as FriendshipRow[];
}

export async function getGlobalAllTimeStats(limit = 50): Promise<UserStats[]> {
  const { data, error } = await getClient()
    .from('user_stats')
    .select('*')
    .order('xp', { ascending: false })
    .limit(limit);
  if (error) throw wrapError('Failed to fetch global all-time stats', error);
  return ((data || []) as RawUserStatsRow[]).map(parseUserStatsRow);
}

export async function getGlobalWeeklyXp(
  sinceIso: string,
  limit = 50
): Promise<{ userId: string; xp: number }[]> {
  const { data, error } = await getClient().rpc('global_weekly_xp', {
    since: sinceIso,
    limit_count: limit,
  });
  if (error) throw wrapError('Failed to fetch global weekly xp', error);
  return ((data || []) as Array<{ user_id: string; xp: number }>).map((row) => ({
    userId: row.user_id,
    xp: Number(row.xp),
  }));
}
