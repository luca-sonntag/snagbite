import type { Job } from '../types.js';
import { getClient, wrapError, JobRow } from './client.js';
import { ACTIVE_STATUSES, rowToJob } from './jobsDb.js';

/**
 * Sweeps jobs stuck in 'awaiting_frames' past timeoutMinutes to 'failed' (timeout).
 * Prevents the infinite pending <-> awaiting_frames parking loop.
 */
export async function sweepStaleAwaitingFrames(timeoutMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { error, count } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'failed',
        error: 'EXTRACTION_TIMEOUT',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .eq('status', 'awaiting_frames')
    .lt('updated_at', cutoff);

  if (error) {
    console.error('Failed to sweep stale awaiting_frames jobs:', error.message);
  } else if (count && count > 0) {
    console.log(`[cleanup] Swept ${count} stale awaiting_frames job(s) to failed (EXTRACTION_TIMEOUT).`);
  }
}

/**
 * Proactively cleans up stale active jobs for a specific user before checking concurrency limits.
 */
export async function cleanStaleJobsForUser(userId: string): Promise<number> {
  const awaitingCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const processingCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const pendingCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  let swept = 0;

  // 1. Stale awaiting_frames (> 5 min)
  const { count: c1 } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'failed',
        error: 'EXTRACTION_TIMEOUT',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .eq('status', 'awaiting_frames')
    .lt('updated_at', awaitingCutoff);
  swept += c1 ?? 0;

  // 2. Stale scraping/processing without lease heartbeat (> 10 min)
  const { count: c2 } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'failed',
        error: 'EXTRACTION_TIMEOUT',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .in('status', ['scraping', 'processing'])
    .lt('locked_at', processingCutoff);
  swept += c2 ?? 0;

  // 3. Stale pending (> 30 min)
  const { count: c3 } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'failed',
        error: 'EXTRACTION_TIMEOUT',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('created_at', pendingCutoff);
  swept += c3 ?? 0;

  if (swept > 0) {
    console.log(`[cleanup] Cleaned ${swept} stale active job(s) for user ${userId}.`);
  }

  return swept;
}

/**
 * Returns all currently active jobs for a user.
 */
export async function getActiveJobsForUser(userId: string): Promise<Job[]> {
  const { data, error } = await getClient()
    .from('jobs')
    .select()
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .returns<JobRow[]>();

  if (error) throw wrapError('Failed to get active jobs for user', error);
  return data.map(rowToJob);
}

/**
 * Cancels all currently active jobs for a user and releases concurrency locks.
 */
export async function cancelAllActiveJobsForUser(userId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'cancelled',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES as unknown as string[]);

  if (error) throw wrapError('Failed to cancel active jobs for user', error);
  return count ?? 0;
}
