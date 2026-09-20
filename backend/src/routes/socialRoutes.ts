import { Router, Request, Response } from 'express';
import type { User } from '@supabase/supabase-js';
import {
  getUserStats,
  getUserBadgesDetailed,
  getGamificationConfig,
  getRecentCookPhotos,
  getDistinctCookedRecipeCount,
  ensureProfile,
  updateDisplayName,
  findProfileByFriendCode,
  getProfilesByIds,
  getAcceptedFriends,
  getIncomingRequests,
  findFriendshipBetween,
  getFriendshipById,
  createFriendship,
  acceptFriendship,
  deleteFriendship,
  getUserStatsForIds,
  getWeeklyXp,
  getAllFriendshipsForUser,
  getGlobalAllTimeStats,
  getGlobalWeeklyXp,
  getClient,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import { monthStartUtc } from '../socialTime.js';
import type { Profile, FriendSummary, FriendRequest, LeaderboardEntry, LeaderboardScope } from '../types.js';

export const socialRoutes = Router();

const MAX_DISPLAY_NAME_LEN = 40;

function profileSeedFromUser(user: User | { user_metadata?: Record<string, unknown> }): {
  displayName: string | null;
  avatarUrl: string | null;
} {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : null;
  const avatarUrl =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : null;
  return { displayName, avatarUrl };
}

async function ensureMyProfile(userId: string): Promise<Profile> {
  let seed: { displayName: string | null; avatarUrl: string | null } = { displayName: null, avatarUrl: null };
  try {
    const { data } = await getClient().auth.admin.getUserById(userId);
    if (data?.user) seed = profileSeedFromUser(data.user);
  } catch {
    // Fall back to empty seed
  }
  return ensureProfile(userId, seed);
}

socialRoutes.get('/me/gamification', async (req: Request, res: Response): Promise<void> => {
  try {
    const [stats, badges, gamConfig, recentPhotos, distinctRecipes] = await Promise.all([
      getUserStats(req.userId!),
      getUserBadgesDetailed(req.userId!),
      getGamificationConfig(),
      getRecentCookPhotos(req.userId!),
      getDistinctCookedRecipeCount(req.userId!),
    ]);
    res.status(200).json({
      success: true,
      stats: {
        ...stats,
        distinctRecipes,
      },
      badges,
      levelThresholds: gamConfig.levelThresholds,
      recentPhotos,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching gamification state:', error);
    sendAppError(res, error);
  }
});

socialRoutes.get('/me/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await ensureMyProfile(req.userId!);
    res.status(200).json({ success: true, profile });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching profile:', error);
    sendAppError(res, error);
  }
});

socialRoutes.patch('/me/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    if (raw.length < 1 || raw.length > MAX_DISPLAY_NAME_LEN) {
      throw new AppError('PROFILE_NAME_INVALID', { params: { max: MAX_DISPLAY_NAME_LEN } });
    }
    await ensureMyProfile(req.userId!);
    const profile = await updateDisplayName(req.userId!, raw);
    res.status(200).json({ success: true, profile });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating profile:', error);
    sendAppError(res, error);
  }
});

socialRoutes.get('/friends', async (req: Request, res: Response): Promise<void> => {
  try {
    const friends = await getAcceptedFriends(req.userId!);
    const ids = friends.map((f) => f.friendId);
    const [profiles, stats] = await Promise.all([getProfilesByIds(ids), getUserStatsForIds(ids)]);

    const list: FriendSummary[] = friends
      .map((f): FriendSummary | null => {
        const profile = profiles.get(f.friendId);
        if (!profile) return null;
        const s = stats.get(f.friendId);
        return {
          friendshipId: f.friendshipId,
          userId: f.friendId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          level: s?.level ?? 1,
          xp: s?.xp ?? 0,
          currentStreak: s?.currentStreak ?? 0,
          totalCooks: s?.totalCooks ?? 0,
        };
      })
      .filter((x): x is FriendSummary => x !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    res.status(200).json({ success: true, friends: list });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching friends:', error);
    sendAppError(res, error);
  }
});

socialRoutes.get('/friends/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const incoming = await getIncomingRequests(req.userId!);
    const ids = incoming.map((r) => r.requesterId);
    const profiles = await getProfilesByIds(ids);

    const list: FriendRequest[] = incoming
      .map((r) => {
        const profile = profiles.get(r.requesterId);
        if (!profile) return null;
        return {
          friendshipId: r.friendshipId,
          userId: r.requesterId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        } satisfies FriendRequest;
      })
      .filter((x): x is FriendRequest => x !== null);

    res.status(200).json({ success: true, requests: list });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching friend requests:', error);
    sendAppError(res, error);
  }
});

socialRoutes.post('/friends/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const targetUserId = typeof req.body?.targetUserId === 'string' ? req.body.targetUserId.trim() : '';
    if (!code && !targetUserId) throw new AppError('FRIEND_CODE_INVALID');

    await ensureMyProfile(req.userId!);

    let target: Profile | null = null;
    if (targetUserId) {
      const profiles = await getProfilesByIds([targetUserId]);
      target = profiles.get(targetUserId) ?? null;
    } else {
      target = await findProfileByFriendCode(code);
    }

    if (!target) throw new AppError('FRIEND_CODE_INVALID');
    if (target.userId === req.userId!) throw new AppError('FRIEND_SELF');

    const existing = await findFriendshipBetween(req.userId!, target.userId);
    if (existing?.status === 'accepted') throw new AppError('ALREADY_FRIENDS');
    if (existing?.status === 'pending') {
      if (existing.addressee_id === req.userId!) {
        await acceptFriendship(existing.id);
        res.status(200).json({ success: true, status: 'accepted' });
        return;
      }
      throw new AppError('REQUEST_EXISTS');
    }

    await createFriendship(req.userId!, target.userId, 'pending');
    res.status(200).json({ success: true, status: 'pending' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error sending friend request:', error);
    sendAppError(res, error);
  }
});

socialRoutes.post('/friends/:id/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const accept = req.body?.accept === true;

    const friendship = await getFriendshipById(id);
    if (!friendship || friendship.addressee_id !== req.userId! || friendship.status !== 'pending') {
      throw new AppError('FRIENDSHIP_NOT_FOUND');
    }

    if (accept) await acceptFriendship(id);
    else await deleteFriendship(id);

    res.status(200).json({ success: true, status: accept ? 'accepted' : 'declined' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error responding to friend request:', error);
    sendAppError(res, error);
  }
});

socialRoutes.delete('/friends/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const friendship = await getFriendshipById(id);
    if (
      !friendship ||
      (friendship.requester_id !== req.userId! && friendship.addressee_id !== req.userId!)
    ) {
      throw new AppError('FRIENDSHIP_NOT_FOUND');
    }
    await deleteFriendship(id);
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error removing friend:', error);
    sendAppError(res, error);
  }
});

socialRoutes.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
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
