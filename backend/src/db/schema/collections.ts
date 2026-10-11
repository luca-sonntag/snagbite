import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { userRecipes } from './recipes.js';

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    emoji: text('emoji'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('collections_user_id_idx').on(table.userId)]
);

export const recipeCollections = pgTable(
  'recipe_collections',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    userRecipeId: uuid('user_recipe_id')
      .notNull()
      .references(() => userRecipes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.userRecipeId] }),
    index('recipe_collections_user_id_idx').on(table.userId),
    index('recipe_collections_user_recipe_idx').on(table.userRecipeId),
  ]
);

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type RecipeCollection = typeof recipeCollections.$inferSelect;
export type NewRecipeCollection = typeof recipeCollections.$inferInsert;
