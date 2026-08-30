-- Migration 006: Pantry items, Shopping list, and AI package/shelf-life metadata

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
declare
  v_recipe    public.recipes%rowtype;
  v_recipe_id uuid;
  v_user_id   uuid;
  v_kind      text;
begin
  select user_id, kind into v_user_id, v_kind
  from jobs where id = p_job_id for update;

  if not found then
    raise exception 'complete_job: job % not found', p_job_id;
  end if;

  v_recipe            := jsonb_populate_record(null::public.recipes, p_recipe);
  v_recipe.id         := gen_random_uuid();
  v_recipe.created_by := v_user_id;
  v_recipe.origin     := v_kind;
  v_recipe.created_at := now();
  v_recipe.updated_at := now();

  -- Defaults
  v_recipe.title       := coalesce(nullif(v_recipe.title, ''), 'Rezept');
  -- Automatic visibility: URL extractions default to public, photo and remix default to private
  v_recipe.visibility  := coalesce(v_recipe.visibility, case when v_kind = 'url' then 'public' else 'private' end);
  v_recipe.is_recipe   := coalesce(v_recipe.is_recipe, true);
  v_recipe.tags        := coalesce(v_recipe.tags, '{}');
  v_recipe.equipment   := coalesce(v_recipe.equipment, '{}');
  v_recipe.tips        := coalesce(v_recipe.tips, '{}');
  v_recipe.image_urls  := coalesce(v_recipe.image_urls, '{}');
  v_recipe.is_ai_cover := coalesce(v_recipe.is_ai_cover, false);
  v_recipe.ingredients  := coalesce(v_recipe.ingredients, '[]'::jsonb);
  v_recipe.instructions := coalesce(v_recipe.instructions, '[]'::jsonb);
  v_recipe.has_explicit_nutritional_values :=
    coalesce(v_recipe.has_explicit_nutritional_values, false);

  insert into recipes values (v_recipe.*) returning id into v_recipe_id;

  update jobs
  set recipe_id  = v_recipe_id,
      status     = 'completed',
      progress   = null,
      error      = null,
      llm_usage  = p_llm_usage,
      updated_at = now()
  where id = p_job_id;

  insert into user_recipes (user_id, recipe_id, source_job_id, source)
  values (v_user_id, v_recipe_id, p_job_id,
          case when v_kind = 'photo' then 'photo'
               when v_kind = 'remix' then 'remix'
               else 'extraction' end)
  on conflict (user_id, recipe_id) do nothing;

  return v_recipe_id;
end;
$function$;
