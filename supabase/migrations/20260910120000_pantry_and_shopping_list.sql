-- Migration: Pantry items, Shopping list, and AI package/shelf-life metadata

-- 1. Extend ingredient_mappings with package and shelf life metadata
ALTER TABLE public.ingredient_mappings
  ADD COLUMN IF NOT EXISTS typical_package_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS typical_package_unit text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shelf_life_days integer DEFAULT NULL;

-- 2. Create pantry_items table for per-user inventory management
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  base_name text,
  mapping_key text,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  canonical_id text,
  notes text,
  expires_at date,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pantry_items_user_expires_idx
  ON public.pantry_items (user_id, expires_at);
CREATE INDEX IF NOT EXISTS pantry_items_user_key_idx
  ON public.pantry_items (user_id, mapping_key);
CREATE INDEX IF NOT EXISTS pantry_items_user_basename_idx
  ON public.pantry_items (user_id, base_name);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pantry_items' AND policyname = 'Users manage own pantry items'
  ) THEN
    CREATE POLICY "Users manage own pantry items"
      ON public.pantry_items FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Create shopping_list table for persistent server-side shopping lists
CREATE TABLE IF NOT EXISTS public.shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  base_name text,
  parent_ingredient jsonb,
  modifier text,
  brand text,
  amount numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  recipe_title text,
  checked boolean NOT NULL DEFAULT false,
  category text,
  canonical_id text,
  notes text,
  in_pantry_warning boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shopping_list_user_checked_idx
  ON public.shopping_list (user_id, checked, created_at DESC);
CREATE INDEX IF NOT EXISTS shopping_list_user_recipe_idx
  ON public.shopping_list (user_id, recipe_id);

ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shopping_list' AND policyname = 'Users manage own shopping list'
  ) THEN
    CREATE POLICY "Users manage own shopping list"
      ON public.shopping_list FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Update complete_job RPC to default visibility to 'public' for URL extractions
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
