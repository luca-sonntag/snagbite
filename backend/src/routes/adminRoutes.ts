import { Router, Request, Response } from 'express';
import {
  getClient,
  getAllGlobalSettings,
  updateGlobalSettings,
  getAllFeedback,
  listAppBundles,
  setAppBundleActive,
  getJobMetrics,
  getFailedJobs,
  getExtractionsPerUser,
} from '../db.js';
import { config } from '../config.js';
import { requireAdmin } from '../auth.js';
import { getLlmMetrics } from '../adminMetrics.js';
import { notificationTick } from '../notifications/worker.js';
import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';
import { invalidateCache as invalidateMappingCache } from '../matching/mappingStore.js';
import { AppError, sendAppError } from '../errors.js';

export const adminRoutes = Router();

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
        const { data, error } = await getClient().auth.admin.listUsers({ perPage: 1000 });
        if (!error && data?.users) {
          userCount = data.users.length;
          newUsers = since
            ? data.users.filter((u) => u.created_at && new Date(u.created_at) >= since).length
            : userCount;
          for (const u of data.users) {
            emailById.set(u.id, u.email ?? null);
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Error fetching users from Supabase Admin:', errMsg);
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
      const { data, error } = await getClient().auth.admin.listUsers({ perPage: 1000 });
      if (error) {
        throw error;
      }

      const { data: jobs } = await getClient().from('jobs').select('user_id');

      const countsByUser: Record<string, number> = {};
      if (jobs) {
        jobs.forEach((j: { user_id: string }) => {
          if (j.user_id) {
            countsByUser[j.user_id] = (countsByUser[j.user_id] || 0) + 1;
          }
        });
      }

      const users = (data?.users || []).map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        tier: user.app_metadata?.tier || 'free',
        custom_limit:
          user.app_metadata?.custom_extraction_limit ??
          user.app_metadata?.max_extractions_per_window ??
          null,
        extractions_count: countsByUser[user.id] || 0,
      }));

      res.json({ success: true, users });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error listing users for admin:', error);
      sendAppError(res, error);
    }
  }
);

/**
 * List learned ingredient mappings.
 * GET /api/admin/ingredient-mappings?search=&source=&limit=
 * Requires admin privileges.
 */
adminRoutes.get(
  '/admin/ingredient-mappings',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const source = typeof req.query.source === 'string' ? req.query.source.trim() : '';
      const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);

      let query = getClient()
        .from('ingredient_mappings')
        .select('id, mapping_key, category, product_code, resolution, source, confidence, model, reasoning, hit_count, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (search) query = query.ilike('mapping_key', `%${search}%`);
      if (source) query = query.eq('source', source);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      res.json({ success: true, mappings: data ?? [] });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error fetching ingredient mappings:', error);
      sendAppError(res, error);
    }
  }
);

/**
 * Correct or delete one learned ingredient mapping.
 * PATCH /api/admin/ingredient-mappings/:id  { productCode: string | null }
 * DELETE /api/admin/ingredient-mappings/:id
 * Requires admin privileges.
 */
adminRoutes.patch(
  '/admin/ingredient-mappings/:id',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rawCode = req.body?.productCode;
      const productCode = typeof rawCode === 'string' && rawCode.trim() ? rawCode.trim().toLowerCase() : null;

      if (productCode) {
        const item = openFoodFactsAccess.get(productCode);
        if (!item) {
          throw new AppError('INVALID_FIELD', { params: { field: 'productCode' } });
        }
      }

      const { error } = await getClient()
        .from('ingredient_mappings')
        .update({
          product_code: productCode,
          resolution: productCode ? 'matched' : 'no_match',
          source: 'human',
          confidence: 1,
          reasoning: `Corrected by ${req.userEmail ?? 'admin'}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw new Error(error.message);

      invalidateMappingCache();

      res.json({ success: true });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error updating ingredient mapping:', error);
      sendAppError(res, error);
    }
  }
);

adminRoutes.delete(
  '/admin/ingredient-mappings/:id',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error } = await getClient().from('ingredient_mappings').delete().eq('id', req.params.id);
      if (error) throw new Error(error.message);
      invalidateMappingCache();
      res.json({ success: true });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error deleting ingredient mapping:', error);
      sendAppError(res, error);
    }
  }
);

