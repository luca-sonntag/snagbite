-- Core schema: `recipes` (content), `jobs` (extraction task) and `user_recipes`
-- (per-user cookbook entry), plus the queue RPCs.
--
-- Apply this FIRST, then backend/supabase_schema.sql (collections/feedback/
-- global_settings/buckets/gamification/social). All idempotent.
--
-- The three tables replace the former single overloaded `jobs` table, where one
-- row was task + recipe content + cookbook entry at once. See the
-- `-- --- jobs/recipes/user_recipes split ---` banner in supabase_schema.sql for
-- the one-time migration of an existing database.
--
-- Note: user_id is NOT FK-constrained to auth.users, matching the original
-- production schema. The backend uses the service-role key and bypasses RLS;
-- the policies below are defense-in-depth (the frontend never queries tables
-- directly — every read goes through the Express API).

-- ── recipes: the content ────────────────────────────────────────────────────
-- Owned by nobody in particular: `created_by` records who extracted it, but a
-- recipe may end up in several users' cookbooks (see user_recipes) and may be
-- published (`visibility`). Scalars are real columns; only genuinely structured
-- lists stay JSONB.
create table if not exists public.recipes (
  id                     uuid primary key default gen_random_uuid(),
  -- Nullable on purpose: account deletion nulls this out rather than cascading,
  -- so recipes other users saved survive.
  created_by             uuid,
  visibility             text not null default 'private'
                           check (visibility in ('private', 'unlisted', 'public')),
  origin                 text not null default 'url'
                           check (origin in ('url', 'photo', 'remix')),
  source_url             text,                       -- NULL for origin='photo'
  source_handle          text,                       -- e.g. the Instagram creator
  parent_recipe_id       uuid references public.recipes(id) on delete set null,
  remix_prompt           text,

  title                  text not null,
  description            text,
  emoji                  text,
  -- Gemini's "this isn't actually a recipe" verdict, kept for auditing.
  is_recipe              boolean not null default true,
  prep_time              int,                        -- minutes
  cook_time              int,                        -- minutes
  -- numeric, not int: half servings scale cleanly.
  servings               numeric,
  tags                   text[] not null default '{}',
  equipment              text[] not null default '{}',
  tips                   text[] not null default '{}',
  image_url              text,
  image_urls             text[] not null default '{}',
  image_prompt           text,                       -- FLUX.1 cover prompt
  is_ai_cover            boolean not null default false,
  transcript             text,

  -- Structured lists. `ingredients` carries the canonical-matcher output per
  -- item (canonicalId, gramsPerUnit, per-item macros, …), so it stays JSONB.
  ingredients             jsonb not null default '[]',
  instructions            jsonb not null default '[]',
  alternative_ingredients jsonb,

  -- Per-serving nutrition, always derived from the ingredients by
  -- enrichRecipeWithCanonicalIngredients — never client-authored. Flattened
  -- into columns because these are the axes we filter and sort on.
  calories                        numeric,
  protein_g                       numeric,
  carbs_g                         numeric,
  fat_g                           numeric,
  -- Per-serving nutrition as literally stated by the source. Pure provenance,
  -- never queried, so it stays JSONB.
  source_nutritional_values       jsonb,
  has_explicit_nutritional_values boolean not null default false,
  -- Share (0..1) of the calories backed by a BLS match rather than an estimate.
  nutrition_coverage              numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_created_by_idx on public.recipes (created_by);
create index if not exists recipes_public_idx     on public.recipes (created_at desc)
  where visibility = 'public';
create index if not exists recipes_parent_idx     on public.recipes (parent_recipe_id)
  where parent_recipe_id is not null;
create index if not exists recipes_tags_idx       on public.recipes using gin (tags);

-- ── jobs: the extraction task ───────────────────────────────────────────────
-- One row per extraction attempt. Job rows are NEVER deleted: they are the
-- audit trail and they back the rolling rate limit, so removing a recipe from a
-- cookbook must not refund quota. Cancelling an in-flight extraction sets
-- status='cancelled' (it used to be a soft delete, which collided with the
-- quota use of the same column).
create table if not exists public.jobs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null,
  kind                  text not null default 'url'
                          check (kind in ('url', 'photo', 'remix')),
  status                text not null default 'pending'
                          check (status in ('pending', 'scraping', 'processing',
                                            'awaiting_frames', 'completed', 'failed', 'cancelled')),
  source_url            text not null,               -- 'photo://<uploadId>' when kind='photo'
  source_url_normalized text,
  -- Remix INPUT: which recipe this job remixes, and with what instruction.
  parent_recipe_id      uuid references public.recipes(id) on delete set null,
  remix_prompt          text,
  -- The OUTPUT. NULL until the job completes.
  recipe_id             uuid references public.recipes(id) on delete set null,
  -- {percent, stage} while running, NULL otherwise. Used to be smuggled through
  -- the recipe column as {isProgress:true, …}.
  progress              jsonb,
  error                 text,
  -- Ephemeral client media hand-off: thumbnail + keyframes received from client.
  -- Nulled immediately upon worker claim (transient; RAM-only for Gemini call).
  client_frames         jsonb,
  -- Cached scraping result for jobs parked in awaiting_frames, avoids 2nd scrape.
  scrape_meta           jsonb,
  -- Token/inference cost of THIS run. Deliberately not on `recipes`: a shared or
  -- published recipe must not carry the extractor's bill.
  llm_usage             jsonb,
  media_bytes           bigint not null default 0,
  locked_at             timestamptz,
  locked_by             text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists jobs_user_created_idx on public.jobs (user_id, created_at desc);
create index if not exists jobs_pending_idx      on public.jobs (created_at) where status = 'pending';
create index if not exists jobs_user_url_completed_idx
  on public.jobs (user_id, source_url_normalized) where status = 'completed';

-- Backstop against two near-simultaneous extract requests for the same URL both
-- passing the app-level "no active job yet" check. Only one non-terminal job per
-- (user, normalized URL) is allowed; createJob catches the 23505 this raises.
create unique index if not exists jobs_active_user_url_idx
  on public.jobs (user_id, source_url_normalized)
  where status in ('pending', 'scraping', 'processing', 'awaiting_frames');

-- Strict 1:1 — a recipe is produced by at most one job. Nails the "no dedup
-- across users" decision into the schema.
create unique index if not exists jobs_recipe_id_key
  on public.jobs (recipe_id) where recipe_id is not null;

-- ── user_recipes: the cookbook entry ────────────────────────────────────────
-- What a user actually sees in their cookbook. Hard-deleted when the user
-- removes a recipe — the quota lives on `jobs`, so this table can delete
-- honestly. `source='share'` is the hook for sharing a recipe without copying
-- its content (a second row pointing at the same recipe_id).
create table if not exists public.user_recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  source_job_id uuid references public.jobs(id) on delete set null,
  source        text not null default 'extraction'
                  check (source in ('extraction', 'photo', 'remix', 'share')),
  is_favorite   boolean not null default false,
  flags         text[] not null default '{}',
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint user_recipes_user_recipe_key unique (user_id, recipe_id)
);

create index if not exists user_recipes_user_added_idx on public.user_recipes (user_id, added_at desc);
create index if not exists user_recipes_recipe_idx     on public.user_recipes (recipe_id);
create index if not exists user_recipes_fav_idx        on public.user_recipes (user_id) where is_favorite;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.recipes      enable row level security;
alter table public.jobs         enable row level security;
alter table public.user_recipes enable row level security;

drop policy if exists jobs_select_own on public.jobs;
create policy jobs_select_own on public.jobs
  for select to authenticated using (auth.uid() = user_id);

-- A recipe is readable when it is public, when you created it, or when it sits
-- in your cookbook. This is the policy the whole split exists for.
drop policy if exists recipes_select_visible on public.recipes;
create policy recipes_select_visible on public.recipes
  for select to authenticated using (
    visibility = 'public'
    or created_by = auth.uid()
    or exists (
      select 1 from public.user_recipes ur
      where ur.recipe_id = recipes.id and ur.user_id = auth.uid()
    )
  );

drop policy if exists user_recipes_own on public.user_recipes;
create policy user_recipes_own on public.user_recipes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Queue RPCs ──────────────────────────────────────────────────────────────

-- Atomically claim the oldest pending job for a worker.
-- NOTE: the return type is `setof public.jobs`, so the RPC contract is
-- implicitly the whole row — adding a column to `jobs` changes what
-- claimNextJob() deserializes, and changing the table shape requires a DROP
-- (CREATE OR REPLACE cannot alter a return type).
create or replace function public.claim_next_job(worker_id text)
 returns setof public.jobs
 language sql
 security definer
 set search_path to 'public'
as $function$
  update jobs
  set status     = 'processing',
      locked_at  = now(),
      locked_by  = worker_id,
      updated_at = now()
  where id = (
    select id from jobs
    where status = 'pending'
    order by created_at asc
    limit 1
    for update skip locked
  )
  returning *;
$function$;

-- JSONB array -> text[], tolerating a missing key or a JSON null (both yield
-- NULL, so callers coalesce). Used by the split migration in supabase_schema.sql.
create or replace function public.jsonb_text_array(p jsonb)
 returns text[]
 language sql
 immutable
as $function$
  select case when jsonb_typeof(p) = 'array'
              then array(select jsonb_array_elements_text(p))
         end;
$function$;

-- Finish a job: insert the recipe, point the job at it and put it into the
-- owner's cookbook — atomically. Completion used to be a single UPDATE; after
-- the split it spans three tables, and a crash in between would leave either a
-- completed job with no recipe (quota spent, nothing delivered) or a recipe in
-- nobody's cookbook.
--
-- `p_recipe` is already column-shaped (snake_case keys matching public.recipes),
-- built by recipeToRow() in backend/src/db.ts — so the JSON->column mapping
-- lives in exactly one place, in TypeScript, and this function just populates a
-- record. `created_by` and `origin` are taken from the job, not from the payload.
create or replace function public.complete_job(
  p_job_id    uuid,
  p_recipe    jsonb,
  p_llm_usage jsonb
)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  -- populate_record over a NULL base does not apply column defaults, so the
  -- NOT NULL columns are backstopped here rather than relying on the caller.
  v_recipe.title       := coalesce(nullif(v_recipe.title, ''), 'Rezept');
  v_recipe.visibility  := coalesce(v_recipe.visibility, 'private');
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
