import { Router, Request, Response } from 'express';
import {
  getFriendsCookFeed,
  toggleCookEventReaction,
  shareRecipeWithFriendsDb,
  getReceivedRecipeShares,
  markRecipeSharesSeen,
  dismissRecipeShare,
  canAccessFriendRecipe,
  getAcceptedFriends,
  getRecipe,
  addToLibrary,
  isInLibrary,
  getSavedRecipe,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { recipeShares } from '../db/schema/social.js';
import { and, eq } from 'drizzle-orm';
import { AppError, sendAppError } from '../errors.js';
import { notifyRecipeShared } from '../push/socialNotifications.js';
import type { FeedReactionEmoji } from '@cookbook/shared';

export const socialFeedRoutes = Router();

const VALID_REACTION_EMOJIS = new Set<string>(['🔥', '❤️', '😋']);

// 1. Friends Cook Feed
socialFeedRoutes.get('/friends/feed', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 50);
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;
    const items = await getFriendsCookFeed(req.userId!, limit, before);
    res.status(200).json({ success: true, items });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching friends feed:', error);
    sendAppError(res, error);
  }
});

// 2. React to Cook Event
socialFeedRoutes.post('/friends/feed/:cookEventId/react', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cookEventId } = req.params;
    const { emoji } = req.body ?? {};

    if (!emoji || !VALID_REACTION_EMOJIS.has(emoji)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'emoji' } });
    }

    const reactions = await toggleCookEventReaction(
      req.userId!,
      cookEventId,
      emoji as FeedReactionEmoji,
    );
    res.status(200).json({ success: true, reactions });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error reacting to feed event:', error);
    sendAppError(res, error);
  }
});

// 3. Share Recipe with Friends
socialFeedRoutes.post('/recipes/:id/share', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { friendUserIds, message } = req.body ?? {};

    if (!Array.isArray(friendUserIds) || friendUserIds.length === 0) {
      throw new AppError('INVALID_FIELD', { params: { field: 'friendUserIds' } });
    }

    const recipe = await getRecipe(id);
    if (!recipe) throw new AppError('RECIPE_NOT_FOUND');

    const canShare = await canAccessFriendRecipe(req.userId!, id);
    if (!canShare) throw new AppError('UNAUTHORIZED');

    const acceptedFriends = await getAcceptedFriends(req.userId!);
    const friendIdSet = new Set(acceptedFriends.map((f) => f.friendId));
    const validTargets = friendUserIds.filter((fid) => typeof fid === 'string' && friendIdSet.has(fid));

    if (validTargets.length === 0) {
      throw new AppError('FRIENDSHIP_NOT_FOUND', { message: 'None of the target users are accepted friends' });
    }

    await shareRecipeWithFriendsDb(req.userId!, validTargets, id, message);
    void notifyRecipeShared(
      req.userId!,
      validTargets,
      { id, title: recipe.title, imageUrl: recipe.imageUrl },
      message,
    );

    res.status(200).json({ success: true, sharedCount: validTargets.length });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error sharing recipe:', error);
    sendAppError(res, error);
  }
});

// 4. Received Recipe Shares
socialFeedRoutes.get('/friends/shares', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await getReceivedRecipeShares(req.userId!);
    res.status(200).json({ success: true, ...data });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching received shares:', error);
    sendAppError(res, error);
  }
});

// 5. Mark Shares Seen
socialFeedRoutes.post('/friends/shares/mark-seen', async (req: Request, res: Response): Promise<void> => {
  try {
    await markRecipeSharesSeen(req.userId!);
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error marking shares seen:', error);
    sendAppError(res, error);
  }
});

// 6. Dismiss Share
socialFeedRoutes.delete('/friends/shares/:shareId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareId } = req.params;
    await dismissRecipeShare(req.userId!, shareId);
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error dismissing share:', error);
    sendAppError(res, error);
  }
});

// 7. Save Friend's Shared / Feed Recipe to Library
socialFeedRoutes.post('/friends/recipes/:recipeId/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;

    const allowed = await canAccessFriendRecipe(req.userId!, recipeId);
    if (!allowed) throw new AppError('UNAUTHORIZED');

    const alreadyInLib = await isInLibrary(req.userId!, recipeId);
    if (!alreadyInLib) {
      await addToLibrary(req.userId!, recipeId, 'share');
    }

    // Mark corresponding share as saved if one exists
    await db
      .update(recipeShares)
      .set({ status: 'saved', respondedAt: new Date() })
      .where(and(eq(recipeShares.recipientId, req.userId!), eq(recipeShares.recipeId, recipeId)))
      .catch(() => {});

    const saved = await getSavedRecipe(req.userId!, recipeId);
    res.status(200).json({ success: true, savedRecipe: saved, recipeId });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error saving friend recipe:', error);
    sendAppError(res, error);
  }
});
