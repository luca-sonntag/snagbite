-- Migration 004: Create or alter meal_plans table for weekly meal planner
create table if not exists public.meal_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  plan_date  date not null,
  meal_type  text not null default 'dinner'
               check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  servings   numeric not null default 2,
  is_cooked  boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure all required columns exist and remove legacy NOT NULL constraints from older prototype tables:
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'recipe_id') then
    alter table public.meal_plans add column recipe_id uuid references public.recipes(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'plan_date') then
    alter table public.meal_plans add column plan_date date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'meal_type') then
    alter table public.meal_plans add column meal_type text not null default 'dinner';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'is_cooked') then
    alter table public.meal_plans add column is_cooked boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'notes') then
    alter table public.meal_plans add column notes text;
  end if;

  -- Remove NOT NULL constraints on legacy columns if present from earlier prototypes
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'num_dishes') then
    alter table public.meal_plans alter column num_dishes drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'goal') then
    alter table public.meal_plans alter column goal drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'rationale') then
    alter table public.meal_plans alter column rationale drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'title') then
    alter table public.meal_plans alter column title drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plans' and column_name = 'start_date') then
    alter table public.meal_plans alter column start_date drop not null;
  end if;
end $$;

-- Index for fast user-specific date range queries
create index if not exists idx_meal_plans_user_date on public.meal_plans(user_id, plan_date);

-- Enable RLS
alter table public.meal_plans enable row level security;

-- Policies for RLS
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'meal_plans' and policyname = 'Users manage own meal plans'
  ) then
    create policy "Users manage own meal plans"
      on public.meal_plans for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
