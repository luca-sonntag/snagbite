import { db } from './drizzle.js';
import {
  cookEvents,
  userStats,
  recipes,
  userRecipes,
  recipeShares,
  cookEventReactions,
} from './schema/index.js';
import { eq, and, desc, inArray, lt, or } from 'drizzle-orm';
import { getAcceptedFriends, getProfilesByIds } from './socialDb.js';
import { resolveCookPhotoUrl } from './gamificationDb.js';
import { rowToRecipe } from './recipesMappers.js';
import type {
  FriendFeedItem,
  SharedRecipeItem,
  FeedReactionSummary,
  FeedReactionEmoji,
  FeedReactor,
} from '@cookbook/shared';

const REACTION_EMOJIS: FeedReactionEmoji[] = ['🔥', '❤️', '😋'];

export async function getFriendsCookFeed(
  userId: string,
  limit = 20,
  before?: string,
): Promise<FriendFeedItem[]> {
  const friends = await getAcceptedFriends(userId);
  const userIds = [userId, ...friends.map((f) => f.friendId)];

  const conditions = [
    inArray(cookEvents.userId, userIds),
    eq(cookEvents.hasPhoto, true),
  ];
  if (before) {
    conditions.push(lt(cookEvents.cookedAt, new Date(before)));
  }

  const events = await db
    .select({
      event: cookEvents,
      recipe: recipes,
    })
    .from(cookEvents)
    .innerJoin(recipes, eq(cookEvents.recipeId, recipes.id))
    .where(and(...conditions))
    .orderBy(desc(cookEvents.cookedAt))
    .limit(limit);

  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.event.id);
  const distinctUserIds = [...new Set(events.map((e) => e.event.userId))];
  const distinctRecipeIds = [...new Set(events.map((e) => e.recipe.id))];

  const [statsRows, savedRows, reactionsRows] = await Promise.all([
    db
      .select({ userId: userStats.userId, level: userStats.level })
      .from(userStats)
      .where(inArray(userStats.userId, distinctUserIds)),
    db
      .select({ recipeId: userRecipes.recipeId })
      .from(userRecipes)
      .where(and(eq(userRecipes.userId, userId), inArray(userRecipes.recipeId, distinctRecipeIds))),
    db
      .select()
      .from(cookEventReactions)
      .where(inArray(cookEventReactions.cookEventId, eventIds)),
  ]);

  const reactorUserIds = reactionsRows.map((r) => r.userId);
  const allUserIds = [...new Set([...distinctUserIds, ...reactorUserIds])];
  const profilesMap = await getProfilesByIds(allUserIds);

  const levelMap = new Map(statsRows.map((s) => [s.userId, s.level]));
  const savedRecipeSet = new Set(savedRows.map((s) => s.recipeId));

  // Group reactions by cookEventId
  const reactionsByEvent = new Map<string, { emoji: string; userId: string }[]>();
  for (const r of reactionsRows) {
    const list = reactionsByEvent.get(r.cookEventId) ?? [];
    list.push({ emoji: r.emoji, userId: r.userId });
    reactionsByEvent.set(r.cookEventId, list);
  }

  const items: FriendFeedItem[] = [];

  for (const { event, recipe } of events) {
    const photoUrl = await resolveCookPhotoUrl(event.photoPath);
    if (!photoUrl) continue;

    const profile = profilesMap.get(event.userId);
    const userReactions = reactionsByEvent.get(event.id) ?? [];

    const reactionSummaries: FeedReactionSummary[] = REACTION_EMOJIS.map((emoji) => {
      const matching = userReactions.filter((r) => r.emoji === emoji);
      return {
        emoji,
        count: matching.length,
        reactedByMe: matching.some((r) => r.userId === userId),
      };
    });

    const seenReactors = new Set<string>();
    const recentReactors: FeedReactor[] = [];
    for (const r of userReactions) {
      if (!seenReactors.has(r.userId)) {
        seenReactors.add(r.userId);
        const p = profilesMap.get(r.userId);
        if (p) {
          recentReactors.push({
            userId: r.userId,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            emoji: r.emoji as FeedReactionEmoji,
          });
        }
      }
    }

    items.push({
      cookEventId: event.id,
      cookedAt: event.cookedAt.toISOString(),
      photoUrl,
      xpAwarded: event.xpAwarded,
      coinsAwarded: event.coinsAwarded,
      verified: event.verified,
      viaCookingMode: event.viaCookingMode,
      timerElapsed: event.timerElapsed,
      user: {
        userId: event.userId,
        displayName: profile?.displayName || 'Chef',
        avatarUrl: profile?.avatarUrl || null,
        level: levelMap.get(event.userId) ?? 1,
        isMe: event.userId === userId,
      },
      recipe: rowToRecipe(recipe),
      isRecipeSaved: savedRecipeSet.has(recipe.id),
      reactions: reactionSummaries,
      recentReactors,
    });
  }

  return items;
}

export async function toggleCookEventReaction(
  userId: string,
  cookEventId: string,
  emoji: FeedReactionEmoji,
): Promise<FeedReactionSummary[]> {
  const [event] = await db
    .select({ userId: cookEvents.userId })
    .from(cookEvents)
    .where(eq(cookEvents.id, cookEventId))
    .limit(1);

  if (!event) throw new Error('EVENT_NOT_FOUND');

  // Verify relationship: self or accepted friend
  if (event.userId !== userId) {
    const friends = await getAcceptedFriends(userId);
    if (!friends.some((f) => f.friendId === event.userId)) {
      throw new Error('ACCESS_DENIED');
    }
  }

  const [existing] = await db
    .select()
    .from(cookEventReactions)
    .where(
      and(
        eq(cookEventReactions.cookEventId, cookEventId),
        eq(cookEventReactions.userId, userId),
        eq(cookEventReactions.emoji, emoji),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(cookEventReactions)
      .where(
        and(
          eq(cookEventReactions.cookEventId, cookEventId),
          eq(cookEventReactions.userId, userId),
          eq(cookEventReactions.emoji, emoji),
        ),
      );
  } else {
    await db.insert(cookEventReactions).values({
      cookEventId,
      userId,
      emoji,
      createdAt: new Date(),
    });
  }

  const allReactions = await db
    .select()
    .from(cookEventReactions)
    .where(eq(cookEventReactions.cookEventId, cookEventId));

  return REACTION_EMOJIS.map((e) => {
    const matching = allReactions.filter((r) => r.emoji === e);
    return {
      emoji: e,
      count: matching.length,
      reactedByMe: matching.some((r) => r.userId === userId),
    };
  });
}

export async function shareRecipeWithFriendsDb(
  senderId: string,
  recipientIds: string[],
  recipeId: string,
  message?: string,
): Promise<void> {
  const cleanMessage = message?.trim() || null;
  const now = new Date();

  for (const recipientId of recipientIds) {
    await db
      .insert(recipeShares)
      .values({
        senderId,
        recipientId,
        recipeId,
        message: cleanMessage,
        status: 'unread',
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [recipeShares.senderId, recipeShares.recipientId, recipeShares.recipeId],
        set: {
          message: cleanMessage,
          status: 'unread',
          createdAt: now,
        },
      });
  }
}

export async function getReceivedRecipeShares(
  userId: string,
): Promise<{ shares: SharedRecipeItem[]; unreadCount: number }> {
  const rows = await db
    .select({
      share: recipeShares,
      recipe: recipes,
    })
    .from(recipeShares)
    .innerJoin(recipes, eq(recipeShares.recipeId, recipes.id))
    .where(and(eq(recipeShares.recipientId, userId), or(eq(recipeShares.status, 'unread'), eq(recipeShares.status, 'seen'))))
    .orderBy(desc(recipeShares.createdAt));

  if (rows.length === 0) return { shares: [], unreadCount: 0 };

  const senderIds = [...new Set(rows.map((r) => r.share.senderId))];
  const recipeIds = [...new Set(rows.map((r) => r.recipe.id))];

  const [profilesMap, savedRows] = await Promise.all([
    getProfilesByIds(senderIds),
    db
      .select({ recipeId: userRecipes.recipeId })
      .from(userRecipes)
      .where(and(eq(userRecipes.userId, userId), inArray(userRecipes.recipeId, recipeIds))),
  ]);

  const savedSet = new Set(savedRows.map((s) => s.recipeId));
  let unreadCount = 0;

  const shares: SharedRecipeItem[] = rows.map(({ share, recipe }) => {
    if (share.status === 'unread') unreadCount++;
    const senderProfile = profilesMap.get(share.senderId);
    return {
      shareId: share.id,
      createdAt: share.createdAt.toISOString(),
      status: share.status as any,
      message: share.message,
      sender: {
        userId: share.senderId,
        displayName: senderProfile?.displayName || 'Ein Koch-Freund',
        avatarUrl: senderProfile?.avatarUrl || null,
      },
      recipe: rowToRecipe(recipe),
      isRecipeSaved: savedSet.has(recipe.id),
    };
  });

  return { shares, unreadCount };
}

export async function markRecipeSharesSeen(userId: string): Promise<void> {
  await db
    .update(recipeShares)
    .set({ status: 'seen' })
    .where(and(eq(recipeShares.recipientId, userId), eq(recipeShares.status, 'unread')));
}

export async function dismissRecipeShare(userId: string, shareId: string): Promise<void> {
  await db
    .update(recipeShares)
    .set({ status: 'dismissed' })
    .where(and(eq(recipeShares.id, shareId), eq(recipeShares.recipientId, userId)));
}

export async function canAccessFriendRecipe(userId: string, recipeId: string): Promise<boolean> {
  const [rec] = await db
    .select({ visibility: recipes.visibility })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!rec) return false;
  if (rec.visibility === 'public') return true;

  // Shared directly?
  const [share] = await db
    .select({ id: recipeShares.id })
    .from(recipeShares)
    .where(and(eq(recipeShares.recipientId, userId), eq(recipeShares.recipeId, recipeId)))
    .limit(1);
  if (share) return true;

  // Cooked by a friend?
  const friends = await getAcceptedFriends(userId);
  if (friends.length > 0) {
    const friendIds = friends.map((f) => f.friendId);
    const [cook] = await db
      .select({ id: cookEvents.id })
      .from(cookEvents)
      .where(and(inArray(cookEvents.userId, friendIds), eq(cookEvents.recipeId, recipeId)))
      .limit(1);
    if (cook) return true;
  }

  // Already in user's library?
  const [ur] = await db
    .select({ id: userRecipes.id })
    .from(userRecipes)
    .where(and(eq(userRecipes.userId, userId), eq(userRecipes.recipeId, recipeId)))
    .limit(1);
  return !!ur;
}
