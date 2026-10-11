-- ============================================================================
-- 5 Active Core Postgres Functions / RPCs
-- ============================================================================

-- 1. claim_next_job: Atomically claim next pending job with FOR UPDATE SKIP LOCKED
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

-- 2. complete_job: Atomically insert recipe and complete job with user_recipes entry
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

  -- Defaults
  v_recipe.title       := COALESCE(NULLIF(v_recipe.title, ''), 'Rezept');
  -- Automatic visibility: URL extractions default to public, photo and remix default to private
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

-- 3. bump_ingredient_mapping_hits: Batch increment hit counters on ingredient mappings
CREATE OR REPLACE FUNCTION public.bump_ingredient_mapping_hits(keys text[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.ingredient_mappings
  SET hit_count = hit_count + 1
  WHERE mapping_key = ANY(keys);
$$;

-- 4. weekly_xp_for_users: Aggregate weekly XP for a given list of user UUIDs
CREATE OR REPLACE FUNCTION public.weekly_xp_for_users(uids uuid[], since timestamptz)
 RETURNS TABLE (user_id uuid, xp bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pl.user_id, COALESCE(SUM(pl.delta_xp), 0)::bigint AS xp
  FROM point_ledger pl
  WHERE pl.user_id = ANY(uids)
    AND pl.created_at >= since
  GROUP BY pl.user_id;
$function$;

-- 5. global_weekly_xp: Top global XP leaderboard within a time window
CREATE OR REPLACE FUNCTION public.global_weekly_xp(since timestamptz, limit_count int DEFAULT 50)
 RETURNS TABLE (user_id uuid, xp bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pl.user_id, COALESCE(SUM(pl.delta_xp), 0)::bigint AS xp
  FROM point_ledger pl
  WHERE pl.created_at >= since
  GROUP BY pl.user_id
  ORDER BY xp DESC
  LIMIT limit_count;
$function$;
