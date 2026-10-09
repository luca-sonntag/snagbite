import type { Job } from '../types.js';
import { db } from './drizzle.js';
import { jobs } from './schema/jobs.js';
import { eq, and, inArray, lt, desc } from 'drizzle-orm';
import { ACTIVE_STATUSES, rowToJob } from './jobsDb.js';

/**
 * Sweeps jobs stuck in 'awaiting_frames' past timeoutMinutes to 'failed' (timeout).
 * Prevents the infinite pending <-> awaiting_frames parking loop.
 */
export async function sweepStaleAwaitingFrames(timeoutMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const rows = await db
    .update(jobs)
    .set({
      status: 'failed',
      error: 'EXTRACTION_TIMEOUT',
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobs.status, 'awaiting_frames'),
      lt(jobs.updatedAt, cutoff)
    ))
    .returning({ id: jobs.id });

  if (rows.length > 0) {
    console.log(`[cleanup] Swept ${rows.length} stale awaiting_frames job(s) to failed (EXTRACTION_TIMEOUT).`);
  }
}

/**
 * Proactively cleans up stale active jobs for a specific user before checking concurrency limits.
 */
export async function cleanStaleJobsForUser(userId: string): Promise<number> {
  const awaitingCutoff = new Date(Date.now() - 5 * 60 * 1000);
  const processingCutoff = new Date(Date.now() - 10 * 60 * 1000);
  const pendingCutoff = new Date(Date.now() - 30 * 60 * 1000);

  let swept = 0;

  // 1. Stale awaiting_frames (> 5 min)
  const r1 = await db
    .update(jobs)
    .set({
      status: 'failed',
      error: 'EXTRACTION_TIMEOUT',
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobs.userId, userId),
      eq(jobs.status, 'awaiting_frames'),
      lt(jobs.updatedAt, awaitingCutoff)
    ))
    .returning({ id: jobs.id });
  swept += r1.length;

  // 2. Stale scraping/processing without lease heartbeat (> 10 min)
  const r2 = await db
    .update(jobs)
    .set({
      status: 'failed',
      error: 'EXTRACTION_TIMEOUT',
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobs.userId, userId),
      inArray(jobs.status, ['scraping', 'processing']),
      lt(jobs.lockedAt, processingCutoff)
    ))
    .returning({ id: jobs.id });
  swept += r2.length;

  // 3. Stale pending (> 30 min)
  const r3 = await db
    .update(jobs)
    .set({
      status: 'failed',
      error: 'EXTRACTION_TIMEOUT',
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobs.userId, userId),
      eq(jobs.status, 'pending'),
      lt(jobs.createdAt, pendingCutoff)
    ))
    .returning({ id: jobs.id });
  swept += r3.length;

  if (swept > 0) {
    console.log(`[cleanup] Cleaned ${swept} stale active job(s) for user ${userId}.`);
  }

  return swept;
}

/**
 * Returns all currently active jobs for a user.
 */
export async function getActiveJobsForUser(userId: string): Promise<Job[]> {
  const rows = await db
    .select()
    .from(jobs)
    .where(and(
      eq(jobs.userId, userId),
      inArray(jobs.status, ACTIVE_STATUSES as unknown as string[])
    ))
    .orderBy(desc(jobs.createdAt));

  return rows.map(rowToJob);
}

/**
 * Cancels all currently active jobs for a user and releases concurrency locks.
 */
export async function cancelAllActiveJobsForUser(userId: string): Promise<number> {
  const rows = await db
    .update(jobs)
    .set({
      status: 'cancelled',
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobs.userId, userId),
      inArray(jobs.status, ACTIVE_STATUSES as unknown as string[])
    ))
    .returning({ id: jobs.id });

  return rows.length;
}
