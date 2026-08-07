-- Create the global_settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to select (read) settings
-- (Note: Since the backend uses the service_role client, it bypasses RLS,
-- but this policy is good practice for future frontend/public reads if needed).
CREATE POLICY "Allow public read access to global_settings" 
  ON public.global_settings 
  FOR SELECT 
  TO authenticated, anon 
  USING (true);

-- Insert initial values for the settings and limits
INSERT INTO public.global_settings (key, value, description) VALUES
  ('alpha_active', 'false', 'Enable or disable the alpha tier auto-assignment and access'),
  ('alpha_max_extractions_per_window', '10', 'Number of extractions alpha users can perform in the rolling window'),
  ('alpha_max_saved_recipes', '20', 'Max number of saved recipes alpha users can keep in their cookbook'),
  ('free_max_extractions_per_window', '3', 'Number of extractions free users can perform in the rolling window'),
  ('free_max_saved_recipes', '5', 'Max number of saved recipes free users can keep in their cookbook'),
  ('premium_max_extractions_per_window', '50', 'Number of extractions premium users can perform in the rolling window'),
  ('premium_max_saved_recipes', '-1', 'Max number of saved recipes premium users can keep in their cookbook (-1 for unlimited)'),
  ('free_max_concurrent_extractions', '1', 'Max extractions a free user may run at the same time (free users cannot extract in the background)'),
  ('premium_max_concurrent_extractions', '3', 'Max extractions a premium user may run at the same time in the background'),
  ('max_video_duration_seconds', '90', 'Reject videos longer than this many seconds before downloading (0 disables the check)')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, description = EXCLUDED.description;

-- --- organizing features migration ---

-- Phase A: Add is_favorite to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- Phase B: Add flags to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS flags text[] NOT NULL DEFAULT '{}';

-- Total downloaded media size (audio + video, bytes) per job. Powers the admin "Downloaded MB" metric.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS media_bytes bigint NOT NULL DEFAULT 0;

-- Phase B: Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phase B: Recipe Collections Join Table
CREATE TABLE IF NOT EXISTS public.recipe_collections (
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  job_id text REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (collection_id, job_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS recipe_collections_user_id_idx ON public.recipe_collections(user_id);
CREATE INDEX IF NOT EXISTS recipe_collections_job_id_idx ON public.recipe_collections(job_id);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow users to select their own collections" ON public.collections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own collections" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own collections" ON public.collections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own collections" ON public.collections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to select their own recipe_collections" ON public.recipe_collections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own recipe_collections" ON public.recipe_collections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own recipe_collections" ON public.recipe_collections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own recipe_collections" ON public.recipe_collections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- --- feedback / bug reports migration ---

-- In-app bug reports & feedback submitted from the Settings/Profile tab.
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'bug', -- 'bug' | 'idea'
  message text NOT NULL,
  context jsonb,                    -- device/app context + recent console logs
  screenshot_urls text[],          -- signed URLs into the feedback-screenshots bucket
  created_at timestamptz DEFAULT now()
);

-- Migrate any earlier single-screenshot column to the array form.
ALTER TABLE public.feedback DROP COLUMN IF EXISTS screenshot_url;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS screenshot_urls text[];

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at DESC);

-- Enable RLS. The backend writes via the service_role client (bypasses RLS);
-- these policies are defense-in-depth for any direct authenticated client access.
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select their own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Private storage bucket for feedback screenshots (backend serves signed URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- --- duplicate-extraction fix ---

-- Backstop against two near-simultaneous /extract-recipe requests for the same
-- URL both passing the app-level "no active job yet" check and creating two
-- jobs. Only one non-terminal job per (user, normalized URL) is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_active_user_url_idx
  ON public.jobs (user_id, url_normalized)
  WHERE status IN ('pending', 'scraping', 'processing');

-- --- persistent gemini logging ---

-- Persistent Gemini request & cost logging table for LLM metrics
CREATE TABLE IF NOT EXISTS public.gemini_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  request_type text NOT NULL,
  model text NOT NULL,
  duration_ms integer NOT NULL,
  success boolean NOT NULL,
  error_msg text,
  input_data jsonb,
  token_prompt integer,
  token_candidate integer,
  token_total integer,
  cost_input_usd numeric(10, 6),
  cost_output_usd numeric(10, 6),
  cost_total_usd numeric(10, 6)
);

CREATE INDEX IF NOT EXISTS gemini_logs_created_at_idx ON public.gemini_logs (created_at DESC);

-- Enable RLS (admin-only via service role, no public policies)
ALTER TABLE public.gemini_logs ENABLE ROW LEVEL SECURITY;

-- --- OTA app bundles migration ---

-- OTA app bundles table for self-hosted update server
CREATE TABLE IF NOT EXISTS public.app_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('production', 'alpha')),
  version text NOT NULL,
  storage_path text NOT NULL,
  checksum text NOT NULL,
  min_version_code integer NOT NULL,
  max_version_code integer,
  active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_bundles_channel_version_key UNIQUE (channel, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_bundles_one_active_per_channel
  ON public.app_bundles (channel)
  WHERE active = true;

ALTER TABLE public.app_bundles ENABLE ROW LEVEL SECURITY;

-- Public storage bucket for OTA zip bundles
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-bundles', 'app-bundles', true)
ON CONFLICT (id) DO NOTHING;




-- --- photo import ---

-- Private bucket for user-photographed recipe sources (cookbook pages, recipe
-- cards). Written by POST /api/extract-recipe/photos, read and deleted again by
-- the worker; service-role only, no policies. Photos live here only between the
-- API request and the worker run — orphans are swept by sweepOldPhotoImports.
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', false)
ON CONFLICT (id) DO NOTHING;


-- --- soft-delete for jobs ---

-- Jobs are never physically deleted; instead deleted_at is stamped.
-- This prevents users from circumventing the rate-limit window by deleting
-- completed extractions — getExtractionsForUserInTimeframe deliberately
-- does NOT filter by deleted_at so soft-deleted jobs still consume quota.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial index: speeds up the most common query pattern (only live jobs).
CREATE INDEX IF NOT EXISTS jobs_user_not_deleted_idx
  ON public.jobs (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- --- smart AI push notifications ---

-- FCM device tokens. One user can have multiple devices, so the token itself is
-- the primary key (a token is globally unique in FCM). Written and read only by
-- the backend (service role) via POST/DELETE /api/push/tokens and the
-- notification worker; RLS enabled without policies -> service-role only, like
-- gemini_logs / app_bundles. `disabled` is flipped by the sender when FCM
-- reports the token as UNREGISTERED so dead devices are skipped without a delete.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  token        text PRIMARY KEY,
  user_id      uuid NOT NULL,
  platform     text NOT NULL DEFAULT 'android',
  disabled     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- One row per delivered notification. Drives frequency capping (max N/day/week)
-- and anti-repeat dedupe (don't resend the same recipe / notification type back
-- to back). Service-role only, no policies.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL,
  sent_at  timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL,
  type     text NOT NULL,
  job_id   text,
  title    text
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx
  ON public.notification_log (user_id, sent_at DESC);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- --- gamification (cook rewards / XP / streaks) migration ---
--
-- Server-authoritative points system. The backend (service_role client) is the
-- only writer; the SELECT policies below are defense-in-depth for any future
-- direct authenticated client reads. Everything here is additive — no existing
-- table/column is changed, so it is backwards-compatible with older app builds.

-- cook_events: append-only log of "a user cooked a recipe". The atomic unit that
-- everything (XP, streaks, later leaderboards) is derived from. job_id uses
-- ON DELETE SET NULL so earned XP history survives even a (rare) hard job delete.
CREATE TABLE IF NOT EXISTS public.cook_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  job_id               text REFERENCES public.jobs(id) ON DELETE SET NULL,
  cooked_at            timestamptz NOT NULL DEFAULT now(),
  xp_awarded           int NOT NULL DEFAULT 0,
  coins_awarded        int NOT NULL DEFAULT 0,
  -- Trust / verification (photo is the primary strong signal). The remaining
  -- fields are recorded now but only lightly scored — they let photo-AI, peer
  -- verification and leaderboards plug in later without a schema change.
  has_photo            boolean NOT NULL DEFAULT false,
  photo_path           text,
  verified             boolean NOT NULL DEFAULT false,
  leaderboard_eligible boolean NOT NULL DEFAULT false,
  trust_score          numeric(4,2) NOT NULL DEFAULT 0,
  via_cooking_mode     boolean NOT NULL DEFAULT false,
  timer_elapsed        boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS cook_events_user_time_idx ON public.cook_events (user_id, cooked_at DESC);
CREATE INDEX IF NOT EXISTS cook_events_user_job_idx  ON public.cook_events (user_id, job_id);

-- point_ledger: append-only, one row per grant (never just a running total).
-- Enables time-windowed leaderboards, undo and audit later.
CREATE TABLE IF NOT EXISTS public.point_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  cook_event_id uuid REFERENCES public.cook_events(id) ON DELETE SET NULL,
  delta_xp      int NOT NULL DEFAULT 0,
  delta_coins   int NOT NULL DEFAULT 0,
  reason        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_ledger_user_time_idx ON public.point_ledger (user_id, created_at DESC);

-- user_stats: per-user aggregate (fast reads for the progress tab). Derived from
-- the ledger/events, updated transactionally by the backend on each cook.
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id        uuid PRIMARY KEY,
  xp             bigint NOT NULL DEFAULT 0,
  level          int NOT NULL DEFAULT 1,
  coins          bigint NOT NULL DEFAULT 0,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_cook_date date,
  total_cooks    int NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- user_badges: additive achievements. New badges are just new rows/keys later.
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id   uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges (user_id);

-- Enable RLS. Backend writes via service_role (bypasses RLS); the SELECT-own
-- policies are defense-in-depth for any future direct client read. No client
-- INSERT/UPDATE/DELETE policies — writes are backend-only.
ALTER TABLE public.cook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cook_events_select_own ON public.cook_events;
DROP POLICY IF EXISTS point_ledger_select_own ON public.point_ledger;
DROP POLICY IF EXISTS user_stats_select_own ON public.user_stats;
DROP POLICY IF EXISTS user_badges_select_own ON public.user_badges;
CREATE POLICY cook_events_select_own ON public.cook_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY point_ledger_select_own ON public.point_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_stats_select_own  ON public.user_stats  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_badges_select_own ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Private storage bucket for finished-dish photos (backend serves signed URLs),
-- same pattern as feedback-screenshots / recipe-photos above.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cook-photos', 'cook-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Tunable gamification formula, stored as one JSON settings row so balancing can
-- change without a redeploy. DO NOTHING on conflict so re-applying the schema
-- never clobbers admin-tuned values; the backend carries the same defaults in
-- code (getGamificationConfig) as a fallback when the row is missing.
INSERT INTO public.global_settings (key, value, description) VALUES
  ('gamification_config',
   '{"baseXp":100,"difficultyMultipliers":{"1":1,"2":1.5,"3":2},"repetitionFactors":[1,0.833,0.667,0.5],"repetitionWindowDays":7,"noveltyRecipeBonus":20,"noveltyCuisineBonus":50,"streakTiers":[{"minDays":3,"mult":1.1},{"minDays":7,"mult":1.25},{"minDays":30,"mult":1.5}],"dailySoftcap":{"fullCount":3,"reducedFactor":0.5,"reducedUntilCount":5,"tailFactor":0.25},"coinsPerXp":0.1,"velocityMinSeconds":120,"levelThresholds":[0,500,1200,2200,3500,5100,7000,9300,12000,15100],"badgeXp":{"first_cook":50,"cook_10":150,"cook_25":300,"cook_50":500,"cook_100":1000,"streak_3":100,"streak_7":250,"streak_30":1000,"first_photo":75,"distinct_5":100,"distinct_10":250,"distinct_25":500,"night_owl":75,"weekend_chef":150,"timer_first":50,"timer_10":200,"same_recipe_3":100}}',
   'Gamification point/XP formula (JSON). Tunable at runtime; backend falls back to code defaults if absent.')
ON CONFLICT (key) DO NOTHING;


-- --- social (profiles, friendships, leaderboard) migration ---
--
-- Adds user profiles (self-chosen display name + friend code) and mutual
-- friendships for the friends list + leaderboard. Additive; the backend
-- (service-role) is the only writer. Identity shown to friends is display name
-- + avatar only — never the email.

-- profiles: one row per user. display_name/avatar are deliberately readable by
-- any authenticated user (friends need them); the backend only ever returns
-- friend-scoped data. friend_code is the unguessable handle for adding friends.
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT 'Chef',
  avatar_url   text,
  friend_code  text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- friendships: mutual (request -> accept). One row per ordered (requester,
-- addressee) pair; "my friends" checks both directions in the backend.
CREATE TABLE IF NOT EXISTS public.friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friendships_pair_unique UNIQUE (requester_id, addressee_id),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS friendships_select_own ON public.friendships;
CREATE POLICY friendships_select_own ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id));

-- Weekly XP per user from the point ledger, for the leaderboard's weekly window.
-- Mirrors the claim_next_job RPC pattern (LANGUAGE sql, security definer).
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
