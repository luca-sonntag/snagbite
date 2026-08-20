-- Core schema for the `jobs` table + queue RPC.
--
-- Mirrors the REAL production Supabase schema (read from the live snagbite-prod
-- project), not a reconstruction. Apply this FIRST, then backend/supabase_schema.sql
-- (collections/recipe_collections/feedback/global_settings/buckets + the jobs
-- ALTERs, which are no-ops here since the columns already exist). All idempotent.
--
-- Note: in production `user_id` is nullable with NO FK to auth.users, and
-- claim_next_job sets status='processing' (LANGUAGE sql). Kept identical here.

create table if not exists public.jobs (
  id             text not null,
  url            text not null,
  status         text not null default 'pending'::text,
  error          text,
  recipe         jsonb,
  llm_usage      jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  user_id        uuid,
  parent_job_id  text,
  prompt         text,
  locked_at      timestamptz,
  locked_by      text,
  url_normalized text,
  is_favorite    boolean not null default false,
  flags          text[] not null default '{}'::text[],
  media_bytes    bigint not null default 0,
  constraint jobs_pkey primary key (id)
);

create index if not exists jobs_user_id_idx        on public.jobs(user_id);
create index if not exists jobs_status_idx         on public.jobs(status);
create index if not exists jobs_created_at_idx     on public.jobs(created_at desc);
create index if not exists jobs_url_normalized_idx on public.jobs(url_normalized);

alter table public.jobs enable row level security;
drop policy if exists jobs_select_own on public.jobs;
drop policy if exists jobs_insert_own on public.jobs;
drop policy if exists jobs_update_own on public.jobs;
drop policy if exists jobs_delete_own on public.jobs;
create policy jobs_select_own on public.jobs for select to authenticated using (auth.uid() = user_id);
create policy jobs_insert_own on public.jobs for insert to authenticated with check (auth.uid() = user_id);
create policy jobs_update_own on public.jobs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy jobs_delete_own on public.jobs for delete to authenticated using (auth.uid() = user_id);

-- Atomically claim the oldest pending job for a worker (verbatim from production).
create or replace function public.claim_next_job(worker_id text)
 returns setof public.jobs
 language sql
 security definer
 set search_path to 'public'
as $function$
  update jobs
  set status    = 'processing',
      locked_at = now(),
      locked_by = worker_id,
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
