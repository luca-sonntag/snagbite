-- Migration: Add is_demo flag to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS recipes_demo_public_idx 
ON public.recipes (created_at DESC) 
WHERE is_demo = true AND visibility = 'public';

COMMENT ON COLUMN public.recipes.is_demo IS 
'True if the recipe is explicitly designated as a featured demo recipe for public showcase and daily rotation.';
