-- Migration: Split monolithic jobs table into jobs / recipes / user_recipes
-- Re-points recipe_collections, cook_events, and notification_log to the new models.

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
  -- jobs.id becomes uuid. User-owned non-UUID id is unexpected.
  IF EXISTS (SELECT 1 FROM public.jobs
             WHERE user_id IS NOT NULL
               AND id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'non-UUID id on a user-owned job — cannot migrate jobs.id to uuid';
  END IF;
END $$;

-- Drift preflight: ensure llm_usage exists before backfill reads it
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS llm_usage jsonb;

-- Cut references to ownerless jobs — they do not survive into the new table
DELETE FROM public.recipe_collections
 WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);
UPDATE public.cook_events SET job_id = NULL
 WHERE job_id IN (SELECT id FROM public.jobs WHERE user_id IS NULL);

-- ── 1. Park the old table ───────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.claim_next_job(text);
ALTER TABLE public.recipe_collections DROP CONSTRAINT IF EXISTS recipe_collections_job_id_fkey;
ALTER TABLE public.cook_events        DROP CONSTRAINT IF EXISTS cook_events_job_id_fkey;
ALTER TABLE public.jobs RENAME TO jobs_legacy;
ALTER INDEX IF EXISTS public.jobs_pkey RENAME TO jobs_legacy_pkey;
DROP INDEX IF EXISTS public.jobs_active_user_url_idx;
DROP INDEX IF EXISTS public.jobs_user_not_deleted_idx;

-- ── 2. New tables ───────────────────────────────────────────────────────────
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
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'calories')::numeric,
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'protein')::numeric,
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'carbs')::numeric,
  (COALESCE(j.recipe->'nutritionalValues', j.recipe->'nutritionalEstimates')->>'fat')::numeric,
  j.recipe->'sourceNutritionalValues',
  COALESCE((j.recipe->>'hasExplicitNutritionalValues')::boolean, false),
  (j.recipe->>'nutritionCoverage')::numeric,
  j.created_at,
  j.updated_at
FROM public.jobs_legacy j
WHERE j.status = 'completed'
  AND j.recipe IS NOT NULL
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
  j.parent_job_id::uuid,
  j.prompt,
  r.id,
  CASE WHEN j.status IN ('pending','scraping','processing')
        AND COALESCE((j.recipe->>'isProgress')::boolean, false)
       THEN jsonb_build_object('percent', j.recipe->'percent', 'stage', j.recipe->'stage')
  END,
  j.error, j.llm_usage, j.media_bytes, j.locked_at, j.locked_by,
  j.created_at, j.updated_at
FROM public.jobs_legacy j
LEFT JOIN public.recipes r ON r.id = j.id::uuid
WHERE j.user_id IS NOT NULL;

-- recipes.parent_recipe_id: second pass
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
       ELSE 'extraction' end,
  j.is_favorite, j.flags, j.created_at, j.updated_at
FROM public.jobs_legacy j
JOIN public.recipes r ON r.id = j.id::uuid
WHERE j.user_id IS NOT NULL
  AND j.deleted_at IS NULL
ON CONFLICT (user_id, recipe_id) DO NOTHING;

-- ── 6. Repoint the dependents ───────────────────────────────────────────────
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

ALTER TABLE public.notification_log ADD COLUMN recipe_id uuid;
UPDATE public.notification_log SET recipe_id = job_id::uuid
 WHERE job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE public.notification_log DROP COLUMN job_id;

-- ── 7. Indexes, RLS, and RPCs ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS recipes_created_by_idx   ON public.recipes (created_by);
CREATE INDEX IF NOT EXISTS recipes_public_idx       ON public.recipes (created_at desc) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS recipes_parent_idx       ON public.recipes (parent_recipe_id) WHERE parent_recipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS recipes_tags_idx         ON public.recipes USING gin (tags);

CREATE INDEX IF NOT EXISTS jobs_user_created_idx ON public.jobs (user_id, created_at desc);
CREATE INDEX IF NOT EXISTS jobs_pending_idx      ON public.jobs (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS jobs_user_url_completed_idx ON public.jobs (user_id, source_url_normalized) WHERE status = 'completed';
CREATE UNIQUE INDEX IF NOT EXISTS jobs_active_user_url_idx ON public.jobs (user_id, source_url_normalized) WHERE status IN ('pending', 'scraping', 'processing');
CREATE UNIQUE INDEX IF NOT EXISTS jobs_recipe_id_key ON public.jobs (recipe_id) WHERE recipe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_recipes_user_added_idx ON public.user_recipes (user_id, added_at desc);
CREATE INDEX IF NOT EXISTS user_recipes_recipe_idx     ON public.user_recipes (recipe_id);
CREATE INDEX IF NOT EXISTS user_recipes_fav_idx        ON public.user_recipes (user_id) WHERE is_favorite;

ALTER TABLE public.recipes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_select_own ON public.jobs;
CREATE POLICY jobs_select_own ON public.jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recipes_select_visible ON public.recipes;
CREATE POLICY recipes_select_visible ON public.recipes
  FOR SELECT TO authenticated USING (
    visibility = 'public'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_recipes ur
      WHERE ur.recipe_id = recipes.id AND ur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS user_recipes_own ON public.user_recipes;
CREATE POLICY user_recipes_own ON public.user_recipes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_next_job(worker_id text)
 RETURNS setof public.jobs
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE jobs
  SET status     = 'processing',
      locked_at  = now(),
      locked_by  = worker_id,
      updated_at = now()
  WHERE id = (
    SELECT id FROM jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$function$;

CREATE OR REPLACE FUNCTION public.complete_job(
  p_job_id    uuid,
  p_recipe    jsonb,
  p_llm_usage jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipe    public.recipes%rowtype;
  v_recipe_id uuid;
  v_user_id   uuid;
  v_kind      text;
BEGIN
  SELECT user_id, kind INTO v_user_id, v_kind
  FROM jobs WHERE id = p_job_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'complete_job: job % not found', p_job_id;
  END IF;

  v_recipe            := jsonb_populate_record(null::public.recipes, p_recipe);
  v_recipe.id         := gen_random_uuid();
  v_recipe.created_by := v_user_id;
  v_recipe.origin     := v_kind;
  v_recipe.created_at := now();
  v_recipe.updated_at := now();

  v_recipe.title       := COALESCE(NULLIF(v_recipe.title, ''), 'Rezept');
  v_recipe.visibility  := COALESCE(v_recipe.visibility, CASE WHEN v_kind = 'url' THEN 'public' ELSE 'private' END);
  v_recipe.is_recipe   := COALESCE(v_recipe.is_recipe, true);
  v_recipe.tags        := COALESCE(v_recipe.tags, '{}');
  v_recipe.equipment   := COALESCE(v_recipe.equipment, '{}');
  v_recipe.tips        := COALESCE(v_recipe.tips, '{}');
  v_recipe.image_urls  := COALESCE(v_recipe.image_urls, '{}');
  v_recipe.is_ai_cover := COALESCE(v_recipe.is_ai_cover, false);
  v_recipe.ingredients  := COALESCE(v_recipe.ingredients, '[]'::jsonb);
  v_recipe.instructions := COALESCE(v_recipe.instructions, '[]'::jsonb);
  v_recipe.has_explicit_nutritional_values :=
    COALESCE(v_recipe.has_explicit_nutritional_values, false);

  INSERT INTO recipes VALUES (v_recipe.*) RETURNING id INTO v_recipe_id;

  UPDATE jobs
  SET recipe_id  = v_recipe_id,
      status     = 'completed',
      progress   = null,
      error      = null,
      llm_usage  = p_llm_usage,
      updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO user_recipes (user_id, recipe_id, source_job_id, source)
  VALUES (v_user_id, v_recipe_id, p_job_id,
          CASE WHEN v_kind = 'photo' THEN 'photo'
               WHEN v_kind = 'remix' THEN 'remix'
               ELSE 'extraction' END)
  ON CONFLICT (user_id, recipe_id) DO NOTHING;

  RETURN v_recipe_id;
END;
$function$;

COMMIT;
