import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userAId: text('user_a_id').notNull(),
    userBId: text('user_b_id'),
    inviteCode: text('invite_code').notNull().unique(),
    status: text('status').notNull().default('pending'), // 'pending' | 'active' | 'unlinked'
    trialStartsAt: timestamp('trial_starts_at', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    lastNudgedAt: timestamp('last_nudged_at', { withTimezone: true }),
    unlinkedAt: timestamp('unlinked_at', { withTimezone: true }),
    cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('households_invite_code_idx').on(table.inviteCode),
    index('households_user_a_idx').on(table.userAId),
    index('households_user_b_idx').on(table.userBId),
    index('households_status_idx').on(table.status),
  ]
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
