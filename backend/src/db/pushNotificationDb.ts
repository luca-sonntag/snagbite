import { db } from './drizzle.js';
import { pushTokens, notificationLog } from './schema/system.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { user as userTable } from './schema/auth.js';
import type { NotificationLogEntry, NotificationLogRow, NotificationUser } from './types.js';

export async function upsertPushToken(
  userId: string,
  token: string,
  platform = 'android'
): Promise<void> {
  await db
    .insert(pushTokens)
    .values({
      token,
      userId,
      platform,
      disabled: false,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        userId,
        platform,
        disabled: false,
        lastSeenAt: new Date(),
      },
    });
}

export async function disablePushToken(token: string): Promise<void> {
  await db
    .update(pushTokens)
    .set({ disabled: true })
    .where(eq(pushTokens.token, token));
}

export async function deletePushToken(userId: string, token: string): Promise<void> {
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));
}

export async function deletePushTokensForUser(userId: string): Promise<void> {
  await db
    .delete(pushTokens)
    .where(eq(pushTokens.userId, userId));
}

export async function getActivePushTokens(userId: string): Promise<string[]> {
  const rows = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.disabled, false)));

  return rows.map((r) => r.token);
}

export async function insertNotificationLog(entry: NotificationLogEntry): Promise<void> {
  await db
    .insert(notificationLog)
    .values({
      userId: entry.userId,
      category: entry.category,
      type: entry.type,
      recipeId: entry.recipeId ?? null,
      title: entry.title ?? null,
    });
}

export async function getRecentNotifications(
  userId: string,
  sinceDays: number
): Promise<NotificationLogRow[]> {
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      sentAt: notificationLog.sentAt,
      category: notificationLog.category,
      type: notificationLog.type,
      recipeId: notificationLog.recipeId,
    })
    .from(notificationLog)
    .where(and(
      eq(notificationLog.userId, userId),
      gte(notificationLog.sentAt, cutoff)
    ))
    .orderBy(desc(notificationLog.sentAt));

  return rows.map((r) => ({
    sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : String(r.sentAt),
    category: r.category,
    type: r.type,
    recipeId: r.recipeId,
  }));
}

export async function listNotificationUsers(): Promise<NotificationUser[]> {
  const rows = await db
    .select({
      id: userTable.id,
      notificationsEnabled: userTable.notificationsEnabled,
    })
    .from(userTable)
    .where(eq(userTable.notificationsEnabled, true));

  return rows.map((r) => ({
    id: r.id,
    metadata: { notifications_enabled: true },
  }));
}
