-- Migration: Add client_frames and scrape_meta for client media streaming
-- Allows client to extract keyframes locally and submit them to a parked job.

-- 1. Extend status check constraint
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'scraping', 'processing', 'awaiting_frames', 'completed', 'failed', 'cancelled'));

-- 2. Add client_frames and scrape_meta columns
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS client_frames jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS scrape_meta jsonb;

-- 3. Update partial unique index on active jobs to include awaiting_frames
DROP INDEX IF EXISTS public.jobs_active_user_url_idx;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_active_user_url_idx
  ON public.jobs (user_id, source_url_normalized)
  WHERE status IN ('pending', 'scraping', 'processing', 'awaiting_frames');
