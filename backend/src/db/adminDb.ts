import { randomUUID } from 'node:crypto';
import { db } from './drizzle.js';
import { feedback, jobs } from './schema/index.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import {
  ensureBucketExists,
  uploadFile,
  getSignedUrl,
} from '../storage/s3Client.js';
import type {
  FeedbackInput,
  FeedbackRow,
  AppBundleRow,
  FailedJobDetails,
  NotificationLogEntry,
  NotificationLogRow,
  NotificationUser,
} from './types.js';

export type {
  FeedbackInput,
  FeedbackRow,
  AppBundleRow,
  FailedJobDetails,
  NotificationLogEntry,
  NotificationLogRow,
  NotificationUser,
};

export {
  getActiveAppBundle,
  listAppBundles,
  setAppBundleActive,
} from './appBundlesDb.js';

export {
  upsertPushToken,
  disablePushToken,
  deletePushToken,
  deletePushTokensForUser,
  getActivePushTokens,
  insertNotificationLog,
  getRecentNotifications,
  listNotificationUsers,
} from './pushNotificationDb.js';

export async function createFeedback(
  userId: string,
  input: FeedbackInput
): Promise<{ id: string }> {
  const id = randomUUID();

  const screenshotUrls: string[] = [];
  const shots = input.screenshotsBase64 ?? [];
  for (let index = 0; index < shots.length; index++) {
    try {
      const base64 = shots[index].replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const storagePath = `${userId}/${id}/${index}.jpg`;

      await ensureBucketExists('feedback-screenshots');
      await uploadFile('feedback-screenshots', storagePath, buffer, 'image/jpeg');

      // SigV4 allows max 7 days presigned URL
      const signedUrl = await getSignedUrl('feedback-screenshots', storagePath, 7 * 24 * 3600);
      screenshotUrls.push(signedUrl);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to upload feedback screenshot ${index}:`, errMsg);
    }
  }

  await db
    .insert(feedback)
    .values({
      id,
      userId,
      type: input.type,
      message: input.message,
      context: input.context ?? null,
      screenshotUrls: screenshotUrls.length > 0 ? screenshotUrls : null,
    });

  return { id };
}

export async function getAllFeedback(): Promise<FeedbackRow[]> {
  const rows = await db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt));

  // Refresh screenshot URLs with fresh 7-day presigned URLs for admin viewing
  return Promise.all(
    rows.map(async (row): Promise<FeedbackRow> => {
      let freshUrls = row.screenshotUrls ?? [];
      if (freshUrls.length > 0) {
        freshUrls = await Promise.all(
          freshUrls.map(async (url, idx) => {
            const storagePath = `${row.userId}/${row.id}/${idx}.jpg`;
            try {
              return await getSignedUrl('feedback-screenshots', storagePath, 7 * 24 * 3600);
            } catch {
              return url;
            }
          })
        );
      }
      return {
        id: row.id,
        user_id: row.userId,
        type: row.type,
        message: row.message,
        context: row.context as Record<string, unknown> | null,
        screenshot_urls: freshUrls.length > 0 ? freshUrls : null,
        created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      };
    })
  );
}

export async function getJobMetrics(
  since: Date | null = null,
  windowDays: number | null = 14
): Promise<{
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  mediaBytes: number;
  mediaMb: number;
  dailyStats: { date: string; count: number }[];
}> {
  const conditions = since ? [gte(jobs.createdAt, since)] : [];
  const allJobs = await db
    .select({
      status: jobs.status,
      createdAt: jobs.createdAt,
      mediaBytes: jobs.mediaBytes,
    })
    .from(jobs)
    .where(and(...conditions));

  let total = allJobs.length;
  let completed = 0;
  let failed = 0;
  let pending = 0;
  let processing = 0;
  let mediaBytes = 0;
  const dailyCounts: Record<string, number> = {};

  for (const job of allJobs) {
    if (job.status === 'completed') completed++;
    else if (job.status === 'failed') failed++;
    else if (job.status === 'pending') pending++;
    else if (job.status === 'processing') processing++;

    mediaBytes += Number(job.mediaBytes ?? 0) || 0;

    if (job.createdAt) {
      const dateStr = (job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt)).split('T')[0];
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    }
  }

  const dailyStats: { date: string; count: number }[] = [];
  if (windowDays && windowDays > 0) {
    const now = new Date();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStats.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
      });
    }
  } else {
    for (const dateStr of Object.keys(dailyCounts).sort()) {
      dailyStats.push({ date: dateStr, count: dailyCounts[dateStr] });
    }
  }

  const mediaMb = parseFloat((mediaBytes / (1024 * 1024)).toFixed(2));

  return { total, completed, failed, pending, processing, mediaBytes, mediaMb, dailyStats };
}

export async function getExtractionsPerUser(
  since: Date | null = null
): Promise<{ userId: string; count: number }[]> {
  const conditions = [eq(jobs.status, 'completed')];
  if (since) {
    conditions.push(gte(jobs.createdAt, since));
  }

  const rows = await db
    .select({ userId: jobs.userId })
    .from(jobs)
    .where(and(...conditions));

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const uid = row.userId;
    if (!uid) continue;
    counts[uid] = (counts[uid] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([userId, count]) => ({ userId, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function getFailedJobs(
  since: Date | null = null,
  limit = 50
): Promise<FailedJobDetails[]> {
  const conditions = [eq(jobs.status, 'failed')];
  if (since) {
    conditions.push(gte(jobs.createdAt, since));
  }

  const rows = await db
    .select({
      id: jobs.id,
      sourceUrl: jobs.sourceUrl,
      error: jobs.error,
      userId: jobs.userId,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    url: row.sourceUrl ?? '',
    error: row.error,
    userId: row.userId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }));
}
