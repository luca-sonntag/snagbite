import { Router, Request, Response } from 'express';
import {
  getExtractionsForUserInTimeframe,
  deletePushTokensForUser,
  upsertPushToken,
  deletePushToken,
  createFeedback,
  getRewardedAdBonusCredits,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { AppError, sendAppError } from '../errors.js';
import { fetchAndSyncUser, resolveUserRateLimit } from './authUtils.js';
import { syncUserBilling } from '../services/billingService.js';
import { emitAlert } from '../alerts/index.js';

export const userRoutes = Router();

userRoutes.post('/me/rewarded-ad-claimed', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await fetchAndSyncUser(userId);
    const currentMeta = (user?.app_metadata || {}) as Record<string, unknown>;

    const bonusPerAd = await getRewardedAdBonusCredits();
    const currentCredits =
      typeof currentMeta.bonus_credits === 'number' ? currentMeta.bonus_credits : 0;
    const newCredits = currentCredits + bonusPerAd;

    try {
      await db
        .update(userTable)
        .set({ bonusCredits: newCredits, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to grant bonus credit for user ${userId}:`, msg);
      throw new AppError('INTERNAL_ERROR', { message: 'Failed to update bonus credits' });
    }

    const limit = await resolveUserRateLimit(user);
    const windowDays = config.EXTRACTION_LIMIT_WINDOW_DAYS;
    const extractions = await getExtractionsForUserInTimeframe(userId, windowDays);
    const used = extractions.length;
    const baseRemaining = Math.max(0, limit - used);
    const remaining = limit < 0 ? -1 : baseRemaining + newCredits;

    console.log(
      `[RewardedAd] Granted +${bonusPerAd} extraction credit(s) to user ${userId}. Total bonus_credits=${newCredits}, remaining=${remaining}`
    );

    res.status(200).json({
      success: true,
      addedCredits: bonusPerAd,
      bonusCredits: newCredits,
      limit,
      used,
      remaining,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error handling rewarded ad claim:', error);
    sendAppError(res, error);
  }
});

userRoutes.post('/billing/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED');
    }

    const result = await syncUserBilling(userId, req.userEmail, req.body.tier);
    res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error syncing billing status:', error);
    sendAppError(res, error);
  }
});

userRoutes.delete('/users/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', { message: 'Unauthorized. Missing user ID.' });
    }

    const [u] = await db
      .select({ createdAt: userTable.createdAt, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    await deletePushTokensForUser(userId).catch((err) =>
      console.warn('Failed to delete push tokens on account deletion:', err?.message ?? err)
    );

    try {
      await db
        .delete(userTable)
        .where(eq(userTable.id, userId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('deleteUser error:', msg);
      throw new AppError('ACCOUNT_DELETE_FAILED', {
        message: `Failed to delete user account: ${msg}`,
      });
    }

    const accountAgeDays = u?.createdAt
      ? Math.max(0, Math.floor((Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    emitAlert({
      type: 'user.deleted',
      payload: {
        accountAgeDays,
        email: u?.email ?? null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error deleting user account:', error);
    sendAppError(res, error);
  }
});

userRoutes.post('/push/tokens', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, platform } = req.body;
    if (typeof token !== 'string' || token.trim().length < 10) {
      throw new AppError('INVALID_FIELD', { params: { field: 'token' } });
    }
    const plat = typeof platform === 'string' && platform ? platform : 'android';
    await upsertPushToken(req.userId!, token.trim(), plat);
    res.status(200).json({ success: true, message: 'Push token registered.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error registering push token:', error);
    sendAppError(res, error);
  }
});

userRoutes.delete('/push/tokens', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (typeof token !== 'string' || !token.trim()) {
      throw new AppError('INVALID_FIELD', { params: { field: 'token' } });
    }
    await deletePushToken(req.userId!, token.trim());
    res.status(200).json({ success: true, message: 'Push token removed.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error removing push token:', error);
    sendAppError(res, error);
  }
});

userRoutes.post('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, type, context, screenshots } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('MISSING_FIELD', { params: { field: 'message' } });
    }
    if (message.length > 4000) {
      throw new AppError('MESSAGE_TOO_LONG', { params: { max: 4000 } });
    }

    const feedbackType: 'bug' | 'idea' = type === 'idea' ? 'idea' : 'bug';

    if (context !== undefined && (typeof context !== 'object' || context === null)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'context' } });
    }

    let screenshotsBase64: string[] | undefined;
    if (screenshots !== undefined) {
      if (!Array.isArray(screenshots) || !screenshots.every((s) => typeof s === 'string')) {
        throw new AppError('INVALID_FIELD', { params: { field: 'screenshots' } });
      }
      if (screenshots.length > 6) {
        throw new AppError('TOO_MANY_SCREENSHOTS', { params: { max: 6 } });
      }
      const totalLength = screenshots.reduce((sum: number, s: string) => sum + s.length, 0);
      if (totalLength > 1_500_000) {
        throw new AppError('SCREENSHOTS_TOO_LARGE');
      }
      screenshotsBase64 = screenshots.length > 0 ? screenshots : undefined;
    }

    const { id } = await createFeedback(req.userId!, {
      type: feedbackType,
      message: message.trim(),
      context,
      screenshotsBase64,
    });

    emitAlert({
      type: 'feedback.created',
      payload: {
        feedbackType,
        message: message.trim(),
        screenshotCount: screenshotsBase64?.length ?? 0,
      },
    });

    res.status(201).json({ success: true, id });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating feedback:', error);
    sendAppError(res, error);
  }
});
