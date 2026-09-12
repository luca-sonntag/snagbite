-- Migration 011: Consolidate nutritional values into JSONB and add health_score
--
-- Adds:
-- 1. `nutritional_values jsonb` on recipes: consolidates calories, protein, carbs, fat,
--    and adds fiber, sugar, sodium, saturated_fat, nova_group, vegetable_grams, plant_count.
-- 2. `health_score numeric` on recipes: overall health score (0-100).
-- 3. `health_score_breakdown jsonb` on recipes: 4 pillars, metrics, highlights, cautions, smart swaps.
--
-- Backfills existing rows from legacy columns (calories, protein_g, carbs_g, fat_g).

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS nutritional_values jsonb;

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS health_score numeric;

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS health_score_breakdown jsonb;

-- Backfill existing rows with legacy macros into nutritional_values JSONB
UPDATE public.recipes
SET nutritional_values = jsonb_strip_nulls(jsonb_build_object(
  'calories', calories,
  'protein', protein_g,
  'carbs', carbs_g,
  'fat', fat_g
))
WHERE nutritional_values IS NULL 
  AND (calories IS NOT NULL OR protein_g IS NOT NULL OR carbs_g IS NOT NULL OR fat_g IS NOT NULL);

-- Index on health_score for catalog filtering & sorting
CREATE INDEX IF NOT EXISTS recipes_health_score_idx 
ON public.recipes (health_score desc) 
WHERE health_score IS NOT NULL;
