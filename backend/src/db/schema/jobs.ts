import {
  pgTable,
  uuid,
  text,
  bigint,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { recipes } from './recipes.js';

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    kind: text('kind').notNull().default('url'),
    status: text('status').notNull().default('pending'),
    sourceUrl: text('source_url').notNull(),
    sourceUrlNormalized: text('source_url_normalized'),
    parentRecipeId: uuid('parent_recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    remixPrompt: text('remix_prompt'),
    recipeId: uuid('recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    progress: jsonb('progress'),
    error: text('error'),
    clientFrames: jsonb('client_frames'),
    scrapeMeta: jsonb('scrape_meta'),
    llmUsage: jsonb('llm_usage'),
    mediaBytes: bigint('media_bytes', { mode: 'number' }).notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('jobs_user_created_idx').on(table.userId, table.createdAt),
    index('jobs_status_created_idx').on(table.status, table.createdAt),
    index('jobs_source_normalized_idx').on(table.userId, table.sourceUrlNormalized),
  ]
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
