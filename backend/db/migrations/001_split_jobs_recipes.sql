-- 001 — split the overloaded `jobs` table into jobs / recipes / user_recipes.
--
-- ⚠️  ONE-TIME, NOT IDEMPOTENT. Unlike backend/supabase_schema.sql, this file
-- runs exactly once per database. The guard at the top aborts a second run.
--
-- WHEN TO RUN
--   Fresh database  → skip this file entirely. backend/db/schema.sql already
--                     declares the three tables in their final shape.
--   Existing database → run THIS FILE FIRST, then backend/db/schema.sql (all of
--                     its CREATEs become no-ops), then backend/supabase_schema.sql.
--                     Running schema.sql first would fail, because its jobs
--                     indexes reference columns the old table does not have.
--
-- WHAT IT DOES
--   The old `jobs` row was three things at once: the extraction task, the recipe
--   content (`recipe jsonb`, which also doubled as the progress channel via
--   {isProgress:true,…}) and the user's cookbook entry (is_favorite / flags /
--   deleted_at). This splits them apart so a recipe can later belong to several
--   users and be published.
--
-- THE ID TRICK
--   The old job id becomes the new recipe id. Every historical job id is a
--   randomUUID(), so `recipes.id := jobs.id::uuid` lets recipe_collections /
--   cook_events / notification_log repoint with a bare cast — no mapping table —
--   and keeps `recipe.id === job.id` true for existing rows, so client-side
--   localStorage keys and the recipe-covers/${userId}/${jobId}.jpg storage paths
--   keep matching. New jobs mint a fresh recipe id; the two only coincide for
--   rows that predate this migration.

BEGIN;

-- ── 0. Guards ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.jobs_legacy') IS NOT NULL THEN
    RAISE EXCEPTION 'already applied: public.jobs_legacy exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'jobs'
                   AND column_name = 'recipe') THEN
    RAISE EXCEPTION 'nothing to migrate: public.jobs has no recipe column (fresh database? then skip this file)';
  END IF;
  -- In-flight jobs would lose their worker lease mid-transformation.
  IF EXISTS (SELECT 1 FROM public.jobs WHERE status IN ('pending','scraping','processing')) THEN
    RAISE EXCEPTION 'in-flight jobs present — drain the queue before migrating';
  END IF;
  -- jobs.id becomes uuid. The one historical non-UUID row has user_id IS NULL
  -- and is filtered out in step 4; a user-owned non-UUID id is unexpected.
  IF EXISTS (SELECT 1 FROM public.jobs
             WHERE user_id IS NOT NULL
               AND id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'non-UUID id on a user-owned job — cannot migrate jobs.id to uuid';
  END IF;
END $$;

-- Drift preflight: production never received the llm_usage migration, and the
-- backfill reads that column. One line so the same script runs on dev and prod.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS llm_usage jsonb;

-- Cut references to ownerless jobs — they do not survive into the new table.
DELETE FROM public.recipe_collections
 WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);
UPDATE public.cook_events SET job_id = NULL
 WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);

-- ── 1. Park the old table ───────────────────────────────────────────────────
-- claim_next_job returns `setof public.jobs`, so it depends on the table and
-- must be dropped before the rename. CREATE OR REPLACE could not have changed
-- its return type anyway.
DROP FUNCTION IF EXISTS public.claim_next_job(text);
ALTER TABLE public.recipe_collections DROP CONSTRAINT IF EXISTS recipe_collections_job_id_fkey;
ALTER TABLE public.cook_events        DROP CONSTRAINT IF EXISTS cook_events_job_id_fkey;
ALTER TABLE public.jobs RENAME TO jobs_legacy;
ALTER INDEX IF EXISTS public.jobs_pkey RENAME TO jobs_legacy_pkey;
DROP INDEX IF EXISTS public.jobs_active_user_url_idx;
DROP INDEX IF EXISTS public.jobs_user_not_deleted_idx;

-- ── 2. New tables ───────────────────────────────────────────────────────────
-- Kept in sync with backend/db/schema.sql, which is the fresh-install path and
-- carries the full commentary on why each column looks the way it does.

CREATE TABLE public.recipes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by             uuid,
  visibility             text NOT NULL DEFAULT 'private'
                           CHECK (visibility IN ('private','unlisted','public')),
  origin                 text NOT NULL DEFAULT 'url'
                           CHECK (origin IN ('url','photo','remix')),
  source_url             text,
  source_handle          text,
  parent_recipe_id       uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  remix_prompt           text,
  title                  text NOT NULL,
  description            text,
  emoji                  text,
  is_recipe              boolean NOT NULL DEFAULT true,
  prep_time              int,
  cook_time              int,
  servings               numeric,
  tags                   text[] NOT NULL DEFAULT '{}',
  equipment              text[] NOT NULL DEFAULT '{}',
  tips                   text[] NOT NULL DEFAULT '{}',
  image_url              text,
  image_urls             text[] NOT NULL DEFAULT '{}',
  image_prompt           text,
  is_ai_cover            boolean NOT NULL DEFAULT false,
  transcript             text,
  ingredients             jsonb NOT NULL DEFAULT '[]',
  instructions            jsonb NOT NULL DEFAULT '[]',
  alternative_ingredients jsonb,
  calories                        numeric,
  protein_g                       numeric,
  carbs_g                         numeric,
  fat_g                           numeric,
  source_nutritional_values       jsonb,
  has_explicit_nutritional_values boolean NOT NULL DEFAULT false,
  nutrition_coverage              numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  kind                  text NOT NULL DEFAULT 'url'
                          CHECK (kind IN ('url','photo','remix')),
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','scraping','processing',
                                            'completed','failed','cancelled')),
  source_url            text NOT NULL,
  source_url_normalized text,
  parent_recipe_id      uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  remix_prompt          text,
  recipe_id             uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  progress              jsonb,
  error                 text,
  llm_usage             jsonb,
  media_bytes           bigint NOT NULL DEFAULT 0,
  locked_at             timestamptz,
  locked_by             text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  recipe_id     uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  source_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  source        text NOT NULL DEFAULT 'extraction'
                  CHECK (source IN ('extraction','photo','remix','share')),
  is_favorite   boolean NOT NULL DEFAULT false,
  flags         text[] NOT NULL DEFAULT '{}',
  added_at      timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_recipes_user_recipe_key UNIQUE (user_id, recipe_id)
);

-- JSONB array -> text[], tolerating a missing key or a JSON null.
CREATE OR REPLACE FUNCTION public.jsonb_text_array(p jsonb)
 RETURNS text[] LANGUAGE sql IMMUTABLE
AS $function$
  SELECT CASE WHEN jsonb_typeof(p) = 'array'
              THEN array(SELECT jsonb_array_elements_text(p)) END;
$function$;

-- ── 3. Backfill recipes (id := old job id) ──────────────────────────────────
INSERT INTO public.recipes (
  id, created_by, visibility, origin, source_url, source_handle, remix_prompt,
  title, description, emoji, is_recipe, prep_time, cook_time, servings,
  tags, equipment, tips, image_url, image_urls, image_prompt, is_ai_cover,
  transcript, ingredients, instructions, alternative_ingredients,
  calories, protein_g, carbs_g, fat_g,
  source_nutritional_values, has_explicit_nutritional_values, nutrition_coverage,
  created_at, updated_at
)
SELECT
  -- The ownerless legacy row has a non-UUID id and gets a fresh one; it is the
  -- only case where the id-reuse trick does not apply.
  CASE WHEN j.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       THEN j.id::uuid ELSE gen_random_uuid() END,
  j.user_id,
  'private',
  CASE WHEN j.url LIKE 'photo://%'      THEN 'photo'
       WHEN j.parent_job_id IS NOT NULL THEN 'remix'
       ELSE 'url' END,
  CASE WHEN j.url LIKE 'photo://%' THEN NULL ELSE j.url END,
  j.recipe->>'instagramHandle',
  j.prompt,
  COALESCE(NULLIF(j.recipe->>'title', ''), 'Rezept'),
  j.recipe->>'description',
  j.recipe->>'emoji',
  COALESCE((j.recipe->>'isRecipe')::boolean, true),
  CASE WHEN jsonb_typeof(j.recipe->'prepTime') = 'number' THEN (j.recipe->>'prepTime')::int END,
  CASE WHEN jsonb_typeof(j.recipe->'cookTime') = 'number' THEN (j.recipe->>'cookTime')::int END,
  CASE WHEN jsonb_typeof(j.recipe->'servings') = 'number' THEN (j.recipe->>'servings')::numeric END,
  COALESCE(public.jsonb_text_array(j.recipe->'tags'), '{}'),
  COALESCE(public.jsonb_text_array(j.recipe->'equipment'), '{}'),
  COALESCE(public.jsonb_text_array(j.recipe->'tips'), '{}'),
  j.recipe->>'imageUrl',
  COALESCE(public.jsonb_text_array(j.recipe->'imageUrls'), '{}'),
  j.recipe->>'imagePrompt',
  COALESCE((j.recipe->>'isAiCover')::boolean, false),
  j.recipe->>'transcript',
  -- Replicates normalizeRecipe()'s flat-array -> group shim (db.ts) in SQL, so
  -- the runtime shim can be deleted instead of carried forever. Note the empty
  -- array case: [] became [{name:'Ingredients', items:[]}], preserved here.
  CASE
    WHEN jsonb_typeof(j.recipe->'ingredients') <> 'array' THEN '[]'::jsonb
    WHEN jsonb_array_length(j.recipe->'ingredients') = 0
      THEN jsonb_build_array(jsonb_build_object('name','Ingredients','items','[]'::jsonb))
    WHEN jsonb_typeof(j.recipe->'ingredients'->0->'items') = 'array'
      THEN j.recipe->'ingredients'
    ELSE jsonb_build_array(jsonb_build_object('name','Ingredients','items', j.recipe->'ingredients'))
  END,
  CASE WHEN jsonb_typeof(j.recipe->'instructions') = 'array'
       THEN j.recipe->'instructions' ELSE '[]'::jsonb END,
  j.recipe->'alternativeIngredients',
  -- Also from normalizeRecipe: the legacy `nutritionalEstimates` key.
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'calories')::numeric,
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'protein')::numeric,
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'carbs')::numeric,
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'fat')::numeric,
  j.recipe->'sourceNutritionalValues',
  COALESCE((j.recipe->>'hasExplicitNutritionalValues')::boolean, false),
  (j.recipe->>'nutritionCoverage')::numeric,
  -- NOT now(): a default here would flatten every user's cookbook ordering.
  j.created_at,
  j.updated_at
FROM public.jobs_legacy j
WHERE j.status = 'completed'
  AND j.recipe IS NOT NULL
  -- Excludes the progress placeholders the recipe column doubled as.
  AND COALESCE((j.recipe->>'isProgress')::boolean, false) = false;

-- ── 4. Backfill jobs ────────────────────────────────────────────────────────
INSERT INTO public.jobs (
  id, user_id, kind, status, source_url, source_url_normalized,
  parent_recipe_id, remix_prompt, recipe_id, progress, error,
  llm_usage, media_bytes, locked_at, locked_by, created_at, updated_at
)
SELECT
  j.id::uuid,
  j.user_id,
  CASE WHEN j.url LIKE 'photo://%'      THEN 'photo'
       WHEN j.parent_job_id IS NOT NULL THEN 'remix'
       ELSE 'url' END,
  j.status,
  j.url,
  j.url_normalized,
  -- Parent job id == parent recipe id, by the id-reuse trick.
  j.parent_job_id::uuid,
  j.prompt,
  r.id,
  -- Placeholders survive only on genuinely in-flight jobs (the guard rules
  -- those out); failed jobs get NULL instead of a stale placeholder.
  CASE WHEN j.status IN ('pending','scraping','processing')
        AND COALESCE((j.recipe->>'isProgress')::boolean, false)
       THEN jsonb_build_object('percent', j.recipe->'percent', 'stage', j.recipe->'stage')
  END,
  j.error, j.llm_usage, j.media_bytes, j.locked_at, j.locked_by,
  j.created_at, j.updated_at
FROM public.jobs_legacy j
LEFT JOIN public.recipes r ON r.id = j.id::uuid
-- The ownerless legacy job does not survive; its recipe does (created_by NULL).
WHERE j.user_id IS NOT NULL;

-- recipes.parent_recipe_id: second pass, valid only once all recipes exist.
UPDATE public.recipes r
   SET parent_recipe_id = j.parent_job_id::uuid
  FROM public.jobs_legacy j
 WHERE j.id::uuid = r.id
   AND j.parent_job_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.recipes p WHERE p.id = j.parent_job_id::uuid);

-- ── 5. Backfill user_recipes ────────────────────────────────────────────────
INSERT INTO public.user_recipes (
  user_id, recipe_id, source_job_id, source, is_favorite, flags, added_at, updated_at
)
SELECT
  j.user_id, r.id, j.id::uuid,
  CASE WHEN j.url LIKE 'photo://%'      THEN 'photo'
       WHEN j.parent_job_id IS NOT NULL THEN 'remix'
       ELSE 'extraction' END,
  j.is_favorite, j.flags, j.created_at, j.updated_at
FROM public.jobs_legacy j
JOIN public.recipes r ON r.id = j.id::uuid
WHERE j.user_id IS NOT NULL
  -- Soft-deleted rows do not come back into the cookbook.
  AND j.deleted_at IS NULL
ON CONFLICT (user_id, recipe_id) DO NOTHING;

-- ── 6. Repoint the dependents ───────────────────────────────────────────────
-- recipe_collections points at user_recipes, NOT recipes: a collection is a
-- per-user construct, so removing a recipe from the cookbook must take its
-- collection memberships with it. (The old ON DELETE CASCADE from jobs did that
-- by accident, because jobs were per-user.)
ALTER TABLE public.recipe_collections ADD COLUMN user_recipe_id uuid;
UPDATE public.recipe_collections rc
   SET user_recipe_id = ur.id
  FROM public.user_recipes ur
 WHERE ur.recipe_id = rc.job_id::uuid
   AND ur.user_id   = rc.user_id;
DELETE FROM public.recipe_collections WHERE user_recipe_id IS NULL;
ALTER TABLE public.recipe_collections
  DROP CONSTRAINT recipe_collections_pkey,
  DROP COLUMN job_id,
  ALTER COLUMN user_recipe_id SET NOT NULL,
  ADD CONSTRAINT recipe_collections_pkey PRIMARY KEY (collection_id, user_recipe_id),
  ADD CONSTRAINT recipe_collections_user_recipe_id_fkey
    FOREIGN KEY (user_recipe_id) REFERENCES public.user_recipes(id) ON DELETE CASCADE;

-- cook_events points at recipes, NOT user_recipes: unsaving a recipe must never
-- delete the user's XP history. recipes are never deleted, so this holds.
ALTER TABLE public.cook_events ADD COLUMN recipe_id uuid;
UPDATE public.cook_events SET recipe_id = job_id::uuid
 WHERE job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE public.cook_events ce SET recipe_id = NULL
 WHERE recipe_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = ce.recipe_id);
ALTER TABLE public.cook_events
  DROP COLUMN job_id,
  ADD CONSTRAINT cook_events_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;

-- notification_log keeps a soft reference (no FK), used for anti-repeat dedupe.
ALTER TABLE public.notification_log ADD COLUMN recipe_id uuid;
UPDATE public.notification_log SET recipe_id = job_id::uuid
 WHERE job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE public.notification_log DROP COLUMN job_id;

COMMIT;

-- public.jobs_legacy is deliberately left in place as the rollback and as the
-- source for the verification queries in 001_verify.sql. Drop it one release
-- later, together with the old cook_events_user_job_idx.
--
-- Indexes, RLS policies and the claim_next_job / complete_job functions are NOT
-- created here — run backend/db/schema.sql next, which owns them.
