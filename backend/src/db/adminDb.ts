import { randomUUID } from 'node:crypto';
import { getClient, wrapError, isNoRowsError } from './client.js';
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


export async function createFeedback(
  userId: string,
  input: FeedbackInput
): Promise<{ id: string }> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const screenshotUrls: string[] = [];
  const shots = input.screenshotsBase64 ?? [];
  for (let index = 0; index < shots.length; index++) {
    try {
      const base64 = shots[index].replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const storagePath = `${userId}/${id}/${index}.jpg`;

      const { error: uploadError } = await getClient()
        .storage.from('feedback-screenshots')
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data, error: urlError } = await getClient()
        .storage.from('feedback-screenshots')
        .createSignedUrl(storagePath, 10 * 365 * 24 * 3600);
      if (urlError || !data) throw new Error(urlError?.message || 'No signed URL');
      screenshotUrls.push(data.signedUrl);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to upload feedback screenshot ${index}:`, errMsg);
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



export async function getAllFeedback(): Promise<FeedbackRow[]> {
  const { data, error } = await getClient()
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw wrapError('Failed to fetch all feedback', error);
  return (data || []) as FeedbackRow[];
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
  let query = getClient().from('jobs').select('status, created_at, media_bytes');

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
    for (const job of allJobs as Array<{ status: string; created_at: string; media_bytes?: number | string | null }>) {
      if (job.status === 'completed') completed++;
      else if (job.status === 'failed') failed++;
      else if (job.status === 'pending') pending++;
      else if (job.status === 'processing') processing++;

      mediaBytes += Number(job.media_bytes ?? 0) || 0;

      if (job.created_at) {
        const dateStr = job.created_at.split('T')[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      }
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



export async function getActiveAppBundle(
  channel: string,
  versionCode: number
): Promise<AppBundleRow | null> {
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

export async function getExtractionsPerUser(
  since: Date | null = null
): Promise<{ userId: string; count: number }[]> {
  let query = getClient().from('jobs').select('user_id').eq('status', 'completed');

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) throw wrapError('Failed to fetch per-user extraction metrics', error);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ user_id?: string | null }>) {
    const uid = row.user_id;
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
  let query = getClient()
    .from('jobs')
    .select('id, source_url, error, user_id, created_at, updated_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) throw wrapError('Failed to fetch failed jobs for metrics', error);

  return (
    (data || []) as Array<{
      id: string;
      source_url: string;
      error: string | null;
      user_id: string;
      created_at: string;
      updated_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    url: row.source_url,
    error: row.error,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}



export async function upsertPushToken(
  userId: string,
  token: string,
  platform = 'android'
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getClient()
    .from('push_tokens')
    .upsert(
      { token, user_id: userId, platform, disabled: false, last_seen_at: now },
      { onConflict: 'token' }
    );
  if (error) throw wrapError('Failed to upsert push token', error);
}

export async function disablePushToken(token: string): Promise<void> {
  const { error } = await getClient()
    .from('push_tokens')
    .update({ disabled: true })
    .eq('token', token);
  if (error) throw wrapError('Failed to disable push token', error);
}

export async function deletePushToken(userId: string, token: string): Promise<void> {
  const { error } = await getClient()
    .from('push_tokens')
    .delete()
    .eq('token', token)
    .eq('user_id', userId);
  if (error) throw wrapError('Failed to delete push token', error);
}

export async function deletePushTokensForUser(userId: string): Promise<void> {
  const { error } = await getClient().from('push_tokens').delete().eq('user_id', userId);
  if (error) throw wrapError('Failed to delete push tokens for user', error);
}

export async function getActivePushTokens(userId: string): Promise<string[]> {
  const { data, error } = await getClient()
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('disabled', false);
  if (error) throw wrapError('Failed to load push tokens', error);
  return ((data || []) as Array<{ token: string }>).map((row) => row.token);
}

export async function insertNotificationLog(entry: NotificationLogEntry): Promise<void> {
  const { error } = await getClient()
    .from('notification_log')
    .insert({
      user_id: entry.userId,
      category: entry.category,
      type: entry.type,
      recipe_id: entry.recipeId ?? null,
      title: entry.title ?? null,
    });
  if (error) throw wrapError('Failed to insert notification log', error);
}

export async function getRecentNotifications(
  userId: string,
  sinceDays: number
): Promise<NotificationLogRow[]> {
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getClient()
    .from('notification_log')
    .select('sent_at, category, type, recipe_id')
    .eq('user_id', userId)
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: false });
  if (error) throw wrapError('Failed to load recent notifications', error);
  return (
    (data || []) as Array<{
      sent_at: string;
      category: string;
      type: string;
      recipe_id: string | null;
    }>
  ).map((row) => ({
    sentAt: row.sent_at,
    category: row.category,
    type: row.type,
    recipeId: row.recipe_id,
  }));
}

export async function listNotificationUsers(): Promise<NotificationUser[]> {
  const client = getClient();
  const result: NotificationUser[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users for notifications: ${error.message}`);
    const users = data?.users ?? [];
    for (const user of users) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      if (meta.notifications_enabled === true) {
        result.push({ id: user.id, metadata: meta });
      }
    }
    if (users.length < perPage) break;
  }
  return result;
}
