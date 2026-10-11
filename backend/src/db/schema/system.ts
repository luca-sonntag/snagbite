import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const globalSettings = pgTable('global_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    type: text('type').notNull().default('bug'),
    message: text('message').notNull(),
    context: jsonb('context'),
    screenshotUrls: text('screenshot_urls').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('feedback_user_id_idx').on(table.userId),
    index('feedback_created_at_idx').on(table.createdAt),
  ]
);

export const geminiLogs = pgTable(
  'gemini_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    requestType: text('request_type').notNull(),
    model: text('model').notNull(),
    durationMs: integer('duration_ms').notNull(),
    success: boolean('success').notNull(),
    errorMsg: text('error_msg'),
    inputData: jsonb('input_data'),
    tokenPrompt: integer('token_prompt'),
    tokenCandidate: integer('token_candidate'),
    tokenTotal: integer('token_total'),
    costInputUsd: numeric('cost_input_usd', { precision: 10, scale: 6 }),
    costOutputUsd: numeric('cost_output_usd', { precision: 10, scale: 6 }),
    costTotalUsd: numeric('cost_total_usd', { precision: 10, scale: 6 }),
  },
  (table) => [index('gemini_logs_created_at_idx').on(table.createdAt)]
);

export const appBundles = pgTable(
  'app_bundles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: text('channel').notNull(),
    version: text('version').notNull(),
    storagePath: text('storage_path').notNull(),
    checksum: text('checksum').notNull(),
    minVersionCode: integer('min_version_code').notNull(),
    maxVersionCode: integer('max_version_code'),
    active: boolean('active').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('app_bundles_channel_version_key').on(table.channel, table.version),
  ]
);

export const pushTokens = pgTable(
  'push_tokens',
  {
    token: text('token').primaryKey(),
    userId: uuid('user_id').notNull(),
    platform: text('platform').notNull().default('android'),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('push_tokens_user_id_idx').on(table.userId)]
);

export const notificationLog = pgTable(
  'notification_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    category: text('category').notNull(),
    type: text('type').notNull(),
    recipeId: uuid('recipe_id'),
    title: text('title'),
  },
  (table) => [index('notification_log_user_sent_idx').on(table.userId, table.sentAt)]
);

export type GlobalSetting = typeof globalSettings.$inferSelect;
export type NewGlobalSetting = typeof globalSettings.$inferInsert;
export type FeedbackEntry = typeof feedback.$inferSelect;
export type NewFeedbackEntry = typeof feedback.$inferInsert;
export type GeminiLog = typeof geminiLogs.$inferSelect;
export type NewGeminiLog = typeof geminiLogs.$inferInsert;
export type AppBundle = typeof appBundles.$inferSelect;
export type NewAppBundle = typeof appBundles.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;
export type NotificationLogItem = typeof notificationLog.$inferSelect;
export type NewNotificationLogItem = typeof notificationLog.$inferInsert;
