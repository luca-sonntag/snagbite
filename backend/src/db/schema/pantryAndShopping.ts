import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  date,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { recipes } from './recipes.js';

export const pantryItems = pgTable(
  'pantry_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    baseName: text('base_name'),
    mappingKey: text('mapping_key'),
    category: text('category'),
    amount: numeric('amount').notNull().default('0'),
    unit: text('unit').notNull(),
    canonicalId: text('canonical_id'),
    notes: text('notes'),
    expiresAt: date('expires_at'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('pantry_items_user_expires_idx').on(table.userId, table.expiresAt),
    index('pantry_items_user_key_idx').on(table.userId, table.mappingKey),
    index('pantry_items_user_basename_idx').on(table.userId, table.baseName),
  ]
);

export const shoppingList = pgTable(
  'shopping_list',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    baseName: text('base_name'),
    parentIngredient: jsonb('parent_ingredient'),
    modifier: text('modifier'),
    brand: text('brand'),
    amount: numeric('amount').notNull().default('0'),
    unit: text('unit').notNull(),
    recipeId: uuid('recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    recipeTitle: text('recipe_title'),
    checked: boolean('checked').notNull().default(false),
    category: text('category'),
    canonicalId: text('canonical_id'),
    notes: text('notes'),
    inPantryWarning: boolean('in_pantry_warning').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('shopping_list_user_checked_idx').on(table.userId, table.checked, table.createdAt),
    index('shopping_list_user_recipe_idx').on(table.userId, table.recipeId),
  ]
);

export type PantryItem = typeof pantryItems.$inferSelect;
export type NewPantryItem = typeof pantryItems.$inferInsert;
export type ShoppingListItem = typeof shoppingList.$inferSelect;
export type NewShoppingListItem = typeof shoppingList.$inferInsert;
