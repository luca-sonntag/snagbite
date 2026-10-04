import type {
  Job,
  JobStatus,
  JobKind,
  Recipe,
  ProgressData,
  LlmUsage,
} from '../types.js';
import { db, getDbPool } from './drizzle.js';
import { jobs } from './schema/jobs.js';
import { eq, and, inArray, lt, ne, gte, asc, desc, count } from 'drizzle-orm';
import { recipeToRow } from './recipesMappers.js';

export function normalizeUrl(urlStr: string): string {
  let clean = urlStr.replace(/^(https?:\/\/)?(www\.)?/i, '');
  clean = clean.split('?')[0];
  clean = clean.endsWith('/') ? clean.slice(0, -1) : clean;
  return clean.toLowerCase();
}

export function rowToJob(row: any): Job {
  const rawCreatedAt = row.createdAt ?? row.created_at;
  const rawUpdatedAt = row.updatedAt ?? row.updated_at;
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    kind: (row.kind ?? 'url') as JobKind,
    status: (row.status ?? 'pending') as JobStatus,
    sourceUrl: row.sourceUrl ?? row.source_url,
    sourceUrlNormalized: row.sourceUrlNormalized ?? row.source_url_normalized,
    error: row.error,
    progress: (row.progress as ProgressData) ?? null,
    clientFrames: (row.clientFrames ?? row.client_frames) as Job['clientFrames'] ?? null,
    scrapeMeta: (row.scrapeMeta ?? row.scrape_meta) as Record<string, unknown> ?? null,
    recipeId: row.recipeId ?? row.recipe_id,
    parentRecipeId: row.parentRecipeId ?? row.parent_recipe_id,
    remixPrompt: row.remixPrompt ?? row.remix_prompt,
    llmUsage: (row.llmUsage ?? row.llm_usage) as LlmUsage ?? null,
    mediaBytes: row.mediaBytes ?? row.media_bytes ?? 0,
    createdAt: rawCreatedAt instanceof Date ? rawCreatedAt.toISOString() : (rawCreatedAt ?? new Date().toISOString()),
    updatedAt: rawUpdatedAt instanceof Date ? rawUpdatedAt.toISOString() : (rawUpdatedAt ?? new Date().toISOString()),
  };
}

export function jobToRow(updates: Partial<Job>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.error !== undefined) row.error = updates.error;
  if (updates.progress !== undefined) row.progress = updates.progress;
  if (updates.clientFrames !== undefined) row.clientFrames = updates.clientFrames;
  if (updates.scrapeMeta !== undefined) row.scrapeMeta = updates.scrapeMeta;
  if (updates.recipeId !== undefined) row.recipeId = updates.recipeId;
  if (updates.llmUsage !== undefined) row.llmUsage = updates.llmUsage;
  if (updates.mediaBytes !== undefined) row.mediaBytes = updates.mediaBytes;
  if (updates.updatedAt !== undefined) row.updatedAt = new Date(updates.updatedAt);
  return row;
}

export const ACTIVE_STATUSES = ['pending', 'scraping', 'processing', 'awaiting_frames'] as const;

export async function createJob(url: string, userId: string, kind: JobKind = 'url'): Promise<Job> {
  const normalized = normalizeUrl(url);
  try {
    const [inserted] = await db
      .insert(jobs)
      .values({
        userId,
        kind,
        status: 'pending',
        sourceUrl: url,
        sourceUrlNormalized: normalized,
      })
      .returning();

    return rowToJob(inserted);
  } catch (error: any) {
    if (error?.code === '23505') {
      const existing = await findActiveJobByUrl(url, userId);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function createRemixJob(
  parentRecipeId: string,
  url: string,
  prompt: string,
  userId: string
): Promise<Job> {
  const [inserted] = await db
    .insert(jobs)
    .values({
      userId,
      kind: 'remix',
      status: 'pending',
      sourceUrl: url,
      sourceUrlNormalized: normalizeUrl(url),
      parentRecipeId,
      remixPrompt: prompt,
    })
    .returning();

  return rowToJob(inserted);
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  await db
    .update(jobs)
    .set({
      ...jobToRow(updates),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id));
}

export async function updateJobProgress(
  id: string,
  status: JobStatus,
  progress: ProgressData
): Promise<void> {
  await updateJob(id, { status, progress });
}

export async function completeJob(
  jobId: string,
  recipe: Recipe,
  llmUsage?: LlmUsage | null
): Promise<string> {
  const { rows } = await getDbPool().query(
    'SELECT complete_job($1, $2::jsonb, $3::jsonb) AS recipe_id',
    [jobId, JSON.stringify(recipeToRow(recipe)), llmUsage ? JSON.stringify(llmUsage) : null]
  );
  return rows[0]?.recipe_id as string;
}

export async function getJob(id: string, userId?: string): Promise<Job | null> {
  const conditions = [eq(jobs.id, id)];
  if (userId) {
    conditions.push(eq(jobs.userId, userId));
  }

  const [row] = await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .limit(1);

  if (!row) return null;
  return rowToJob(row);
}

export async function claimNextJob(workerId: string): Promise<Job | null> {
  const { rows } = await getDbPool().query('SELECT * FROM claim_next_job($1)', [workerId]);
  if (!rows || rows.length === 0) return null;

  const job = rowToJob(rows[0]);
  if (rows[0].client_frames) {
    try {
      await db
        .update(jobs)
        .set({ clientFrames: null })
        .where(eq(jobs.id, job.id));
    } catch (err: any) {
      console.warn(`[Job ${job.id}] Failed to null client_frames in DB: ${err.message}`);
    }
  }

  return job;
}

export async function findActiveJobByUrl(url: string, userId: string): Promise<Job | null> {
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(
      inArray(jobs.status, ACTIVE_STATUSES as unknown as string[]),
      eq(jobs.userId, userId),
      eq(jobs.sourceUrlNormalized, normalizeUrl(url))
    ))
    .limit(1);

  return row ? rowToJob(row) : null;
}

export async function findExtractedRecipeIdByUrl(
  url: string,
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ recipeId: jobs.recipeId })
    .from(jobs)
    .where(and(
      eq(jobs.status, 'completed'),
      eq(jobs.userId, userId),
      eq(jobs.sourceUrlNormalized, normalizeUrl(url))
    ))
    .orderBy(desc(jobs.createdAt))
    .limit(1);

  return row?.recipeId ?? null;
}

export async function cancelJob(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .update(jobs)
    .set({
      status: 'cancelled',
      progress: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobs.id, id),
      eq(jobs.userId, userId),
      inArray(jobs.status, ACTIVE_STATUSES as unknown as string[])
    ))
    .returning({ id: jobs.id });

  return deleted.length > 0;
}

export async function isJobCancelled(id: string): Promise<boolean> {
  const [row] = await db
    .select({ status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);

  return !row || row.status === 'cancelled';
}

export async function heartbeatJob(id: string): Promise<void> {
  try {
    await db
      .update(jobs)
      .set({
        lockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));
  } catch (err: any) {
    console.warn(`Heartbeat failed for job ${id}: ${err.message}`);
  }
}

export async function reclaimExpiredJobs(timeoutMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  const rows = await db
    .update(jobs)
    .set({
      status: 'pending',
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(and(
      inArray(jobs.status, ['scraping', 'processing']),
      lt(jobs.lockedAt, cutoff)
    ))
    .returning({ id: jobs.id });

  if (rows.length > 0) {
    console.log(`Reclaimed ${rows.length} expired job(s) back to pending.`);
  }
}

export {
  sweepStaleAwaitingFrames,
  cleanStaleJobsForUser,
  getActiveJobsForUser,
  cancelAllActiveJobsForUser,
} from './jobsCleanup.js';

export async function countActiveJobsForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(jobs)
    .where(and(
      eq(jobs.userId, userId),
      inArray(jobs.status, ACTIVE_STATUSES as unknown as string[])
    ));

  return Number(row?.count ?? 0);
}

export async function getExtractionsForUserInTimeframe(
  userId: string,
  days: number
): Promise<Job[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(jobs)
    .where(and(
      eq(jobs.userId, userId),
      ne(jobs.kind, 'remix'),
      ne(jobs.status, 'failed'),
      ne(jobs.status, 'cancelled'),
      gte(jobs.createdAt, cutoff)
    ))
    .orderBy(asc(jobs.createdAt));

  return rows.map(rowToJob);
}
