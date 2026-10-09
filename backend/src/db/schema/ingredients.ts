import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const ingredientMappings = pgTable(
  'ingredient_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mappingKey: text('mapping_key').notNull(),
    category: text('category').notNull().default(''),
    productCode: text('product_code'),
    resolution: text('resolution').notNull(),
    estimatedNutrients: jsonb('estimated_nutrients'),
    source: text('source').notNull().default('agent'),
    confidence: numeric('confidence', { precision: 3, scale: 2 }),
    model: text('model'),
    reasoning: text('reasoning'),
    hitCount: integer('hit_count').notNull().default(0),
    typicalPackageAmount: numeric('typical_package_amount'),
    typicalPackageUnit: text('typical_package_unit'),
    shelfLifeDays: integer('shelf_life_days'),
    mappingKeyDe: text('mapping_key_de'),
    aliases: text('aliases').array().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('ingredient_mappings_key_category_key').on(table.mappingKey, table.category),
    index('ingredient_mappings_key_idx').on(table.mappingKey),
    index('ingredient_mappings_key_de_idx').on(table.mappingKeyDe),
    index('ingredient_mappings_source_created_idx').on(table.source, table.createdAt),
  ]
);

export type IngredientMapping = typeof ingredientMappings.$inferSelect;
export type NewIngredientMapping = typeof ingredientMappings.$inferInsert;
