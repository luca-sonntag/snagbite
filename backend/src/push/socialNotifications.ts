import { isFcmConfigured, sendToToken, type FcmMessage } from './fcm.js';
import {
  getActivePushTokens,
  disablePushToken,
  insertNotificationLog,
} from '../db/pushNotificationDb.js';
import { getProfilesByIds, getAcceptedFriends } from '../db/socialDb.js';
import { resolveCookPhotoUrl } from '../db/gamificationDb.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { inArray } from 'drizzle-orm';
import { config } from '../config.js';

async function getUserLanguages(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (userIds.length === 0) return result;
  try {
    const users = await db
      .select({ id: userTable.id, metadata: userTable.metadata })
      .from(userTable)
      .where(inArray(userTable.id, userIds));
    for (const u of users) {
      const meta = (u.metadata ?? {}) as Record<string, unknown>;
      const lang = String(meta.language || meta.recipe_language || 'de').toLowerCase();
      result.set(u.id, lang.startsWith('en') ? 'en' : 'de');
    }
  } catch (err) {
    console.warn('[socialPush] Failed to load user languages:', err);
  }
  return result;
}

async function deliverSocialPush(
  recipientUserId: string,
  message: FcmMessage,
  type: string,
  recipeId?: string,
): Promise<void> {
  if (!isFcmConfigured()) return;
  try {
    const tokens = await getActivePushTokens(recipientUserId);
    if (tokens.length === 0) return;

    for (const token of tokens) {
      const res = await sendToToken(token, message);
      if (res.unregistered) {
        await disablePushToken(token).catch(() => {});
      }
    }

    await insertNotificationLog({
      userId: recipientUserId,
      category: 'social',
      type,
      recipeId,
      title: message.title,
    });
  } catch (err) {
    console.warn(`[socialPush] Delivery error for user ${recipientUserId}:`, err);
  }
}

export async function notifyFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  try {
    const [profiles, langs] = await Promise.all([
      getProfilesByIds([requesterId]),
      getUserLanguages([addresseeId]),
    ]);
    const senderName = profiles.get(requesterId)?.displayName || 'Ein Koch-Freund';
    const isEn = langs.get(addresseeId) === 'en';

    const message: FcmMessage = {
      title: isEn ? '👋 New friend request' : '👋 Neue Freundschaftsanfrage',
      body: isEn
        ? `${senderName} wants to be friends on Snagbite.`
        : `${senderName} möchte mit dir auf Snagbite befreundet sein.`,
      data: { type: 'friend_request', route: 'progress', section: 'friends' },
    };
    await deliverSocialPush(addresseeId, message, 'friend_request');
  } catch (err) {
    console.warn('[socialPush] notifyFriendRequest error:', err);
  }
}

export async function notifyFriendAccepted(accepterId: string, requesterId: string): Promise<void> {
  try {
    const [profiles, langs] = await Promise.all([
      getProfilesByIds([accepterId]),
      getUserLanguages([requesterId]),
    ]);
    const friendName = profiles.get(accepterId)?.displayName || 'Ein Koch-Freund';
    const isEn = langs.get(requesterId) === 'en';

    const message: FcmMessage = {
      title: isEn ? '🎉 Friend request accepted' : '🎉 Freundschaftsanfrage angenommen',
      body: isEn
        ? `${friendName} and you are now friends on Snagbite!`
        : `${friendName} und du seid jetzt auf Snagbite befreundet!`,
      data: { type: 'friend_accepted', route: 'progress', section: 'friends' },
    };
    await deliverSocialPush(requesterId, message, 'friend_accepted');
  } catch (err) {
    console.warn('[socialPush] notifyFriendAccepted error:', err);
  }
}

export async function notifyRecipeShared(
  senderId: string,
  recipientIds: string[],
  recipe: { id: string; title: string; imageUrl?: string | null },
  note?: string,
): Promise<void> {
  if (recipientIds.length === 0) return;
  try {
    const [profiles, langs] = await Promise.all([
      getProfilesByIds([senderId]),
      getUserLanguages(recipientIds),
    ]);
    const senderName = profiles.get(senderId)?.displayName || 'Ein Freund';

    for (const recipientId of recipientIds) {
      const isEn = langs.get(recipientId) === 'en';
      const cleanNote = note?.trim();
      const body = isEn
        ? cleanNote ? `"${recipe.title}" – ${cleanNote}` : `"${recipe.title}"`
        : cleanNote ? `„${recipe.title}“ – ${cleanNote}` : `„${recipe.title}“`;

      const message: FcmMessage = {
        title: isEn
          ? `🍽️ ${senderName} shared a recipe`
          : `🍽️ ${senderName} hat ein Rezept mit dir geteilt`,
        body,
        ...(recipe.imageUrl && /^https?:\/\//i.test(recipe.imageUrl) ? { imageUrl: recipe.imageUrl } : {}),
        data: { type: 'recipe_shared', route: 'progress', section: 'friends', recipeId: recipe.id },
      };
      await deliverSocialPush(recipientId, message, 'recipe_shared', recipe.id);
    }
  } catch (err) {
    console.warn('[socialPush] notifyRecipeShared error:', err);
  }
}

export async function notifyFriendsOfCook(
  cookUserId: string,
  recipe: { id: string; title: string },
  photoPath: string,
): Promise<void> {
  try {
    const friends = await getAcceptedFriends(cookUserId);
    if (friends.length === 0) return;

    const friendIds = friends.map((f) => f.friendId);
    const [profiles, photoUrl, langs] = await Promise.all([
      getProfilesByIds([cookUserId]),
      resolveCookPhotoUrl(photoPath),
      getUserLanguages(friendIds),
    ]);
    const cookName = profiles.get(cookUserId)?.displayName || 'Ein Freund';
    const absolutePhotoUrl = photoUrl
      ? (photoUrl.startsWith('/') && config.APP_URL
          ? config.APP_URL.replace(/\/+$/, '') + photoUrl
          : photoUrl)
      : null;

    for (const friendId of friendIds) {
      const isEn = langs.get(friendId) === 'en';
      const message: FcmMessage = {
        title: isEn ? `👨‍🍳 ${cookName} just cooked!` : `👨‍🍳 ${cookName} hat gerade gekocht!`,
        body: isEn
          ? `${cookName} cooked "${recipe.title}". Check out the photo in your feed!`
          : `${cookName} hat „${recipe.title}“ gekocht. Schau dir das Foto im Feed an!`,
        ...(absolutePhotoUrl && /^https?:\/\//i.test(absolutePhotoUrl) ? { imageUrl: absolutePhotoUrl } : {}),
        data: { type: 'friend_cooked', route: 'progress', section: 'feed', recipeId: recipe.id },
      };
      await deliverSocialPush(friendId, message, 'friend_cooked', recipe.id);
    }
  } catch (err) {
    console.warn('[socialPush] notifyFriendsOfCook error:', err);
  }
}
