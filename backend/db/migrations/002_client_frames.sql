-- Migration 002: Add client_frames and scrape_meta for client media streaming
-- Allows client to extract keyframes locally and submit them to a parked job.

-- 1. Extend status check constraint
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending', 'scraping', 'processing', 'awaiting_frames', 'completed', 'failed', 'cancelled'));

-- 2. Add client_frames and scrape_meta columns (idempotent)
alter table public.jobs add column if not exists client_frames jsonb;
alter table public.jobs add column if not exists scrape_meta jsonb;

-- 3. Update partial unique index on active jobs to include awaiting_frames
drop index if exists public.jobs_active_user_url_idx;
create unique index if not exists jobs_active_user_url_idx
  on public.jobs (user_id, source_url_normalized)
  where status in ('pending', 'scraping', 'processing', 'awaiting_frames');
