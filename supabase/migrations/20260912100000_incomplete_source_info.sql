-- Migration: Add has_incomplete_source_info to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS has_incomplete_source_info boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.recipes.has_incomplete_source_info IS 
'True if the source post lacked complete recipe details (ingredients, quantities, instructions) and was visually reconstructed.';
