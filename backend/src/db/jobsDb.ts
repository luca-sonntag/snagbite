import type {
  Job,
  JobStatus,
  JobKind,
  Recipe,
  ProgressData,
  LlmUsage,
} from '../types.js';
import {
  getClient,
  wrapError,
  isNoRowsError,
  PG_UNIQUE_VIOLATION,
  JobRow,
} from './client.js';
import { recipeToRow } from './recipesDb.js';

export function normalizeUrl(urlStr: string): string {
  let clean = urlStr.replace(/^(https?:\/\/)?(www\.)?/i, '');
  clean = clean.split('?')[0];
  clean = clean.endsWith('/') ? clean.slice(0, -1) : clean;
  return clean.toLowerCase();
}

export function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as JobKind,
    status: row.status as JobStatus,
    sourceUrl: row.source_url,
    sourceUrlNormalized: row.source_url_normalized,
    error: row.error,
    progress: (row.progress as ProgressData) ?? null,
    clientFrames: (row.client_frames as Job['clientFrames']) ?? null,
    scrapeMeta: (row.scrape_meta as Record<string, unknown>) ?? null,
    recipeId: row.recipe_id,
    parentRecipeId: row.parent_recipe_id,
    remixPrompt: row.remix_prompt,
    llmUsage: (row.llm_usage as LlmUsage) ?? null,
    mediaBytes: row.media_bytes ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function jobToRow(updates: Partial<Job>): Partial<JobRow> {
  const row: Partial<JobRow> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.error !== undefined) row.error = updates.error;
  if (updates.progress !== undefined) row.progress = updates.progress;
  if (updates.clientFrames !== undefined) row.client_frames = updates.clientFrames;
  if (updates.scrapeMeta !== undefined) row.scrape_meta = updates.scrapeMeta;
  if (updates.recipeId !== undefined) row.recipe_id = updates.recipeId;
  if (updates.llmUsage !== undefined) row.llm_usage = updates.llmUsage;
  if (updates.mediaBytes !== undefined) row.media_bytes = updates.mediaBytes;
  if (updates.updatedAt !== undefined) row.updated_at = updates.updatedAt;
  return row;
}

export const ACTIVE_STATUSES = ['pending', 'scraping', 'processing', 'awaiting_frames'] as const;

export async function createJob(url: string, userId: string, kind: JobKind = 'url'): Promise<Job> {
  const { data, error } = await getClient()
    .from('jobs')
    .insert({
      user_id: userId,
      kind,
      status: 'pending',
      source_url: url,
      source_url_normalized: normalizeUrl(url),
    })
    .select()
    .returns<JobRow>()
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      const existing = await findActiveJobByUrl(url, userId);
      if (existing) return existing;
    }
    throw wrapError('Failed to create job', error);
  }
  return rowToJob(data);
}

export async function createRemixJob(
  parentRecipeId: string,
  url: string,
  prompt: string,
  userId: string
): Promise<Job> {
  const { data, error } = await getClient()
    .from('jobs')
    .insert({
      user_id: userId,
      kind: 'remix',
      status: 'pending',
      source_url: url,
      source_url_normalized: normalizeUrl(url),
      parent_recipe_id: parentRecipeId,
      remix_prompt: prompt,
    })
    .select()
    .returns<JobRow>()
    .single();

  if (error) throw wrapError('Failed to create remix job', error);
  return rowToJob(data);
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getClient()
    .from('jobs')
    .update({ ...jobToRow(updates), updated_at: now })
    .eq('id', id);

  if (error) throw wrapError(`Failed to update job ${id}`, error);
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
  const { data, error } = await getClient().rpc('complete_job', {
    p_job_id: jobId,
    p_recipe: recipeToRow(recipe),
    p_llm_usage: llmUsage ?? null,
  });

  if (error) throw wrapError(`Failed to complete job ${jobId}`, error);
  return data as string;
}

export async function getJob(id: string, userId?: string): Promise<Job | null> {
  let query = getClient().from('jobs').select().eq('id', id);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.returns<JobRow>().single();

  if (error) {
    if (isNoRowsError(error)) return null;
    throw wrapError(`Failed to get job ${id}`, error);
  }
  return rowToJob(data);
}

export async function claimNextJob(workerId: string): Promise<Job | null> {
  const { data, error } = await getClient().rpc('claim_next_job', { worker_id: workerId });

  if (error) throw wrapError('Failed to claim next job', error);
  const rows = data as JobRow[] | null;
  if (!rows || rows.length === 0) return null;

  const job = rowToJob(rows[0]);

  if (rows[0].client_frames) {
    const { error: updateErr } = await getClient()
      .from('jobs')
      .update({ client_frames: null })
      .eq('id', job.id);
    if (updateErr) {
      console.warn(`[Job ${job.id}] Failed to null client_frames in DB: ${updateErr.message}`);
    }
  }

  return job;
}

export async function findActiveJobByUrl(url: string, userId: string): Promise<Job | null> {
  const { data, error } = await getClient()
    .from('jobs')
    .select()
    .in('status', ACTIVE_STATUSES as unknown as string[])
    .eq('user_id', userId)
    .eq('source_url_normalized', normalizeUrl(url))
    .returns<JobRow[]>()
    .limit(1);

  if (error) throw wrapError('Failed to search active jobs by URL', error);
  return data.length > 0 ? rowToJob(data[0]) : null;
}

export async function findExtractedRecipeIdByUrl(
  url: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await getClient()
    .from('jobs')
    .select('recipe_id')
    .eq('status', 'completed')
    .eq('user_id', userId)
    .eq('source_url_normalized', normalizeUrl(url))
    .not('recipe_id', 'is', null)
    .order('created_at', { ascending: false })
    .returns<{ recipe_id: string }[]>()
    .limit(1);

  if (error) throw wrapError('Failed to search completed jobs by URL', error);
  return data.length > 0 ? data[0].recipe_id : null;
}

export async function cancelJob(id: string, userId: string): Promise<boolean> {
  const { data, error } = await getClient()
    .from('jobs')
    .update({ status: 'cancelled', progress: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES as unknown as string[])
    .select('id');

  if (error) throw wrapError(`Failed to cancel job ${id}`, error);
  return (data?.length ?? 0) > 0;
}

export async function isJobCancelled(id: string): Promise<boolean> {
  const { data, error } = await getClient().from('jobs').select('status').eq('id', id).single();

  if (error) {
    if (isNoRowsError(error)) return true;
    throw wrapError(`Failed to read job status ${id}`, error);
  }
  return (data as { status: string }).status === 'cancelled';
}

export async function heartbeatJob(id: string): Promise<void> {
  const { error } = await getClient()
    .from('jobs')
    .update({ locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.warn(`Heartbeat failed for job ${id}: ${error.message}`);
}

export async function reclaimExpiredJobs(timeoutMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { error, count } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'pending',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .in('status', ['scraping', 'processing'])
    .lt('locked_at', cutoff);

  if (error) {
    console.error('Failed to reclaim expired jobs:', error.message);
  } else if (count && count > 0) {
    console.log(`Reclaimed ${count} expired job(s) back to pending.`);
  }
}

export async function sweepStaleAwaitingFrames(timeoutMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { error, count } = await getClient()
    .from('jobs')
    .update(
      {
        status: 'pending',
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
    console.log(`Swept ${count} stale awaiting_frames job(s) back to pending.`);
  }
}

export async function countActiveJobsForUser(userId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES as unknown as string[]);

  if (error) throw wrapError('Failed to count active jobs', error);
  return count ?? 0;
}

export async function getExtractionsForUserInTimeframe(
  userId: string,
  days: number
): Promise<Job[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getClient()
    .from('jobs')
    .select()
    .eq('user_id', userId)
    .neq('kind', 'remix')
    .neq('status', 'failed')
    .neq('status', 'cancelled')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .returns<JobRow[]>();

  if (error) throw wrapError('Failed to get extractions in timeframe', error);
  return data.map(rowToJob);
}
