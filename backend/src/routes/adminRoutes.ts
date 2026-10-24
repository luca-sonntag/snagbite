import { Router, Request, Response } from 'express';
import {
  getAllGlobalSettings,
  updateGlobalSettings,
  getAllFeedback,
  listAppBundles,
  setAppBundleActive,
  deletePushTokensForUser,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { eq, sql } from 'drizzle-orm';
import { user as userTable } from '../db/schema/auth.js';
import { config } from '../config.js';
import { requireAdmin } from '../auth.js';
import { notificationTick } from '../notifications/worker.js';
import { adminMappingRoutes } from './adminMappingRoutes.js';
import { adminMetricsRoutes } from './adminMetricsRoutes.js';
import { AppError, sendAppError } from '../errors.js';

export const adminRoutes = Router();
adminRoutes.use(adminMappingRoutes);
adminRoutes.use(adminMetricsRoutes);

adminRoutes.get('/admin/check', (req: Request, res: Response): void => {
  const email = req.userEmail;
  if (!email) {
    res.json({ success: true, isAdmin: false });
    return;
  }
  const adminEmails = config.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(email.toLowerCase());
  res.json({ success: true, isAdmin });
});

adminRoutes.post(
  '/admin/me/tier',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tier } = req.body ?? {};
      if (tier !== 'free' && tier !== 'premium') {
        throw new AppError('INVALID_FIELD', { params: { field: 'tier' } });
      }

      const [currentUser] = await db
        .select({ metadata: userTable.metadata })
        .from(userTable)
        .where(eq(userTable.id, req.userId!))
        .limit(1);

      const metadata = { ...((currentUser?.metadata || {}) as Record<string, unknown>) };
      delete metadata.tier;
      if (metadata.app_metadata && typeof metadata.app_metadata === 'object') {
        delete (metadata.app_metadata as Record<string, unknown>).tier;
      }

      await db
        .update(userTable)
        .set({ tier, metadata, updatedAt: new Date() })
        .where(eq(userTable.id, req.userId!));

      res.json({ success: true, tier });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error switching admin tier:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.post(
  '/admin/me/reset-settings',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;

      await db
        .update(userTable)
        .set({
          metadata: sql`'{}'::jsonb`,
          notificationsEnabled: false,
          customExtractionLimit: null,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, userId));

      await deletePushTokensForUser(userId).catch((err) => {
        console.warn(`[admin/me/reset-settings] Failed to delete push tokens for ${userId}:`, err);
      });

      res.json({ success: true, message: 'Settings reset successfully' });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error resetting admin user settings:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.post(
  '/admin/notifications/trigger',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const force = req.body?.force !== false;
      const result = await notificationTick({ force });
      res.json({ success: true, message: `Push notification worker tick executed.`, result });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error triggering push notifications:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.get(
  '/admin/settings',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await getAllGlobalSettings();
      res.json({ success: true, settings });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error fetching global settings:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.patch(
  '/admin/settings',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        throw new AppError('MISSING_FIELD', { params: { field: 'settings' } });
      }

      await updateGlobalSettings(settings);
      res.json({ success: true, message: 'Global settings updated.' });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error updating global settings:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.get(
  '/admin/feedback',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const feedback = await getAllFeedback();
      res.json({ success: true, feedback });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error fetching feedback:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.get(
  '/admin/app-bundles',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const channel = req.query.channel as string | undefined;
      if (
        channel !== undefined &&
        channel !== 'production' &&
        channel !== 'alpha' &&
        channel !== 'internal'
      ) {
        res.status(400).json({
          success: false,
          error: 'Query parameter channel must be "production", "alpha" or "internal".',
        });
        return;
      }

      const bundles = await listAppBundles(channel);
      res.json({ success: true, bundles });
    } catch (error: unknown) {
      console.error('Error listing app bundles:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  }
);

adminRoutes.patch(
  '/admin/app-bundles/:id',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        res.status(400).json({ success: false, error: 'Field active must be a boolean.' });
        return;
      }

      const bundle = await setAppBundleActive(id, active);
      res.json({ success: true, bundle });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('not found')) {
        res.status(404).json({ success: false, error: 'App bundle not found.' });
        return;
      }
      console.error('Error updating app bundle:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  }
);
