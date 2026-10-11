import { Router, Request, Response } from 'express';
import {
  getAllGlobalSettings,
  updateGlobalSettings,
  getAllFeedback,
  listAppBundles,
  setAppBundleActive,
  getJobMetrics,
  getFailedJobs,
  getExtractionsPerUser,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { jobs } from '../db/schema/jobs.js';
import { user as userTable } from '../db/schema/auth.js';
import { config } from '../config.js';
import { requireAdmin } from '../auth.js';
import { getLlmMetrics } from '../adminMetrics.js';
import { notificationTick } from '../notifications/worker.js';
import { adminMappingRoutes } from './adminMappingRoutes.js';
import { AppError, sendAppError } from '../errors.js';

export const adminRoutes = Router();
adminRoutes.use(adminMappingRoutes);

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

function resolveMetricsRange(range: string): { since: Date | null; windowDays: number | null } {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  switch (range) {
    case 'today':
      return { since: startOfToday, windowDays: 1 };
    case '3d': {
      const since = new Date(startOfToday);
      since.setDate(since.getDate() - 2);
      return { since, windowDays: 3 };
    }
    case '7d': {
      const since = new Date(startOfToday);
      since.setDate(since.getDate() - 6);
      return { since, windowDays: 7 };
    }
    case '30d': {
      const since = new Date(startOfToday);
      since.setDate(since.getDate() - 29);
      return { since, windowDays: 30 };
    }
    case 'all':
    default:
      return { since: null, windowDays: null };
  }
}

adminRoutes.get(
  '/admin/metrics',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const range = String(req.query.range ?? 'all');
      const { since, windowDays } = resolveMetricsRange(range);

      let userCount = 0;
      let newUsers = 0;
      const emailById = new Map<string, string | null>();
      try {
        const allUsers = await db.select().from(userTable);
        userCount = allUsers.length;
        newUsers = since
          ? allUsers.filter((u) => u.createdAt && u.createdAt >= since).length
          : userCount;
        for (const u of allUsers) {
          emailById.set(u.id, u.email ?? null);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Error fetching users from DB:', errMsg);
      }

      const jobsMetrics = await getJobMetrics(since, windowDays);
      const failedJobsRaw = await getFailedJobs(since);
      const failedJobs = failedJobsRaw.map((job) => ({
        ...job,
        email: emailById.get(job.userId) ?? null,
      }));

      const llmMetrics = await getLlmMetrics(since, windowDays);
      const perUserRaw = await getExtractionsPerUser(since);
      const extractionsPerUser = perUserRaw.map((entry) => ({
        userId: entry.userId,
        email: emailById.get(entry.userId) ?? null,
        count: entry.count,
      }));

      res.json({
        success: true,
        range,
        users: {
          total: userCount,
          newInRange: newUsers,
        },
        jobs: {
          ...jobsMetrics,
          failedJobs,
        },
        llm: llmMetrics,
        extractionsPerUser,
      });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error fetching admin metrics:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.get(
  '/admin/users',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const allUsers = await db.select().from(userTable);
      const jobRows = await db.select({ userId: jobs.userId }).from(jobs);

      const countsByUser: Record<string, number> = {};
      jobRows.forEach((j) => {
        if (j.userId) {
          countsByUser[j.userId] = (countsByUser[j.userId] || 0) + 1;
        }
      });

      const users = allUsers.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.createdAt.toISOString(),
        last_sign_in_at: u.updatedAt.toISOString(),
        tier: u.tier || 'free',
        custom_limit: u.customExtractionLimit ?? null,
        extractions_count: countsByUser[u.id] || 0,
      }));

      res.json({ success: true, users });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error listing users for admin:', error);
      sendAppError(res, error);
    }
  }
);


