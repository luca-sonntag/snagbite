-- Migration: Create meal_plans table for weekly meal planner
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  recipe_id  uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  plan_date  date NOT NULL,
  meal_type  text NOT NULL DEFAULT 'dinner'
               CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings   numeric NOT NULL DEFAULT 2,
  is_cooked  boolean NOT NULL DEFAULT false,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all required columns exist and remove legacy NOT NULL constraints from older prototype tables:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'recipe_id') THEN
    ALTER TABLE public.meal_plans ADD COLUMN recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'plan_date') THEN
    ALTER TABLE public.meal_plans ADD COLUMN plan_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'meal_type') THEN
    ALTER TABLE public.meal_plans ADD COLUMN meal_type text NOT NULL DEFAULT 'dinner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'is_cooked') THEN
    ALTER TABLE public.meal_plans ADD COLUMN is_cooked boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'notes') THEN
    ALTER TABLE public.meal_plans ADD COLUMN notes text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'num_dishes') THEN
    ALTER TABLE public.meal_plans ALTER COLUMN num_dishes DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'goal') THEN
    ALTER TABLE public.meal_plans ALTER COLUMN goal DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'rationale') THEN
    ALTER TABLE public.meal_plans ALTER COLUMN rationale DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'title') THEN
    ALTER TABLE public.meal_plans ALTER COLUMN title DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meal_plans' AND column_name = 'start_date') THEN
    ALTER TABLE public.meal_plans ALTER COLUMN start_date DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON public.meal_plans(user_id, plan_date);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meal_plans' AND policyname = 'Users manage own meal plans'
  ) THEN
    CREATE POLICY "Users manage own meal plans"
      ON public.meal_plans FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
