import { Router, Request, Response } from 'express';
import {
  getJobMetrics,
  getFailedJobs,
  getExtractionsPerUser,
  getGrowthAndRetentionAnalytics,
  getPipelineAndCatalogAnalytics,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { jobs } from '../db/schema/jobs.js';
import { user as userTable } from '../db/schema/auth.js';
import { requireAdmin } from '../auth.js';
import { getLlmMetrics } from '../adminMetrics.js';
import { AppError, sendAppError } from '../errors.js';

export const adminMetricsRoutes = Router();

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

adminMetricsRoutes.get(
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

      const [jobsMetrics, failedJobsRaw, llmMetrics, perUserRaw, growth] = await Promise.all([
        getJobMetrics(since, windowDays),
        getFailedJobs(since),
        getLlmMetrics(since, windowDays),
        getExtractionsPerUser(since),
        getGrowthAndRetentionAnalytics(since),
      ]);

      const avgCostPerExtraction =
        jobsMetrics.completed > 0 && llmMetrics.totalCostUsd > 0
          ? llmMetrics.totalCostUsd / jobsMetrics.completed
          : 0.008;

      const pipeline = await getPipelineAndCatalogAnalytics(since, avgCostPerExtraction);

      const failedJobs = failedJobsRaw.map((job) => ({
        ...job,
        email: emailById.get(job.userId) ?? null,
      }));

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
        growth,
        pipeline,
      });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error fetching admin metrics:', error);
      sendAppError(res, error);
    }
  }
);

adminMetricsRoutes.get(
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
