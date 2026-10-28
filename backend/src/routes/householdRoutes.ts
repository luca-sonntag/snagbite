import { Router, Request, Response } from 'express';
import {
  getHouseholdContext,
  createOrGetHouseholdInvite,
  acceptHouseholdInvite,
  unlinkHousehold,
  recordHouseholdNudge,
  getRecipe,
  getProfilesByIds,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import {
  notifyHouseholdLinked,
  notifyPartnerNudge,
  notifyCookProposal,
} from '../push/householdNotifications.js';

export const householdRoutes = Router();

householdRoutes.get('/household', async (req: Request, res: Response): Promise<void> => {
  try {
    const context = await getHouseholdContext(req.userId!);
    res.status(200).json({ success: true, ...context });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching household context:', error);
    sendAppError(res, error);
  }
});

householdRoutes.post('/household/invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const invite = await createOrGetHouseholdInvite(req.userId!);
    res.status(200).json({ success: true, ...invite });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating household invite:', error);
    sendAppError(res, error);
  }
});

householdRoutes.post('/household/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    const friendUserId = typeof req.body?.friendUserId === 'string' ? req.body.friendUserId : '';
    const identifier = code.trim() || friendUserId.trim();

    if (!identifier) {
      throw new AppError('MISSING_FIELD', { params: { field: 'code' } });
    }

    const context = await acceptHouseholdInvite(req.userId!, identifier);

    // Send instant push notification to the partner
    if (context.partnerId) {
      void (async () => {
        try {
          const profiles = await getProfilesByIds([req.userId!]);
          const myName = profiles.get(req.userId!)?.displayName || 'Dein Partner';
          await notifyHouseholdLinked(context.partnerId!, myName);
        } catch (err) {
          console.warn('[householdRoutes] Failed to send household_linked push:', err);
        }
      })();
    }

    res.status(200).json({ success: true, ...context });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error accepting household invite:', error);
    sendAppError(res, error);
  }
});

householdRoutes.post('/household/propose-recipe', async (req: Request, res: Response): Promise<void> => {
  try {
    const recipeId = typeof req.body?.recipeId === 'string' ? req.body.recipeId.trim() : '';
    if (!recipeId) {
      throw new AppError('MISSING_FIELD', { params: { field: 'recipeId' } });
    }

    const context = await getHouseholdContext(req.userId!);
    if (!context.partnerId || !context.hasHouseholdPro || context.isPauseLocked) {
      throw new AppError('HOUSEHOLD_NOT_FOUND');
    }

    const recipe = await getRecipe(recipeId);
    if (!recipe) {
      throw new AppError('RECIPE_NOT_FOUND');
    }

    const profiles = await getProfilesByIds([req.userId!]);
    const myName = profiles.get(req.userId!)?.displayName || 'Dein Partner';

    const sent = await notifyCookProposal(context.partnerId, myName, {
      id: recipe.id || recipeId,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
    });

    res.status(200).json({ success: true, sent });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error proposing recipe to partner:', error);
    sendAppError(res, error);
  }
});

householdRoutes.post('/household/nudge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId } = await recordHouseholdNudge(req.userId!);
    const profiles = await getProfilesByIds([req.userId!]);
    const myName = profiles.get(req.userId!)?.displayName || 'Dein Partner';

    await notifyPartnerNudge(partnerId, myName);
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error nudging household partner:', error);
    sendAppError(res, error);
  }
});

householdRoutes.delete('/household', async (req: Request, res: Response): Promise<void> => {
  try {
    await unlinkHousehold(req.userId!);
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error unlinking household:', error);
    sendAppError(res, error);
  }
});
