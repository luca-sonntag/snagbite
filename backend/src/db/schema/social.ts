import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { recipes } from './recipes.js';
import { cookEvents } from './gamification.js';

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey(),
  displayName: text('display_name').notNull().default('Chef'),
  avatarUrl: text('avatar_url'),
  friendCode: text('friend_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id').notNull(),
    addresseeId: uuid('addressee_id').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('friendships_pair_unique').on(table.requesterId, table.addresseeId),
    index('friendships_requester_idx').on(table.requesterId),
    index('friendships_addressee_idx').on(table.addresseeId),
  ]
);

export const recipeShares = pgTable(
  'recipe_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    message: text('message'),
    status: text('status').notNull().default('unread'), // 'unread' | 'seen' | 'saved' | 'dismissed'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('recipe_shares_sender_recipient_recipe_idx').on(
      table.senderId,
      table.recipientId,
      table.recipeId,
    ),
    index('recipe_shares_recipient_status_idx').on(table.recipientId, table.status, table.createdAt),
  ]
);

export const cookEventReactions = pgTable(
  'cook_event_reactions',
  {
    cookEventId: uuid('cook_event_id')
      .notNull()
      .references(() => cookEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    emoji: text('emoji').notNull(), // '🔥' | '❤️' | '😋'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.cookEventId, table.userId, table.emoji] }),
    index('cook_event_reactions_event_idx').on(table.cookEventId),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type RecipeShare = typeof recipeShares.$inferSelect;
export type NewRecipeShare = typeof recipeShares.$inferInsert;
export type CookEventReaction = typeof cookEventReactions.$inferSelect;
export type NewCookEventReaction = typeof cookEventReactions.$inferInsert;

