import { config } from '../config.js';
import {
  getLibrary,
  listCollections,
  getActivePushTokens,
  getRecentNotifications,
  insertNotificationLog,
  disablePushToken,
  listNotificationUsers,
  type NotificationUser,
} from '../db.js';
import { generateNotificationCopy } from '../gemini.js';
import { isFcmConfigured, sendToToken, type FcmMessage } from '../push/fcm.js';
import { getSeason, getActiveHolidays } from './season.js';
import { pickBestCandidate } from './candidates.js';
import {
  ALL_CATEGORIES,
  type Candidate,
  type NotificationCategory,
  type NotificationContext,
} from './types.js';

interface LocalParts {
  hour: number;
  weekday: number; // 0=Sun..6=Sat
  dateKey: string; // YYYY-MM-DD in the user's timezone
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Resolve the user-local hour, weekday and date for a given instant + IANA tz. */
function localParts(now: Date, timeZone: string): LocalParts {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      hour: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
    return {
      hour: parseInt(parts.hour ?? '0', 10),
      weekday: WEEKDAY_INDEX[parts.weekday ?? 'Sun'] ?? 0,
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    };
  } catch {
    // Unknown timezone -> fall back to the configured default's offset via UTC.
    return { hour: now.getUTCHours(), weekday: now.getUTCDay(), dateKey: now.toISOString().slice(0, 10) };
  }
}

/** YYYY-MM-DD of an ISO timestamp in a given timezone (for "already sent today"). */
function dateKeyInTz(iso: string, timeZone: string): string {
  return localParts(new Date(iso), timeZone).dateKey;
}

function resolveCategories(user: NotificationUser): Set<NotificationCategory> {
  const raw = user.metadata.notification_categories;
  if (Array.isArray(raw) && raw.length > 0) {
    return new Set(raw.filter((c): c is NotificationCategory =>
      (ALL_CATEGORIES as string[]).includes(c)));
  }
  // No explicit selection -> opted into everything.
  return new Set(ALL_CATEGORIES);
}

function resolveLanguage(user: NotificationUser): string {
  const lang = (user.metadata.language || user.metadata.recipe_language || 'de')
    .toString()
    .toLowerCase();
  return lang.startsWith('en') ? 'en' : 'de';
}

/** Assemble the per-user context and pick the best notification candidate. */
async function chooseForUser(
  user: NotificationUser,
  now: Date,
  local: LocalParts,
): Promise<Candidate | null> {
  const recipes = await getLibrary(user.id);
  const collectionsList = await listCollections(user.id).catch(() => []);

  const collections = new Map<string, { name: string; recipeIds: string[] }>();
  for (const col of collectionsList) {
    const recipeIds = recipes
      .filter((entry) => (entry.collectionIds ?? []).includes(col.id))
      .map((entry) => entry.recipeId);
    collections.set(col.id, { name: col.name, recipeIds });
  }

  // Anti-repeat state from the last 30 days.
  const recent = await getRecentNotifications(user.id, 30);
  const recentTypes = new Set(
    recent.filter((r) => now.getTime() - new Date(r.sentAt).getTime() <= 14 * 86400_000).map((r) => r.type),
  );
  const recentRecipeIds = new Set(recent.map((r) => r.recipeId).filter((id): id is string => !!id));

  const newestSave = recipes[0] ? new Date(recipes[0].addedAt).getTime() : null;
  const daysSinceLastSave = newestSave === null
    ? Infinity
    : Math.floor((now.getTime() - newestSave) / 86400_000);

  const ctx: NotificationContext = {
    userId: user.id,
    now,
    localHour: local.hour,
    localWeekday: local.weekday,
    season: getSeason(now),
    holidays: getActiveHolidays(now),
    recipes,
    collections,
    categories: resolveCategories(user),
    recentTypes,
    recentRecipeIds,
    daysSinceLastSave,
  };

  return pickBestCandidate(ctx);
}

/** Deliver the chosen notification to every active device; prune dead tokens. */
async function deliver(userId: string, candidate: Candidate, copy: FcmMessage): Promise<boolean> {
  if (config.NOTIFICATION_DRY_RUN) {
    console.log(`[notifications] DRY_RUN user=${userId} type=${candidate.type} title="${copy.title}" body="${copy.body}"`);
    return true;
  }

  const tokens = await getActivePushTokens(userId);
  if (tokens.length === 0) return false;

  let anyOk = false;
  for (const token of tokens) {
    const result = await sendToToken(token, copy);
    if (result.ok) {
      anyOk = true;
    } else if (result.unregistered) {
      await disablePushToken(token).catch(() => { });
    } else {
      console.warn(`[notifications] send failed user=${userId}: ${result.error}`);
    }
  }
  return anyOk;
}

/** Build the FCM data payload used for tap routing on the device. */
function tapData(candidate: Candidate): Record<string, string> {
  const data: Record<string, string> = { type: candidate.type };
  if (candidate.recipeId) data.recipeId = candidate.recipeId;
  if (candidate.type === 'remix_nudge' && candidate.slots.remixIdea) {
    data.remixIdea = String(candidate.slots.remixIdea);
  }
  if (candidate.type === 'reactivation') data.route = 'extract';
  return data;
}

export interface NotificationTickResult {
  usersScanned: number;
  deliveredCount: number;
  logs: string[];
}

/** Process one opted-in user for the current tick. Never throws. */
async function processUser(user: NotificationUser, now: Date, force = false): Promise<string> {
  try {
    const tz = (user.metadata.notification_timezone as string) || config.NOTIFICATION_DEFAULT_TZ;
    const local = localParts(now, tz);

    // Only inside the evening send window (bypassed if force=true).
    if (!force && (local.hour < config.NOTIFICATION_SEND_WINDOW_START || local.hour >= config.NOTIFICATION_SEND_WINDOW_END)) {
      return `User ${user.id}: Outside evening send window (${local.hour}:00, allowed ${config.NOTIFICATION_SEND_WINDOW_START}-${config.NOTIFICATION_SEND_WINDOW_END}).`;
    }

    // Frequency capping: max 1/day and max N/week (bypassed if force=true).
    if (!force) {
      const recent = await getRecentNotifications(user.id, 7);
      const sentToday = recent.some((r) => dateKeyInTz(r.sentAt, tz) === local.dateKey);
      if (sentToday) return `User ${user.id}: Already received notification today.`;
      if (recent.length >= config.NOTIFICATION_MAX_PER_WEEK) return `User ${user.id}: Weekly limit reached (${recent.length}/${config.NOTIFICATION_MAX_PER_WEEK}).`;
    }

    // Need at least one device (skip cheap work otherwise, unless dry-run).
    if (!config.NOTIFICATION_DRY_RUN) {
      const tokens = await getActivePushTokens(user.id);
      if (tokens.length === 0) return `User ${user.id}: No registered push tokens found in DB.`;
    }

    const candidate = await chooseForUser(user, now, local);
    if (!candidate) return `User ${user.id}: No candidate notification type matched (needs saved recipes or history).`;

    const copy = await generateNotificationCopy(candidate, resolveLanguage(user));
    if (!copy) return `User ${user.id}: AI copy generation returned null.`;

    const baseUrl = (config.PUBLIC_BACKEND_URL || config.HEALTHCHECK_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const themeParam = encodeURIComponent(copy.theme || 'emerald');
    const emojiParam = encodeURIComponent(copy.emoji || '🥪');
    const iconUrl = `${baseUrl}/api/push-icon?theme=${themeParam}&emoji=${emojiParam}`;

    const dataPayload = tapData(candidate);
    dataPayload.iconUrl = iconUrl;

    const message: FcmMessage = {
      title: copy.title,
      body: copy.body,
      data: dataPayload,
    };
    const delivered = await deliver(user.id, candidate, message);
    if (!delivered) return `User ${user.id}: Delivery failed or FCM not configured.`;

    await insertNotificationLog({
      userId: user.id,
      category: candidate.category,
      type: candidate.type,
      recipeId: candidate.recipeId,
      title: copy.title,
    });

    return `DELIVERED user=${user.id} title="${copy.title}" type=${candidate.type}`;
  } catch (err: any) {
    const msg = `User ${user.id} failed: ${err?.message ?? err}`;
    console.warn(`[notifications] ${msg}`);
    return msg;
  }
}

let ticking = false;

/**
 * One pass over all opted-in users. Guarded so overlapping ticks (a slow pass
 * outrunning the interval) don't run concurrently. Enabled/disabled by the
 * feature flag; when FCM isn't configured we only run in dry-run mode.
 * Pass options.force = true to bypass send windows & frequency caps for testing.
 */
export async function notificationTick(options: { force?: boolean } = {}): Promise<NotificationTickResult> {
  const result: NotificationTickResult = { usersScanned: 0, deliveredCount: 0, logs: [] };

  if (!config.NOTIFICATIONS_ENABLED && !options.force) {
    result.logs.push('NOTIFICATIONS_ENABLED is false in backend config.');
    return result;
  }
  if (!config.NOTIFICATION_DRY_RUN && !isFcmConfigured() && !options.force) {
    result.logs.push('FCM service account is not configured on server.');
    return result;
  }
  if (ticking) {
    result.logs.push('Notification tick is already in progress.');
    return result;
  }
  ticking = true;

  const now = new Date();
  try {
    const users = await listNotificationUsers();
    result.usersScanned = users.length;
    if (users.length === 0) {
      result.logs.push('No users with notifications_enabled === true found in Supabase Auth user_metadata.');
    }
    for (const user of users) {
      const log = await processUser(user, now, options.force);
      result.logs.push(log);
      if (log.startsWith('DELIVERED')) {
        result.deliveredCount++;
      }
    }
  } catch (err: any) {
    result.logs.push(`Tick error: ${err?.message ?? err}`);
    console.error('[notifications] tick failed:', err?.message ?? err);
  } finally {
    ticking = false;
  }
  return result;
}
