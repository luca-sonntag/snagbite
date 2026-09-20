import { Router, Request, Response } from 'express';
import {
  getClient,
  getExtractionsForUserInTimeframe,
  deletePushTokensForUser,
  upsertPushToken,
  deletePushToken,
  createFeedback,
  isAlphaActive,
  getRewardedAdBonusCredits,
} from '../db.js';
import { config } from '../config.js';
import { AppError, sendAppError } from '../errors.js';
import { fetchAndSyncUser, resolveUserRateLimit } from './authUtils.js';

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

    const { error } = await getClient().auth.admin.updateUserById(userId, {
      app_metadata: {
        ...currentMeta,
        bonus_credits: newCredits,
      },
    });

    if (error) {
      console.error(`Failed to grant bonus credit for user ${userId}:`, error.message);
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

    const secretKey = config.REVENUECAT_SECRET_KEY;
    if (!secretKey) {
      console.warn(
        'REVENUECAT_SECRET_KEY is not configured in backend. Trusting client tier update (fallback mode).'
      );
      const clientTier = req.body.tier;
      if (clientTier === 'premium' || clientTier === 'free') {
        const alphaActive = await isAlphaActive();
        const finalTier = clientTier === 'free' && alphaActive ? 'alpha' : clientTier;
        const { error } = await getClient().auth.admin.updateUserById(userId, {
          app_metadata: { tier: finalTier },
        });
        if (error) throw error;
        res.status(200).json({ success: true, tier: finalTier, fallback: true });
        return;
      }
      const alphaActive = await isAlphaActive();
      res.status(200).json({ success: true, tier: alphaActive ? 'alpha' : 'free', fallback: true });
      return;
    }

    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RevenueCat API error:', errorText);
      throw new AppError('REVENUECAT_FAILED', { message: 'Failed to fetch status from RevenueCat.' });
    }

    const rcData = (await response.json()) as {
      subscriber?: {
        entitlements?: Record<string, { expires_date?: string | null }>;
      };
    };
    const entitlements = rcData.subscriber?.entitlements || {};
    const premiumEntitlement = entitlements.premium;

    let isPremium = false;
    if (premiumEntitlement) {
      const expiresDate = premiumEntitlement.expires_date;
      if (!expiresDate) {
        isPremium = true;
      } else {
        isPremium = new Date(expiresDate).getTime() > Date.now();
      }
    }

    const alphaActive = await isAlphaActive();
    const newTier = isPremium ? 'premium' : alphaActive ? 'alpha' : 'free';

    const { error } = await getClient().auth.admin.updateUserById(userId, {
      app_metadata: { tier: newTier },
    });

    if (error) {
      console.error('Failed to update Supabase user tier:', error.message);
      throw new AppError('PROFILE_UPDATE_FAILED', { message: 'Failed to update user profile.' });
    }

    res.status(200).json({ success: true, tier: newTier });
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

    await deletePushTokensForUser(userId).catch((err) =>
      console.warn('Failed to delete push tokens on account deletion:', err?.message ?? err)
    );

    const { error } = await getClient().auth.admin.deleteUser(userId);
    if (error) {
      console.error('Supabase admin deleteUser error:', error);
      throw new AppError('ACCOUNT_DELETE_FAILED', {
        message: `Failed to delete user account: ${error.message}`,
      });
    }

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

    res.status(201).json({ success: true, id });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating feedback:', error);
    sendAppError(res, error);
  }
});
