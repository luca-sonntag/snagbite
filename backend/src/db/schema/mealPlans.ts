import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { recipes } from './recipes.js';

export const mealPlans = pgTable(
  'meal_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    planDate: date('plan_date').notNull(),
    mealType: text('meal_type').notNull().default('dinner'),
    servings: numeric('servings').notNull().default('2'),
    isCooked: boolean('is_cooked').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_meal_plans_user_date').on(table.userId, table.planDate),
    index('idx_meal_plans_recipe_id').on(table.recipeId),
  ]
);

export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
