-- Migration: Add category column to recipes table for meal type categorization
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_recipes_category ON public.recipes(category)
  WHERE category IS NOT NULL;
