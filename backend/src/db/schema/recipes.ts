import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdBy: uuid('created_by'),
    visibility: text('visibility').notNull().default('private'),
    origin: text('origin').notNull().default('url'),
    sourceUrl: text('source_url'),
    sourceHandle: text('source_handle'),
    parentRecipeId: uuid('parent_recipe_id').references((): AnyPgColumn => recipes.id, {
      onDelete: 'set null',
    }),
    remixPrompt: text('remix_prompt'),
    title: text('title').notNull(),
    description: text('description'),
    emoji: text('emoji'),
    category: text('category'),
    isRecipe: boolean('is_recipe').notNull().default(true),
    prepTime: integer('prep_time'),
    cookTime: integer('cook_time'),
    servings: numeric('servings'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    equipment: text('equipment').array().notNull().default(sql`'{}'::text[]`),
    tips: text('tips').array().notNull().default(sql`'{}'::text[]`),
    imageUrl: text('image_url'),
    imageUrls: text('image_urls').array().notNull().default(sql`'{}'::text[]`),
    imagePrompt: text('image_prompt'),
    isAiCover: boolean('is_ai_cover').notNull().default(false),
    transcript: text('transcript'),
    ingredients: jsonb('ingredients').notNull().default(sql`'[]'::jsonb`),
    instructions: jsonb('instructions').notNull().default(sql`'[]'::jsonb`),
    alternativeIngredients: jsonb('alternative_ingredients'),
    nutritionalValues: jsonb('nutritional_values'),
    sourceNutritionalValues: jsonb('source_nutritional_values'),
    healthScore: numeric('health_score'),
    healthScoreBreakdown: jsonb('health_score_breakdown'),
    hasExplicitNutritionalValues: boolean('has_explicit_nutritional_values').notNull().default(false),
    hasIncompleteSourceInfo: boolean('has_incomplete_source_info').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
    nutritionCoverage: numeric('nutrition_coverage'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('recipes_created_by_idx').on(table.createdBy),
    index('recipes_parent_idx').on(table.parentRecipeId),
    index('recipes_category_idx').on(table.category),
    index('recipes_health_score_idx').on(table.healthScore),
  ]
);

export const userRecipes = pgTable(
  'user_recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    sourceJobId: uuid('source_job_id'),
    source: text('source').notNull().default('extraction'),
    isFavorite: boolean('is_favorite').notNull().default(false),
    flags: text('flags').array().notNull().default(sql`'{}'::text[]`),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_recipes_user_recipe_key').on(table.userId, table.recipeId),
    index('user_recipes_user_added_idx').on(table.userId, table.addedAt),
    index('user_recipes_recipe_idx').on(table.recipeId),
  ]
);

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type UserRecipe = typeof userRecipes.$inferSelect;
export type NewUserRecipe = typeof userRecipes.$inferInsert;
