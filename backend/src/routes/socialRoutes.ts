import { Router, Request, Response } from 'express';
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
} from '../db.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import { AppError, sendAppError } from '../errors.js';
import { leaderboardRoutes } from './leaderboardRoutes.js';
import type { Profile, FriendSummary, FriendRequest } from '../types.js';

export const socialRoutes = Router();
socialRoutes.use(leaderboardRoutes);

const MAX_DISPLAY_NAME_LEN = 40;

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

