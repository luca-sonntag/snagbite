import { Router, Request, Response } from 'express';
import {
  getProfilesByIds,
  getAcceptedFriends,
  getUserStatsForIds,
  getWeeklyXp,
  getAllFriendshipsForUser,
  getGlobalAllTimeStats,
  getGlobalWeeklyXp,
  ensureProfile,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import { AppError, sendAppError } from '../errors.js';
import { monthStartUtc } from '../socialTime.js';
import type { Profile, LeaderboardEntry, LeaderboardScope } from '../types.js';

export const leaderboardRoutes = Router();

async function ensureMyProfile(userId: string): Promise<Profile> {
  let seed: { displayName: string | null; avatarUrl: string | null } = { displayName: null, avatarUrl: null };
  try {
    const [u] = await db
      .select({ name: userTable.name, image: userTable.image })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    if (u) {
      seed = { displayName: u.name || null, avatarUrl: u.image || null };
    }
  } catch {
    // Fall back to empty seed
  }
  return ensureProfile(userId, seed);
}

leaderboardRoutes.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const window = req.query.window === 'all' ? 'all' : 'monthly';
    const scope = (req.query.scope === 'global' ? 'global' : 'friends') as LeaderboardScope;
    await ensureMyProfile(req.userId!);

    const allFriendships = await getAllFriendshipsForUser(req.userId!);
    const friendshipByPartnerId = new Map<
      string,
      { status: 'pending' | 'accepted'; id: string; isSender: boolean }
    >();
    for (const f of allFriendships) {
      const isSender = f.requester_id === req.userId!;
      const partnerId = isSender ? f.addressee_id : f.requester_id;
      friendshipByPartnerId.set(partnerId, { status: f.status, id: f.id, isSender });
    }

    const getFriendshipStatus = (
      uid: string
    ): {
      status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';
      id?: string;
    } => {
      if (uid === req.userId!) return { status: 'self' };
      const rel = friendshipByPartnerId.get(uid);
      if (!rel) return { status: 'none' };
      if (rel.status === 'accepted') return { status: 'friends', id: rel.id };
      return { status: rel.isSender ? 'pending_sent' : 'pending_received', id: rel.id };
    };

    let rawEntries: { userId: string; value: number; level?: number }[] = [];

    if (scope === 'global') {
      if (window === 'monthly') {
        const topMonthly = await getGlobalWeeklyXp(monthStartUtc(new Date()), 50);
        const uids = topMonthly.map((x) => x.userId);
        const [stats] = await Promise.all([getUserStatsForIds(uids)]);
        rawEntries = topMonthly.map((item) => ({
          userId: item.userId,
          value: item.xp,
          level: stats.get(item.userId)?.level ?? 1,
        }));
      } else {
        const topAllTime = await getGlobalAllTimeStats(50);
        rawEntries = topAllTime.map((s) => ({
          userId: s.userId,
          value: s.xp,
          level: s.level,
        }));
      }
    } else {
      const friends = await getAcceptedFriends(req.userId!);
      const ids = [req.userId!, ...friends.map((f) => f.friendId)];

      const [stats, monthly] = await Promise.all([
        getUserStatsForIds(ids),
        window === 'monthly' ? getWeeklyXp(ids, monthStartUtc(new Date())) : Promise.resolve(null),
      ]);

      rawEntries = ids.map((uid) => ({
        userId: uid,
        value: window === 'monthly' ? monthly?.get(uid) ?? 0 : stats.get(uid)?.xp ?? 0,
        level: stats.get(uid)?.level ?? 1,
      }));
    }

    const allEntryIds = rawEntries.map((e) => e.userId);
    const profilesMap = await getProfilesByIds(allEntryIds);

    const entries: LeaderboardEntry[] = rawEntries
      .map((r): LeaderboardEntry | null => {
        const profile = profilesMap.get(r.userId);
        if (!profile) return null;
        const rel = getFriendshipStatus(r.userId);
        return {
          rank: 0,
          userId: r.userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          level: r.level ?? 1,
          value: r.value,
          isMe: r.userId === req.userId!,
          friendshipStatus: rel.status,
          friendshipId: rel.id,
        };
      })
      .filter((x): x is LeaderboardEntry => x !== null)
      .sort((a, b) => b.value - a.value || a.displayName.localeCompare(b.displayName));

    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    res.status(200).json({ success: true, window, scope, entries });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error building leaderboard:', error);
    sendAppError(res, error);
  }
});
