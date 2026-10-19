import { Router, Request, Response } from 'express';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { eq, sql } from 'drizzle-orm';
import { AppError, sendAppError } from '../errors.js';

export const userMetadataRoutes = Router();

userMetadataRoutes.get('/users/me/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', { message: 'Unauthorized. Missing user ID.' });
    }

    const [row] = await db
      .select({
        metadata: userTable.metadata,
        notificationsEnabled: userTable.notificationsEnabled,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    res.status(200).json({
      success: true,
      metadata: row?.metadata ?? {},
      notificationsEnabled: row?.notificationsEnabled ?? false,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching user metadata:', error);
    sendAppError(res, error);
  }
});

userMetadataRoutes.patch('/users/me/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', { message: 'Unauthorized. Missing user ID.' });
    }

    const patch = req.body;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'body' } });
    }

    const hasNotifications = patch.notifications_enabled !== undefined;
    const [updated] = await db
      .update(userTable)
      .set({
        metadata: sql`COALESCE(${userTable.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
        ...(hasNotifications ? { notificationsEnabled: Boolean(patch.notifications_enabled) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId))
      .returning({
        id: userTable.id,
        metadata: userTable.metadata,
        notificationsEnabled: userTable.notificationsEnabled,
      });

    res.status(200).json({
      success: true,
      metadata: updated?.metadata ?? {},
      notificationsEnabled: updated?.notificationsEnabled ?? false,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating user metadata:', error);
    sendAppError(res, error);
  }
});
