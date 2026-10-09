import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  bigint,
  date,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { recipes } from './recipes.js';

export const cookEvents = pgTable(
  'cook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    recipeId: uuid('recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    cookedAt: timestamp('cooked_at', { withTimezone: true }).notNull().defaultNow(),
    xpAwarded: integer('xp_awarded').notNull().default(0),
    coinsAwarded: integer('coins_awarded').notNull().default(0),
    hasPhoto: boolean('has_photo').notNull().default(false),
    photoPath: text('photo_path'),
    verified: boolean('verified').notNull().default(false),
    leaderboardEligible: boolean('leaderboard_eligible').notNull().default(false),
    trustScore: numeric('trust_score', { precision: 4, scale: 2 }).notNull().default('0'),
    viaCookingMode: boolean('via_cooking_mode').notNull().default(false),
    timerElapsed: boolean('timer_elapsed').notNull().default(false),
  },
  (table) => [
    index('cook_events_user_time_idx').on(table.userId, table.cookedAt),
    index('cook_events_user_recipe_idx').on(table.userId, table.recipeId),
  ]
);

export const pointLedger = pgTable(
  'point_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    cookEventId: uuid('cook_event_id').references(() => cookEvents.id, {
      onDelete: 'set null',
    }),
    deltaXp: integer('delta_xp').notNull().default(0),
    deltaCoins: integer('delta_coins').notNull().default(0),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('point_ledger_user_time_idx').on(table.userId, table.createdAt)]
);

export const userStats = pgTable(
  'user_stats',
  {
    userId: uuid('user_id').primaryKey(),
    xp: bigint('xp', { mode: 'number' }).notNull().default(0),
    level: integer('level').notNull().default(1),
    coins: bigint('coins', { mode: 'number' }).notNull().default(0),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastCookDate: date('last_cook_date'),
    totalCooks: integer('total_cooks').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id').notNull(),
    badgeKey: text('badge_key').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.badgeKey] }),
    index('user_badges_user_idx').on(table.userId),
  ]
);

export type CookEvent = typeof cookEvents.$inferSelect;
export type NewCookEvent = typeof cookEvents.$inferInsert;
export type PointLedgerEntry = typeof pointLedger.$inferSelect;
export type NewPointLedgerEntry = typeof pointLedger.$inferInsert;
export type UserStats = typeof userStats.$inferSelect;
export type NewUserStats = typeof userStats.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;
