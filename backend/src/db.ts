import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import type { Job, JobStatus, Recipe, ProgressData, Collection, GamificationConfig, UserStats, Profile } from './types.js';
import { DEFAULT_GAMIFICATION_CONFIG } from './types.js';

// ── Types ────────────────────────────────────────────────────────────────────

/** Row shape as stored in Supabase (snake_case columns). */
interface JobRow {
  id: string;
  url: string;
  status: string;
  error: string | null;
  recipe: unknown;
  user_id: string;
  parent_job_id: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
  locked_by: string | null;
  url_normalized: string | null;
  is_favorite?: boolean;
  flags?: string[];
  media_bytes?: number;
  /** NULL = live job; ISO timestamp = soft-deleted */
  deleted_at?: string | null;
}

// ── Supabase client (lazy singleton) ─────────────────────────────────────────

let _client: SupabaseClient | undefined;

export function getClient(): SupabaseClient {
  // Use service_role key so the queue worker (which has no user JWT) can also operate.
  // RLS is enforced via explicit .eq('user_id', userId) filters in every query.
  _client ??= createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY);
  return _client;
}

// ── Error helpers ────────────────────────────────────────────────────────────

/** PostgREST error code for "no rows returned by .single()". */
const PGRST_NO_ROWS = 'PGRST116';

function isNoRowsError(err: PostgrestError): boolean {
  return err.code === PGRST_NO_ROWS;
}

function wrapError(context: string, err: PostgrestError): Error {
  return new Error(`${context}: ${err.message}`, { cause: err });
}

// ── Row ↔ Domain mapping ─────────────────────────────────────────────────────

function rowToJob(row: JobRow): Job {
  const recipeData = row.recipe as any;
  const isProgress = recipeData && recipeData.isProgress;

  const job: Job = {
    id: row.id,
    url: row.url,
    status: row.status as JobStatus,
    error: row.error,
    recipe: isProgress ? null : (row.recipe as Recipe),
    progress: isProgress ? (row.recipe as ProgressData) : null,
    parentJobId: row.parent_job_id,
    prompt: row.prompt,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isFavorite: row.is_favorite ?? false,
    flags: row.flags ?? [],
    mediaBytes: row.media_bytes ?? 0,
    deletedAt: row.deleted_at ?? null,
  };
  if (job.recipe) {
    normalizeRecipe(job.recipe, job.id);
    if (job.parentJobId) {
      job.recipe.parentJobId = job.parentJobId;
    }
    if (job.prompt) {
      job.recipe.remixPrompt = job.prompt;
    }
  }
  return job;
}

function jobToRow(updates: Partial<Job>): Partial<JobRow> {
  const row: Partial<JobRow> = {};
  if (updates.url !== undefined) row.url = updates.url;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.error !== undefined) row.error = updates.error;
  if (updates.recipe !== undefined) row.recipe = updates.recipe;
  if (updates.parentJobId !== undefined) row.parent_job_id = updates.parentJobId;
  if (updates.prompt !== undefined) row.prompt = updates.prompt;
  if (updates.createdAt !== undefined) row.created_at = updates.createdAt;
  if (updates.updatedAt !== undefined) row.updated_at = updates.updatedAt;
  if (updates.isFavorite !== undefined) row.is_favorite = updates.isFavorite;
  if (updates.flags !== undefined) row.flags = updates.flags;
  if (updates.mediaBytes !== undefined) row.media_bytes = updates.mediaBytes;
  if (updates.deletedAt !== undefined) row.deleted_at = updates.deletedAt;
  return row;
}

// ── Recipe normalization ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRecipe(recipe: any, jobId: string): void {
  if (recipe && recipe.isProgress) return;
  if (!recipe.id) {
    recipe.id = jobId;
  }
  if (recipe.nutritionalEstimates && !recipe.nutritionalValues) {
    recipe.nutritionalValues = recipe.nutritionalEstimates;
    delete recipe.nutritionalEstimates;
  }
  if (Array.isArray(recipe.ingredients)) {
    const ingredients = recipe.ingredients as Array<{ items?: unknown[] }>;
    const needsConversion =
      ingredients.length === 0 ||
      (ingredients[0] && !Array.isArray(ingredients[0].items));
    if (needsConversion) {
      recipe.ingredients = [{ name: 'Ingredients', items: ingredients }];
    }
  }
}

// ── URL normalization ────────────────────────────────────────────────────────

function normalizeUrl(urlStr: string): string {
  let clean = urlStr.replace(/^(https?:\/\/)?(www\.)?/i, '');
  clean = clean.split('?')[0];
  clean = clean.endsWith('/') ? clean.slice(0, -1) : clean;
  return clean.toLowerCase();
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Postgres error code for a unique-constraint violation. */
const PG_UNIQUE_VIOLATION = '23505';

/** Create a new pending job. */
export async function createJob(url: string, userId: string): Promise<Job> {
  const now = new Date().toISOString();
  const id = randomUUID();

  const { data, error } = await getClient()
    .from('jobs')
    .insert({ id, url, url_normalized: normalizeUrl(url), status: 'pending', error: null, recipe: null, user_id: userId, created_at: now, updated_at: now })
    .select()
    .returns<JobRow>()
    .single();

  if (error) {
    // Two near-simultaneous requests for the same URL can both pass the
    // app-level active-job check before either INSERT commits; the partial
    // unique index on (user_id, url_normalized) for active jobs catches that
    // race here. Return the job the other request created instead of failing.
    if (error.code === PG_UNIQUE_VIOLATION) {
      const existing = await findActiveJobByUrl(url, userId);
      if (existing) return existing;
    }
    throw wrapError('Failed to create job', error);
  }
  return rowToJob(data);
}

/** Create a new pending remix job. */
export async function createRemixJob(parentJobId: string, url: string, prompt: string, userId: string): Promise<Job> {
  const now = new Date().toISOString();
  const id = randomUUID();

  const { data, error } = await getClient()
    .from('jobs')
    .insert({ id, url, url_normalized: normalizeUrl(url), status: 'pending', error: null, recipe: null, user_id: userId, parent_job_id: parentJobId, prompt, created_at: now, updated_at: now })
    .select()
    .returns<JobRow>()
    .single();

  if (error) throw wrapError('Failed to create remix job', error);
  return rowToJob(data);
}

/** Save a completed recipe remix directly. */
export async function saveCompletedRemix(parentJobId: string, url: string, recipe: Recipe, prompt: string, userId: string): Promise<Job> {
  const now = new Date().toISOString();
  const id = randomUUID();

  const finalRecipe = {
    ...recipe,
    id,
    parentJobId,
    remixPrompt: prompt
  };

  const { data, error } = await getClient()
    .from('jobs')
    .insert({
      id,
      url,
      url_normalized: normalizeUrl(url),
      status: 'completed',
      error: null,
      recipe: finalRecipe as any,
      user_id: userId,
      parent_job_id: parentJobId,
      prompt,
      created_at: now,
      updated_at: now
    })
    .select()
    .returns<JobRow>()
    .single();

  if (error) throw wrapError('Failed to save completed remix job', error);
  return rowToJob(data);
}

/** Update an existing job by ID. */
export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  const now = new Date().toISOString();
  const rowUpdates = { ...jobToRow(updates), updated_at: now };

  const { error } = await getClient()
    .from('jobs')
    .update(rowUpdates)
    .eq('id', id);

  if (error) throw wrapError(`Failed to update job ${id}`, error);
}

/** Retrieve a job by ID, or `null` if not found. Scoped to userId when provided. */
export async function getJob(id: string, userId?: string): Promise<Job | null> {
  let query = getClient()
    .from('jobs')
    .select()
    .eq('id', id);

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

/**
 * Atomically claims the oldest pending job for a worker using SKIP LOCKED.
 * Returns null if no pending jobs are available.
 */
export async function claimNextJob(workerId: string): Promise<Job | null> {
  const { data, error } = await getClient()
    .rpc('claim_next_job', { worker_id: workerId });

  if (error) throw wrapError('Failed to claim next job', error);
  const rows = data as JobRow[] | null;
  if (!rows || rows.length === 0) return null;
  return rowToJob(rows[0]);
}

/** Find a completed job by URL (normalized), scoped to userId. Optionally includes soft-deleted jobs. */
export async function findCompletedJobByUrl(url: string, userId: string, includeDeleted = false): Promise<Job | null> {
  let query = getClient()
    .from('jobs')
    .select()
    .eq('status', 'completed')
    .eq('user_id', userId)
    .eq('url_normalized', normalizeUrl(url));

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query
    .returns<JobRow[]>()
    .limit(1);

  if (error) throw wrapError('Failed to search jobs by URL', error);
  return data.length > 0 ? rowToJob(data[0]) : null;
}

/** Find a still-running (not yet completed/failed) job by URL (normalized), scoped to userId. Optionally includes soft-deleted jobs. */
export async function findActiveJobByUrl(url: string, userId: string, includeDeleted = false): Promise<Job | null> {
  let query = getClient()
    .from('jobs')
    .select()
    .in('status', ['pending', 'scraping', 'processing'])
    .eq('user_id', userId)
    .eq('url_normalized', normalizeUrl(url));

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query
    .returns<JobRow[]>()
    .limit(1);

  if (error) throw wrapError('Failed to search active jobs by URL', error);
  return data.length > 0 ? rowToJob(data[0]) : null;
}

/** Restores a soft-deleted job by clearing deleted_at, scoped to userId. */
export async function restoreJob(id: string, userId: string): Promise<boolean> {
  const { data, error } = await getClient()
    .from('jobs')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) throw wrapError(`Failed to restore job ${id}`, error);
  return (data?.length ?? 0) > 0;
}

/** Retrieve all non-deleted jobs for a user, newest first. */
export async function getAllJobs(userId: string): Promise<Job[]> {
  const { data, error } = await getClient()
    .from('jobs')
    .select()
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<JobRow[]>();

  if (error) throw wrapError('Failed to get all jobs', error);
  const jobs = data.map(rowToJob);

  try {
    const memberships = await getCollectionMembership(userId);
    for (const job of jobs) {
      job.collectionIds = memberships[job.id] ?? [];
    }
  } catch (err) {
    console.warn('Failed to load collection memberships for jobs:', err);
    for (const job of jobs) {
      job.collectionIds = [];
    }
  }

  return jobs;
}

/**
 * Soft-delete a job by setting deleted_at, scoped to userId.
 * Returns `true` if updated, `false` if not found or already deleted.
 *
 * IMPORTANT: this intentionally keeps the row in the database so that
 * getExtractionsForUserInTimeframe() still counts it against the rate limit.
 * Users cannot bypass the extraction quota by deleting their jobs.
 */
export async function deleteJob(id: string, userId: string): Promise<boolean> {
  const { data, error } = await getClient()
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)  // only mark once; ignore if already deleted
    .select('id');

  if (error) throw wrapError(`Failed to soft-delete job ${id}`, error);
  return (data?.length ?? 0) > 0;
}

/**
 * Checks if a job has been soft-deleted (cancelled).
 */
export async function isJobDeleted(id: string): Promise<boolean> {
  const job = await getJob(id);
  return job ? job.deletedAt !== null : true;
}


/**
 * Uploads a recipe frame to private Supabase Storage as a *transient* hand-off.
 * The bytes are pulled once by the extracting device (see getRecipeFrames) and
 * then deleted; they are never persisted long-term nor exposed via a durable URL,
 * so we do not rehost third-party video content. Orphans are swept by
 * sweepOldRecipeFrames as a backstop.
 */
export async function uploadRecipeFrame(jobId: string, index: number, buffer: Buffer): Promise<void> {
  const storagePath = `${jobId}/${index}.jpg`;

  const { error: uploadError } = await getClient().storage
    .from('recipe-frames')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw new Error(`Failed to upload frame: ${uploadError.message}`);
}

/**
 * Downloads all transiently-stored frames for a job and returns them as base64
 * JPEG data URLs, ordered by frame index. Used for the one-time device hand-off.
 */
export async function getRecipeFrames(jobId: string): Promise<{ index: number; dataUrl: string }[]> {
  const { data: list, error: listError } = await getClient().storage.from('recipe-frames').list(jobId);
  if (listError || !list || list.length === 0) return [];

  const frames: { index: number; dataUrl: string }[] = [];
  for (const file of list) {
    const index = parseInt(file.name.replace(/\.jpg$/i, ''), 10);
    if (Number.isNaN(index)) continue;

    const { data: blob, error: dlError } = await getClient().storage
      .from('recipe-frames')
      .download(`${jobId}/${file.name}`);
    if (dlError || !blob) continue;

    const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    frames.push({ index, dataUrl: `data:image/jpeg;base64,${base64}` });
  }

  frames.sort((a, b) => a.index - b.index);
  return frames;
}

/** Deletes all stored frames for a job from Supabase Storage. */
export async function deleteRecipeFrames(jobId: string): Promise<void> {
  const { data, error } = await getClient().storage.from('recipe-frames').list(jobId);
  if (error || !data || data.length === 0) return;
  const paths = data.map(f => `${jobId}/${f.name}`);
  await getClient().storage.from('recipe-frames').remove(paths);
}

/**
 * Backstop cleanup: removes transiently-stored frames older than `maxAgeHours`.
 * Normally frames are deleted right after the device pulls them; this catches
 * orphans left when the device never fetched (e.g. the app was killed).
 */
export async function sweepOldRecipeFrames(maxAgeHours = 24): Promise<number> {
  const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
  const { data: folders, error } = await getClient().storage.from('recipe-frames').list('', { limit: 1000 });
  if (error || !folders || folders.length === 0) return 0;

  let removed = 0;
  for (const folder of folders) {
    // Root entries without a metadata blob are the per-job folders.
    if (!folder.name) continue;
    const { data: files, error: filesError } = await getClient().storage
      .from('recipe-frames')
      .list(folder.name);
    if (filesError || !files || files.length === 0) continue;

    const allExpired = files.every(f => {
      const ts = f.created_at ? new Date(f.created_at).getTime() : 0;
      return ts > 0 && ts < cutoff;
    });
    if (!allExpired) continue;

    const paths = files.map(f => `${folder.name}/${f.name}`);
    const { error: removeError } = await getClient().storage.from('recipe-frames').remove(paths);
    if (!removeError) removed += paths.length;
  }
  return removed;
}

// ── Feedback / bug reports ────────────────────────────────────────────────────

export interface FeedbackInput {
  type: 'bug' | 'idea';
  message: string;
  context?: unknown;
  /** Optional screenshots as data-URL or raw base64 JPEG strings. */
  screenshotsBase64?: string[];
}

/**
 * Persist an in-app bug report / feedback submission. Any attached screenshots
 * are uploaded to the private `feedback-screenshots` bucket and their long-lived
 * signed URLs are stored (as an array) alongside the report.
 */
export async function createFeedback(userId: string, input: FeedbackInput): Promise<{ id: string }> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const screenshotUrls: string[] = [];
  const shots = input.screenshotsBase64 ?? [];
  for (let index = 0; index < shots.length; index++) {
    try {
      const base64 = shots[index].replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const storagePath = `${userId}/${id}/${index}.jpg`;

      const { error: uploadError } = await getClient().storage
        .from('feedback-screenshots')
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data, error: urlError } = await getClient().storage
        .from('feedback-screenshots')
        .createSignedUrl(storagePath, 10 * 365 * 24 * 3600); // 10 years
      if (urlError || !data) throw new Error(urlError?.message || 'No signed URL');
      screenshotUrls.push(data.signedUrl);
    } catch (err: any) {
      // A failed screenshot upload must not lose the report itself.
      console.error(`Failed to upload feedback screenshot ${index}:`, err?.message || err);
    }
  }

  const { error } = await getClient()
    .from('feedback')
    .insert({
      id,
      user_id: userId,
      type: input.type,
      message: input.message,
      context: input.context ?? null,
      screenshot_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
      created_at: now,
    });

  if (error) throw wrapError('Failed to create feedback', error);
  return { id };
}

/** Check whether the Supabase database connection is healthy. */
export async function checkDbHealth(): Promise<boolean> {
  try {
    // head: true → HTTP HEAD request, no body transferred
    // limit 1  → Postgres stops after first row on PK index
    const { error } = await getClient()
      .from('jobs')
      .select('id', { head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Updates locked_at timestamp to signal a job is still actively being processed. */
export async function heartbeatJob(id: string): Promise<void> {
  const { error } = await getClient()
    .from('jobs')
    .update({ locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.warn(`Heartbeat failed for job ${id}: ${error.message}`);
}

/**
 * Reclaims jobs whose lease has expired back to 'pending' so another worker
 * can pick them up. Runs periodically instead of at startup to support
 * multiple worker instances safely.
 */
export async function reclaimExpiredJobs(timeoutMinutes: number): Promise<void> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { error, count } = await getClient()
    .from('jobs')
    .update({ status: 'pending', locked_at: null, locked_by: null, updated_at: new Date().toISOString() }, { count: 'exact' })
    .in('status', ['scraping', 'processing'])
    .lt('locked_at', cutoff);

  if (error) {
    console.error('Failed to reclaim expired jobs:', error.message);
  } else if (count && count > 0) {
    console.log(`Reclaimed ${count} expired job(s) back to pending.`);
  }
}

/** Count active (pending/scraping/processing) jobs for a user. */
export async function countActiveJobsForUser(userId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'scraping', 'processing']);

  if (error) throw wrapError('Failed to count active jobs', error);
  return count ?? 0;
}

/** Count a user's saved (non-deleted) recipes (completed cookbook entries, including remixes). */
export async function countCompletedRecipesForUser(userId: string): Promise<number> {
  const { count, error } = await getClient()
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('recipe', 'is', null)
    .is('deleted_at', null);

  if (error) throw wrapError('Failed to count completed recipes', error);
  return count ?? 0;
}

/**
 * Get all extraction jobs created by a user in the last N days (excluding remixes).
 * Failed extractions are excluded so they don't consume the user's rate-limit
 * allowance — only in-flight (pending/scraping/processing) and completed jobs count.
 */
export async function getExtractionsForUserInTimeframe(userId: string, days: number): Promise<Job[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getClient()
    .from('jobs')
    .select()
    .eq('user_id', userId)
    .is('parent_job_id', null)
    .neq('status', 'failed')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .returns<JobRow[]>();

  if (error) throw wrapError('Failed to get extractions in timeframe', error);
  return data.map(rowToJob);
}

// ── Global Settings & Caching ───────────────────────────────────────────────

const settingsCache: Record<string, { value: any; timestamp: number }> = {};

export async function getGlobalSetting<T>(key: string, defaultValue: T): Promise<T> {
  const now = Date.now();
  const cached = settingsCache[key];
  // Cache for 60 seconds
  if (cached && (now - cached.timestamp < 60000)) {
    return cached.value;
  }

  try {
    const { data, error } = await getClient()
      .from('global_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (!error && data) {
      let val: any = data.value;
      if (typeof defaultValue === 'boolean') {
        val = val === true || val === 'true';
      } else if (typeof defaultValue === 'number') {
        val = parseInt(val, 10);
        if (isNaN(val)) val = defaultValue;
      }
      settingsCache[key] = { value: val, timestamp: now };
      return val as T;
    }
  } catch (err) {
    console.warn(`Error reading global setting ${key}, using default:`, err);
  }

  return defaultValue;
}

export async function isAlphaActive(): Promise<boolean> {
  return getGlobalSetting('alpha_active', config.ALPHA_ACTIVE);
}

export async function getAlphaMaxExtractions(): Promise<number> {
  return getGlobalSetting('alpha_max_extractions_per_window', config.ALPHA_MAX_EXTRACTIONS_PER_WINDOW);
}

export async function getAlphaMaxSavedRecipes(): Promise<number> {
  return getGlobalSetting('alpha_max_saved_recipes', config.ALPHA_MAX_SAVED_RECIPES);
}

export async function getFreeMaxExtractions(): Promise<number> {
  return getGlobalSetting('free_max_extractions_per_window', config.FREE_MAX_EXTRACTIONS_PER_WINDOW);
}

export async function getFreeMaxSavedRecipes(): Promise<number> {
  return getGlobalSetting('free_max_saved_recipes', config.FREE_MAX_SAVED_RECIPES);
}

export async function getPremiumMaxExtractions(): Promise<number> {
  return getGlobalSetting('premium_max_extractions_per_window', config.PREMIUM_MAX_EXTRACTIONS_PER_WINDOW);
}

export async function getPremiumMaxSavedRecipes(): Promise<number> {
  return getGlobalSetting('premium_max_saved_recipes', -1);
}

export async function getFreeMaxConcurrentExtractions(): Promise<number> {
  return getGlobalSetting('free_max_concurrent_extractions', config.FREE_MAX_CONCURRENT_EXTRACTIONS);
}

export async function getPremiumMaxConcurrentExtractions(): Promise<number> {
  return getGlobalSetting('premium_max_concurrent_extractions', config.PREMIUM_MAX_CONCURRENT_EXTRACTIONS);
}

export async function getMaxVideoDurationSeconds(): Promise<number> {
  return getGlobalSetting('max_video_duration_seconds', config.MAX_VIDEO_DURATION_SECONDS);
}

export interface GlobalSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

/** Fetch all global settings. */
export async function getAllGlobalSettings(): Promise<GlobalSetting[]> {
  const { data, error } = await getClient()
    .from('global_settings')
    .select('*')
    .order('key', { ascending: true });

  if (error) throw wrapError('Failed to fetch global settings', error);
  return data || [];
}

/** Update multiple global settings in bulk and invalidate cache. */
export async function updateGlobalSettings(settings: Record<string, string>): Promise<void> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await getClient()
    .from('global_settings')
    .upsert(rows);

  if (error) throw wrapError('Failed to update global settings', error);

  // Clear internal cache for updated settings
  for (const key of Object.keys(settings)) {
    delete settingsCache[key];
  }
}

/** Retrieve all feedback submissions ordered by creation date. */
export async function getAllFeedback(): Promise<any[]> {
  const { data, error } = await getClient()
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw wrapError('Failed to fetch all feedback', error);
  return data || [];
}

/** Set whether a job is favorited, scoped to userId. */
export async function setFavorite(jobId: string, userId: string, value: boolean): Promise<void> {
  const { error } = await getClient()
    .from('jobs')
    .update({ is_favorite: value, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (error) throw wrapError(`Failed to set favorite for job ${jobId}`, error);
}

/** Set custom flags for a job, scoped to userId. */
export async function setFlags(jobId: string, userId: string, flags: string[]): Promise<void> {
  const { error } = await getClient()
    .from('jobs')
    .update({ flags, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (error) throw wrapError(`Failed to set flags for job ${jobId}`, error);
}

/** List all collections for a user. */
export async function listCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await getClient()
    .from('collections')
    .select()
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw wrapError('Failed to list collections', error);

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    emoji: row.emoji,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/** Create a new collection for a user. */
export async function createCollection(userId: string, col: Partial<Collection>): Promise<Collection> {
  const now = new Date().toISOString();
  const id = col.id || randomUUID();
  const position = col.position ?? 0;

  const { data, error } = await getClient()
    .from('collections')
    .insert({
      id,
      user_id: userId,
      name: col.name!,
      emoji: col.emoji || null,
      position,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw wrapError('Failed to create collection', error);

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    emoji: data.emoji,
    position: data.position,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/** Update an existing collection for a user. */
export async function updateCollection(id: string, userId: string, col: Partial<Collection>): Promise<Collection> {
  const now = new Date().toISOString();
  const updates: Record<string, any> = { updated_at: now };
  if (col.name !== undefined) updates.name = col.name;
  if (col.emoji !== undefined) updates.emoji = col.emoji;
  if (col.position !== undefined) updates.position = col.position;

  const { data, error } = await getClient()
    .from('collections')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw wrapError(`Failed to update collection ${id}`, error);

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    emoji: data.emoji,
    position: data.position,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/** Delete a collection, scoped to user. */
export async function deleteCollection(id: string, userId: string): Promise<boolean> {
  const { error, count } = await getClient()
    .from('collections')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw wrapError(`Failed to delete collection ${id}`, error);
  return (count ?? 0) > 0;
}

/** Get collection membership mappings { [jobId]: string[] } for a user. */
export async function getCollectionMembership(userId: string): Promise<Record<string, string[]>> {
  const { data, error } = await getClient()
    .from('recipe_collections')
    .select('job_id, collection_id')
    .eq('user_id', userId);

  if (error) throw wrapError('Failed to get collection membership', error);

  const mapping: Record<string, string[]> = {};
  if (data) {
    for (const row of data) {
      mapping[row.job_id] ??= [];
      mapping[row.job_id].push(row.collection_id);
    }
  }
  return mapping;
}

/** Set collection memberships for a recipe. */
export async function setRecipeCollections(jobId: string, userId: string, collectionIds: string[]): Promise<void> {
  // Delete existing memberships for this recipe
  const { error: deleteError } = await getClient()
    .from('recipe_collections')
    .delete()
    .eq('job_id', jobId)
    .eq('user_id', userId);

  if (deleteError) throw wrapError('Failed to clear old recipe collections', deleteError);

  // Insert new memberships
  if (collectionIds.length > 0) {
    const inserts = collectionIds.map(cid => ({
      collection_id: cid,
      job_id: jobId,
      user_id: userId
    }));
    const { error: insertError } = await getClient()
      .from('recipe_collections')
      .insert(inserts);

    if (insertError) throw wrapError('Failed to save new recipe collections', insertError);
  }
}

/** Retrieve database job execution and queue metrics. */
export async function getJobMetrics(
  since: Date | null = null,
  windowDays: number | null = 14,
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
  let query = getClient()
    .from('jobs')
    .select('status, created_at, media_bytes');

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data: allJobs, error } = await query;

  if (error) throw wrapError('Failed to fetch jobs for metrics', error);

  let total = 0;
  let completed = 0;
  let failed = 0;
  let pending = 0;
  let processing = 0;
  let mediaBytes = 0;
  const dailyCounts: Record<string, number> = {};

  if (allJobs) {
    total = allJobs.length;
    for (const job of allJobs) {
      if (job.status === 'completed') completed++;
      else if (job.status === 'failed') failed++;
      else if (job.status === 'pending') pending++;
      else if (job.status === 'processing') processing++;

      // media_bytes comes back as a string for bigint via PostgREST → coerce.
      mediaBytes += Number((job as any).media_bytes ?? 0) || 0;

      if (job.created_at) {
        const dateStr = job.created_at.split('T')[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      }
    }
  }

  // Build the daily stats array. For a bounded window, emit a dense
  // zero-filled array of the last `windowDays` calendar days. For an
  // unbounded ("all") window, emit only the dates that actually have data,
  // sorted ascending, to avoid an unboundedly long array.
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

// ── OTA app bundles ──────────────────────────────────────────────────────────

/** Row shape of the app_bundles table (snake_case columns). */
export interface AppBundleRow {
  id: string;
  channel: 'production' | 'alpha';
  version: string;
  storage_path: string;
  checksum: string;
  min_version_code: number;
  max_version_code: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
}

/**
 * Fetch the active OTA bundle for a channel that is compatible with the given
 * native versionCode: min_version_code <= versionCode <= max_version_code
 * (a null max means open-ended). Returns null when no compatible bundle is
 * active — a partial unique index guarantees at most one active row per channel.
 */
export async function getActiveAppBundle(channel: string, versionCode: number): Promise<AppBundleRow | null> {
  const { data, error } = await getClient()
    .from('app_bundles')
    .select('*')
    .eq('channel', channel)
    .eq('active', true)
    .lte('min_version_code', versionCode)
    .or(`max_version_code.is.null,max_version_code.gte.${versionCode}`)
    .maybeSingle<AppBundleRow>();

  if (error) throw wrapError('Failed to fetch active app bundle', error);
  return data ?? null;
}

/** List all OTA bundles (optionally filtered by channel), newest first. */
export async function listAppBundles(channel?: string): Promise<AppBundleRow[]> {
  let query = getClient()
    .from('app_bundles')
    .select('*')
    .order('created_at', { ascending: false });
  if (channel) query = query.eq('channel', channel);

  const { data, error } = await query.returns<AppBundleRow[]>();
  if (error) throw wrapError('Failed to list app bundles', error);
  return data || [];
}

/**
 * Set a bundle's active flag. Activating deactivates the channel's currently
 * active bundle first — the partial unique index allows at most one active
 * bundle per channel, so the order matters.
 */
export async function setAppBundleActive(id: string, active: boolean): Promise<AppBundleRow> {
  const { data: row, error: fetchError } = await getClient()
    .from('app_bundles')
    .select('*')
    .eq('id', id)
    .single<AppBundleRow>();

  if (fetchError) {
    if (isNoRowsError(fetchError)) throw new Error(`App bundle ${id} not found`);
    throw wrapError(`Failed to fetch app bundle ${id}`, fetchError);
  }

  if (active) {
    const { error: deactivateError } = await getClient()
      .from('app_bundles')
      .update({ active: false })
      .eq('channel', row.channel)
      .eq('active', true)
      .neq('id', id);
    if (deactivateError) throw wrapError('Failed to deactivate current active bundle', deactivateError);
  }

  const { data, error } = await getClient()
    .from('app_bundles')
    .update({ active })
    .eq('id', id)
    .select()
    .single<AppBundleRow>();

  if (error) throw wrapError(`Failed to set app bundle ${id} active=${active}`, error);
  return data;
}

/**
 * Count successfully extracted recipes (completed jobs) grouped by user. When
 * `since` is provided, only jobs created on/after that timestamp are counted;
 * otherwise all completed jobs are aggregated ("all-time"). Users with zero
 * extractions in the window are omitted, and the result is sorted descending
 * by count. The caller is responsible for resolving `user_id` → email.
 */
export async function getExtractionsPerUser(
  since: Date | null = null,
): Promise<{ userId: string; count: number }[]> {
  let query = getClient()
    .from('jobs')
    .select('user_id')
    .eq('status', 'completed');

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) throw wrapError('Failed to fetch per-user extraction metrics', error);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const uid = (row as any).user_id;
    if (!uid) continue;
    counts[uid] = (counts[uid] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([userId, count]) => ({ userId, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface FailedJobDetails {
  id: string;
  url: string;
  error: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** Retrieve detailed information on failed jobs within the specified time window. */
export async function getFailedJobs(
  since: Date | null = null,
  limit: number = 50
): Promise<FailedJobDetails[]> {
  let query = getClient()
    .from('jobs')
    .select('id, url, error, user_id, created_at, updated_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) throw wrapError('Failed to fetch failed jobs for metrics', error);

  return (data || []).map((row: any) => ({
    id: row.id,
    url: row.url,
    error: row.error,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ── Smart AI push notifications ──────────────────────────────────────────────

export interface NotificationLogEntry {
  userId: string;
  category: string;
  type: string;
  jobId?: string | null;
  title?: string | null;
}

export interface NotificationLogRow {
  sentAt: string;
  category: string;
  type: string;
  jobId: string | null;
}

export interface NotificationUser {
  id: string;
  metadata: Record<string, any>;
}

/**
 * Register or refresh an FCM device token for a user. The token is the primary
 * key (globally unique in FCM); if the same physical device re-registers under a
 * new user we move the row to that user and clear any `disabled` flag.
 */
export async function upsertPushToken(userId: string, token: string, platform = 'android'): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getClient()
    .from('push_tokens')
    .upsert(
      { token, user_id: userId, platform, disabled: false, last_seen_at: now },
      { onConflict: 'token' },
    );
  if (error) throw wrapError('Failed to upsert push token', error);
}

/** Mark a token as disabled (called when FCM reports it UNREGISTERED). Never throws for a missing row. */
export async function disablePushToken(token: string): Promise<void> {
  const { error } = await getClient()
    .from('push_tokens')
    .update({ disabled: true })
    .eq('token', token);
  if (error) throw wrapError('Failed to disable push token', error);
}

/** Remove a single token for a user (opt-out / logout on that device). */
export async function deletePushToken(userId: string, token: string): Promise<void> {
  const { error } = await getClient()
    .from('push_tokens')
    .delete()
    .eq('token', token)
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to delete push token', error);
}

/** Remove every token for a user (full account opt-out). */
export async function deletePushTokensForUser(userId: string): Promise<void> {
  const { error } = await getClient()
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to delete push tokens for user', error);
}

/** All active (non-disabled) FCM tokens for a user. */
export async function getActivePushTokens(userId: string): Promise<string[]> {
  const { data, error } = await getClient()
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('disabled', false);
  if (error) throw wrapError('Failed to load push tokens', error);
  return (data || []).map((row: any) => row.token as string);
}

/** Record a delivered notification (drives frequency capping + anti-repeat dedupe). */
export async function insertNotificationLog(entry: NotificationLogEntry): Promise<void> {
  const { error } = await getClient()
    .from('notification_log')
    .insert({
      user_id: entry.userId,
      category: entry.category,
      type: entry.type,
      job_id: entry.jobId ?? null,
      title: entry.title ?? null,
    });
  if (error) throw wrapError('Failed to insert notification log', error);
}

/** Recent notification-log rows for a user within the last `sinceDays` days (newest first). */
export async function getRecentNotifications(userId: string, sinceDays: number): Promise<NotificationLogRow[]> {
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getClient()
    .from('notification_log')
    .select('sent_at, category, type, job_id')
    .eq('user_id', userId)
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: false });
  if (error) throw wrapError('Failed to load recent notifications', error);
  return (data || []).map((row: any) => ({
    sentAt: row.sent_at,
    category: row.category,
    type: row.type,
    jobId: row.job_id,
  }));
}

/**
 * List users who have push notifications enabled, resolved from Supabase Auth
 * user_metadata. Pages through the Auth admin API (1000 users/page). We filter
 * on `notifications_enabled === true` here so the caller only iterates opted-in
 * users; a second pass still checks per-category opt-in.
 */
export async function listNotificationUsers(): Promise<NotificationUser[]> {
  const client = getClient();
  const result: NotificationUser[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users for notifications: ${error.message}`);
    const users = data?.users ?? [];
    for (const user of users) {
      const meta = (user.user_metadata ?? {}) as Record<string, any>;
      if (meta.notifications_enabled === true) {
        result.push({ id: user.id, metadata: meta });
      }
    }
    if (users.length < perPage) break;
  }
  return result;
}







// ── Gamification ─────────────────────────────────────────────────────────────

/**
 * Reads the tunable point formula from `global_settings` (60s cache, shared with
 * getGlobalSetting) merged over the code defaults. Falls back to
 * DEFAULT_GAMIFICATION_CONFIG when the row is missing or unparseable.
 */
export async function getGamificationConfig(): Promise<GamificationConfig> {
  const key = 'gamification_config';
  const now = Date.now();
  const cached = settingsCache[key];
  if (cached && now - cached.timestamp < 60000) {
    return cached.value as GamificationConfig;
  }
  try {
    const { data, error } = await getClient()
      .from('global_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!error && data?.value) {
      const parsed = { ...DEFAULT_GAMIFICATION_CONFIG, ...JSON.parse(data.value as string) } as GamificationConfig;
      settingsCache[key] = { value: parsed, timestamp: now };
      return parsed;
    }
  } catch (err) {
    console.warn('Error reading gamification_config, using defaults:', err);
  }
  return DEFAULT_GAMIFICATION_CONFIG;
}

interface UserStatsRow {
  user_id: string;
  xp: number | string;
  level: number;
  coins: number | string;
  current_streak: number;
  longest_streak: number;
  last_cook_date: string | null;
  total_cooks: number;
}

function rowToUserStats(row: UserStatsRow): UserStats {
  return {
    userId: row.user_id,
    xp: Number(row.xp),
    level: row.level,
    coins: Number(row.coins),
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastCookDate: row.last_cook_date,
    totalCooks: row.total_cooks,
  };
}

/** Zero-value stats for a user who has never cooked. */
export function emptyUserStats(userId: string): UserStats {
  return {
    userId, xp: 0, level: 1, coins: 0,
    currentStreak: 0, longestStreak: 0, lastCookDate: null, totalCooks: 0,
  };
}

/** Fetch a user's aggregate stats, or zero-values if none exist yet. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await getClient()
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw wrapError(`Failed to get user_stats for ${userId}`, error);
  return data ? rowToUserStats(data as UserStatsRow) : emptyUserStats(userId);
}

/** How many times this user has already cooked a given job (repetition factor). */
/**
 * How many times this user has already cooked a given job (repetition factor).
 * When `windowDays` is provided (>0), only cooks within that many days of *now*
 * count — so a weekly favorite resets to full value instead of being punished
 * forever. A value of 0/undefined counts all-time cooks (legacy behavior).
 */
export async function getCookCountForJob(
  userId: string,
  jobId: string,
  windowDays?: number,
): Promise<number> {
  let query = getClient()
    .from('cook_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('job_id', jobId);
  if (windowDays && windowDays > 0) {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('cooked_at', since);
  }
  const { count, error } = await query;
  if (error) throw wrapError('Failed to count cook events for job', error);
  return count ?? 0;
}

/** How many cooks this user logged since `sinceIso` (start of day), for the soft-cap. */
export async function getCookCountSince(userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await getClient()
    .from('cook_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('cooked_at', sinceIso);
  if (error) throw wrapError('Failed to count recent cook events', error);
  return count ?? 0;
}

/** The most recent cook_event for a user (velocity / duplicate guards). */
export async function getLastCookEvent(
  userId: string,
): Promise<{ jobId: string | null; cookedAt: string } | null> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('job_id, cooked_at')
    .eq('user_id', userId)
    .order('cooked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw wrapError('Failed to fetch last cook event', error);
  if (!data) return null;
  return { jobId: (data as any).job_id, cookedAt: (data as any).cooked_at };
}

export interface InsertCookEventArgs {
  userId: string;
  jobId: string;
  xp: number;
  coins: number;
  hasPhoto: boolean;
  photoPath: string | null;
  verified: boolean;
  leaderboardEligible: boolean;
  trustScore: number;
  viaCookingMode: boolean;
  timerElapsed: boolean;
}

/** Insert an append-only cook_event row and return its id. */
export async function insertCookEvent(args: InsertCookEventArgs): Promise<string> {
  const id = randomUUID();
  const { error } = await getClient().from('cook_events').insert({
    id,
    user_id: args.userId,
    job_id: args.jobId,
    xp_awarded: args.xp,
    coins_awarded: args.coins,
    has_photo: args.hasPhoto,
    photo_path: args.photoPath,
    verified: args.verified,
    leaderboard_eligible: args.leaderboardEligible,
    trust_score: args.trustScore,
    via_cooking_mode: args.viaCookingMode,
    timer_elapsed: args.timerElapsed,
  });
  if (error) throw wrapError('Failed to insert cook event', error);
  return id;
}

export interface CookPhotoItem {
  id: string;
  jobId: string;
  photoUrl: string;
  cookedAt: string;
  recipeTitle?: string;
}

/** Per-job cook history for the recipe detail view. */
export interface CookHistoryItem {
  id: string;
  cookedAt: string;
  xpAwarded: number;
  coinsAwarded: number;
  hasPhoto: boolean;
  photoUrl: string | null;
  verified: boolean;
  viaCookingMode: boolean;
  timerElapsed: boolean;
}

export interface CookHistory {
  count: number;
  firstCookedAt: string | null;
  lastCookedAt: string | null;
  items: CookHistoryItem[];
}

/**
 * All cook events for a single job, newest first, with signed photo URLs.
 * Drives the recipe-detail "already cooked" chip + timeline.
 */
export async function getCookHistoryForJob(
  userId: string,
  jobId: string,
  limit: number = 20,
): Promise<CookHistory> {
  const { data, error, count } = await getClient()
    .from('cook_events')
    .select('id, cooked_at, xp_awarded, coins_awarded, has_photo, photo_path, verified, via_cooking_mode, timer_elapsed', { count: 'exact' })
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('cooked_at', { ascending: false })
    .limit(limit);

  if (error) throw wrapError('Failed to fetch cook history for job', error);
  if (!data || data.length === 0) {
    return { count: 0, firstCookedAt: null, lastCookedAt: null, items: [] };
  }

  const items = await Promise.all(
    data.map(async (row: any): Promise<CookHistoryItem> => {
      let photoUrl: string | null = null;
      const photoPath = row.photo_path;
      if (photoPath && !photoPath.startsWith('http') && !photoPath.startsWith('data:')) {
        try {
          const { data: signedData } = await getClient()
            .storage
            .from('cook-photos')
            .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
          photoUrl = signedData?.signedUrl ?? getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
        } catch {
          photoUrl = getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
        }
      } else if (photoPath) {
        photoUrl = photoPath;
      }
      return {
        id: row.id,
        cookedAt: row.cooked_at,
        xpAwarded: row.xp_awarded ?? 0,
        coinsAwarded: row.coins_awarded ?? 0,
        hasPhoto: row.has_photo,
        photoUrl,
        verified: row.verified ?? false,
        viaCookingMode: row.via_cooking_mode,
        timerElapsed: row.timer_elapsed,
      };
    }),
  );

  return {
    count: count ?? data.length,
    firstCookedAt: items[items.length - 1]?.cookedAt ?? null,
    lastCookedAt: items[0]?.cookedAt ?? null,
    items,
  };
}

/** Get recent verified cook photos for a user. */
export async function getRecentCookPhotos(userId: string, limit: number = 10): Promise<CookPhotoItem[]> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('id, job_id, photo_path, cooked_at')
    .eq('user_id', userId)
    .not('photo_path', 'is', null)
    .neq('photo_path', '')
    .order('cooked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentCookPhotos] Query error:', error);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Fetch job titles for these job_ids
  const jobIds = Array.from(new Set(data.map((r: any) => r.job_id).filter(Boolean)));
  let jobTitleMap: Record<string, string> = {};

  if (jobIds.length > 0) {
    const { data: jobsData } = await getClient()
      .from('jobs')
      .select('id, recipe')
      .in('id', jobIds);

    if (jobsData) {
      for (const j of jobsData as any[]) {
        if (j.id && j.recipe?.title) {
          jobTitleMap[j.id] = j.recipe.title;
        }
      }
    }
  }

  return Promise.all(
    data.map(async (row: any) => {
      const photoPath = row.photo_path;
      let photoUrl = photoPath;
      if (photoPath && !photoPath.startsWith('http') && !photoPath.startsWith('data:')) {
        try {
          const { data: signedData } = await getClient()
            .storage
            .from('cook-photos')
            .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
          if (signedData?.signedUrl) {
            photoUrl = signedData.signedUrl;
          } else {
            photoUrl = getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
          }
        } catch {
          photoUrl = getClient().storage.from('cook-photos').getPublicUrl(photoPath).data.publicUrl;
        }
      }
      const recipeTitle = jobTitleMap[row.job_id] || 'Gekochtes Gericht';
      return {
        id: row.id,
        jobId: row.job_id,
        photoUrl,
        cookedAt: row.cooked_at,
        recipeTitle,
      };
    })
  );
}

export interface LedgerRow {
  deltaXp: number;
  deltaCoins: number;
  reason: string;
}

/** Append one row per grant to the point ledger. */
export async function insertLedgerRows(
  userId: string,
  cookEventId: string,
  rows: LedgerRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    id: randomUUID(),
    user_id: userId,
    cook_event_id: cookEventId,
    delta_xp: r.deltaXp,
    delta_coins: r.deltaCoins,
    reason: r.reason,
  }));
  const { error } = await getClient().from('point_ledger').insert(payload);
  if (error) throw wrapError('Failed to insert ledger rows', error);
}

/** Upsert the user's aggregate stats after a cook. */
export async function upsertUserStats(stats: UserStats): Promise<void> {
  const { error } = await getClient().from('user_stats').upsert({
    user_id: stats.userId,
    xp: stats.xp,
    level: stats.level,
    coins: stats.coins,
    current_streak: stats.currentStreak,
    longest_streak: stats.longestStreak,
    last_cook_date: stats.lastCookDate,
    total_cooks: stats.totalCooks,
    updated_at: new Date().toISOString(),
  });
  if (error) throw wrapError('Failed to upsert user_stats', error);
}

/** The set of badge keys a user already holds. */
export async function getUserBadges(userId: string): Promise<string[]> {
  const { data, error } = await getClient()
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to fetch user badges', error);
  return (data || []).map((r: any) => r.badge_key);
}

/** Detailed badge list (key + earned timestamp) for the progress tab. */
export async function getUserBadgesDetailed(
  userId: string,
): Promise<{ key: string; earnedAt: string }[]> {
  const { data, error } = await getClient()
    .from('user_badges')
    .select('badge_key, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: true });
  if (error) throw wrapError('Failed to fetch detailed user badges', error);
  return (data || []).map((r: any) => ({ key: r.badge_key, earnedAt: r.earned_at }));
}

/** Insert newly earned badges; idempotent via the (user_id, badge_key) PK. */
export async function awardBadges(userId: string, badgeKeys: string[]): Promise<void> {
  if (badgeKeys.length === 0) return;
  const rows = badgeKeys.map((k) => ({ user_id: userId, badge_key: k }));
  const { error } = await getClient()
    .from('user_badges')
    .upsert(rows, { onConflict: 'user_id,badge_key', ignoreDuplicates: true });
  if (error) throw wrapError('Failed to award badges', error);
}

/**
 * Count of distinct recipes a user has ever cooked (variety badges). PostgREST
 * has no COUNT(DISTINCT); per-user cook volume is small, so we dedupe in memory.
 */
export async function getDistinctCookedRecipeCount(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('job_id')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to count distinct cooked recipes', error);
  const set = new Set((data || []).map((r: any) => r.job_id).filter(Boolean));
  return set.size;
}

/** Count of cooks where the in-app timer was used (timer_elapsed = true). */
export async function getTimerCookCount(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('id')
    .eq('user_id', userId)
    .eq('timer_elapsed', true);
  if (error) throw wrapError('Failed to count timer cooks', error);
  return (data || []).length;
}

/**
 * Count of cooks that happened on a weekend (Saturday = 6, Sunday = 0 in UTC).
 * We dedupe in memory since per-user cook volume is small.
 */
export async function getWeekendCookCount(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('cooked_at')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to count weekend cooks', error);
  return (data || []).filter((r: any) => {
    const day = new Date(r.cooked_at).getUTCDay();
    return day === 0 || day === 6;
  }).length;
}

/**
 * Maximum cook count for a single recipe (job_id) by this user.
 * Returns 0 if no cooks found.
 */
export async function getMaxCooksForSameRecipe(userId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('cook_events')
    .select('job_id')
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to count same-recipe cooks', error);
  const counts = new Map<string, number>();
  for (const r of (data || []) as any[]) {
    if (r.job_id) counts.set(r.job_id, (counts.get(r.job_id) ?? 0) + 1);
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}

/** Upload a finished-dish photo (base64) to the private cook-photos bucket. */
export async function uploadCookPhoto(
  userId: string,
  cookId: string,
  base64: string,
): Promise<string> {
  const clean = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(clean, 'base64');
  const storagePath = `${userId}/${cookId}.jpg`;
  const { error } = await getClient().storage
    .from('cook-photos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw wrapError('Failed to upload cook photo', error as any);
  return storagePath;
}

// ── Social: profiles ─────────────────────────────────────────────────────────

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    friendCode: row.friend_code,
  };
}

// Crockford-ish base32 without ambiguous chars (no I, L, O, 0, 1).
const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateFriendCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += FRIEND_CODE_ALPHABET[Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length)];
  }
  return out;
}

/** Fetch a user's profile, or null if none exists yet. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getClient()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw wrapError(`Failed to get profile for ${userId}`, error);
  return data ? rowToProfile(data as ProfileRow) : null;
}

/**
 * Ensure a profile row exists for the user, creating one on first access with a
 * seeded display name/avatar and a unique friend code (retried on collision).
 */
export async function ensureProfile(
  userId: string,
  seed: { displayName?: string | null; avatarUrl?: string | null },
): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const displayName = (seed.displayName || '').trim().slice(0, 40) || 'Chef';

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await getClient()
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        avatar_url: seed.avatarUrl ?? null,
        friend_code: generateFriendCode(6),
      })
      .select('*')
      .single();

    if (!error && data) return rowToProfile(data as ProfileRow);

    // A unique violation is either the user_id PK (a concurrent create won the
    // race → return that) or a friend_code collision (→ retry a new code).
    if (error && (error as any).code === PG_UNIQUE_VIOLATION) {
      const now = await getProfile(userId);
      if (now) return now;
      continue;
    }
    if (error) throw wrapError('Failed to create profile', error);
  }
  throw new Error('Failed to allocate a unique friend code after several attempts');
}

/** Update the user's display name (returns the updated profile). */
export async function updateDisplayName(userId: string, name: string): Promise<Profile> {
  const { data, error } = await getClient()
    .from('profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw wrapError('Failed to update display name', error);
  if (!data) throw wrapError('Profile not found', { message: 'no profile row' } as any);
  return rowToProfile(data as ProfileRow);
}

/** Resolve a friend code to its profile, or null if unknown. Case-insensitive. */
export async function findProfileByFriendCode(code: string): Promise<Profile | null> {
  const { data, error } = await getClient()
    .from('profiles')
    .select('*')
    .eq('friend_code', code.toUpperCase())
    .maybeSingle();
  if (error) throw wrapError('Failed to look up friend code', error);
  return data ? rowToProfile(data as ProfileRow) : null;
}

/** Batch-fetch profiles by user id, keyed by user id. */
export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (ids.length === 0) return map;
  const { data, error } = await getClient().from('profiles').select('*').in('user_id', ids);
  if (error) throw wrapError('Failed to batch-fetch profiles', error);
  for (const row of (data || []) as ProfileRow[]) map.set(row.user_id, rowToProfile(row));
  return map;
}

// ── Social: friendships ──────────────────────────────────────────────────────

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  responded_at: string | null;
}

/** Accepted friends of a user (both directions): the friend id + friendship id. */
export async function getAcceptedFriends(
  userId: string,
): Promise<{ friendId: string; friendshipId: string }[]> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw wrapError('Failed to fetch friends', error);
  return (data || []).map((r: any) => ({
    friendshipId: r.id,
    friendId: r.requester_id === userId ? r.addressee_id : r.requester_id,
  }));
}

/** Pending requests addressed to the user: friendship id + requester id. */
export async function getIncomingRequests(
  userId: string,
): Promise<{ friendshipId: string; requesterId: string }[]> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', userId)
    .eq('status', 'pending');
  if (error) throw wrapError('Failed to fetch friend requests', error);
  return (data || []).map((r: any) => ({ friendshipId: r.id, requesterId: r.requester_id }));
}

/** Any friendship row between two users (either direction), preferring accepted. */
export async function findFriendshipBetween(
  a: string,
  b: string,
): Promise<FriendshipRow | null> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('*')
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`);
  if (error) throw wrapError('Failed to look up friendship', error);
  const rows = (data || []) as FriendshipRow[];
  if (rows.length === 0) return null;
  return rows.find((r) => r.status === 'accepted') ?? rows[0];
}

export async function getFriendshipById(id: string): Promise<FriendshipRow | null> {
  const { data, error } = await getClient()
    .from('friendships')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw wrapError('Failed to get friendship', error);
  return (data as FriendshipRow) ?? null;
}

export async function createFriendship(
  requesterId: string,
  addresseeId: string,
  status: 'pending' | 'accepted',
): Promise<FriendshipRow> {
  const { data, error } = await getClient()
    .from('friendships')
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status,
      responded_at: status === 'accepted' ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (error) throw wrapError('Failed to create friendship', error);
  return data as FriendshipRow;
}

export async function acceptFriendship(id: string): Promise<void> {
  const { error } = await getClient()
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw wrapError('Failed to accept friendship', error);
}

export async function deleteFriendship(id: string): Promise<void> {
  const { error } = await getClient().from('friendships').delete().eq('id', id);
  if (error) throw wrapError('Failed to delete friendship', error);
}

// ── Social: leaderboard data ─────────────────────────────────────────────────

/** Batch-fetch user_stats by id, keyed by user id (missing users omitted). */
export async function getUserStatsForIds(ids: string[]): Promise<Map<string, UserStats>> {
  const map = new Map<string, UserStats>();
  if (ids.length === 0) return map;
  const { data, error } = await getClient().from('user_stats').select('*').in('user_id', ids);
  if (error) throw wrapError('Failed to batch-fetch user_stats', error);
  for (const row of (data || []) as UserStatsRow[]) map.set(row.user_id, rowToUserStats(row));
  return map;
}

/** Sum of point_ledger XP per user since `sinceIso` (weekly leaderboard), via RPC. */
export async function getWeeklyXp(userIds: string[], sinceIso: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;
  const { data, error } = await getClient().rpc('weekly_xp_for_users', {
    uids: userIds,
    since: sinceIso,
  });
  if (error) throw wrapError('Failed to fetch weekly xp', error);
  for (const row of (data || []) as { user_id: string; xp: number }[]) {
    map.set(row.user_id, Number(row.xp));
  }
  return map;
}
