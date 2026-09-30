-- Baseline migration representing production database schema at Release v1.1.9 (2026-08-07).
-- Core jobs table, collections, feedback, settings, logs, push tokens, and gamification.

-- 1. Core extraction jobs table (monolithic v1.1.9 schema)
CREATE TABLE IF NOT EXISTS public.jobs (
  id             text NOT NULL,
  url            text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'::text,
  error          text,
  recipe         jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  user_id        uuid,
  parent_job_id  text,
  prompt         text,
  locked_at      timestamptz,
  locked_by      text,
  url_normalized text,
  is_favorite    boolean NOT NULL DEFAULT false,
  flags          text[] NOT NULL DEFAULT '{}'::text[],
  media_bytes    bigint NOT NULL DEFAULT 0,
  deleted_at     timestamptz DEFAULT NULL,
  CONSTRAINT jobs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS jobs_user_id_idx        ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx         ON public.jobs(status);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx     ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_url_normalized_idx ON public.jobs(url_normalized);
CREATE INDEX IF NOT EXISTS jobs_user_not_deleted_idx ON public.jobs (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_active_user_url_idx ON public.jobs (user_id, url_normalized) WHERE status IN ('pending', 'scraping', 'processing');

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_select_own ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_own ON public.jobs;
DROP POLICY IF EXISTS jobs_update_own ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_own ON public.jobs;
CREATE POLICY jobs_select_own ON public.jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY jobs_insert_own ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY jobs_update_own ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY jobs_delete_own ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_next_job(worker_id text)
 RETURNS setof public.jobs
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE jobs
  SET status    = 'processing',
      locked_at = now(),
      locked_by = worker_id,
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

-- 2. Global settings
CREATE TABLE IF NOT EXISTS public.global_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to global_settings" ON public.global_settings;
CREATE POLICY "Allow public read access to global_settings" 
  ON public.global_settings 
  FOR SELECT 
  TO authenticated, anon 
  USING (true);

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

-- 3. Collections
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_collections (
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  job_id text REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (collection_id, job_id)
);

CREATE INDEX IF NOT EXISTS collections_user_id_idx ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS recipe_collections_user_id_idx ON public.recipe_collections(user_id);
CREATE INDEX IF NOT EXISTS recipe_collections_job_id_idx ON public.recipe_collections(job_id);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to select their own collections" ON public.collections;
DROP POLICY IF EXISTS "Allow users to insert their own collections" ON public.collections;
DROP POLICY IF EXISTS "Allow users to update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Allow users to delete their own collections" ON public.collections;
CREATE POLICY "Allow users to select their own collections" ON public.collections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own collections" ON public.collections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own collections" ON public.collections FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to select their own recipe_collections" ON public.recipe_collections;
DROP POLICY IF EXISTS "Allow users to insert their own recipe_collections" ON public.recipe_collections;
DROP POLICY IF EXISTS "Allow users to update their own recipe_collections" ON public.recipe_collections;
DROP POLICY IF EXISTS "Allow users to delete their own recipe_collections" ON public.recipe_collections;
CREATE POLICY "Allow users to select their own recipe_collections" ON public.recipe_collections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own recipe_collections" ON public.recipe_collections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own recipe_collections" ON public.recipe_collections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own recipe_collections" ON public.recipe_collections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'bug',
  message text NOT NULL,
  context jsonb,
  screenshot_urls text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to select their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow users to insert their own feedback" ON public.feedback;
CREATE POLICY "Allow users to select their own feedback" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Gemini logs
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
ALTER TABLE public.gemini_logs ENABLE ROW LEVEL SECURITY;

-- 6. OTA App bundles
CREATE TABLE IF NOT EXISTS public.app_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('production', 'alpha', 'internal')),
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

CREATE UNIQUE INDEX IF NOT EXISTS app_bundles_one_active_per_channel ON public.app_bundles (channel) WHERE active = true;
ALTER TABLE public.app_bundles ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-bundles', 'app-bundles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Push tokens & notifications
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

CREATE TABLE IF NOT EXISTS public.notification_log (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL,
  sent_at  timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL,
  type     text NOT NULL,
  job_id   text,
  title    text
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx ON public.notification_log (user_id, sent_at DESC);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- 8. Gamification
CREATE TABLE IF NOT EXISTS public.cook_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  job_id               text REFERENCES public.jobs(id) ON DELETE SET NULL,
  cooked_at            timestamptz NOT NULL DEFAULT now(),
  xp_awarded           int NOT NULL DEFAULT 0,
  coins_awarded        int NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id   uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges (user_id);

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

INSERT INTO storage.buckets (id, name, public)
VALUES ('cook-photos', 'cook-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.global_settings (key, value, description) VALUES
  ('gamification_config',
   '{"baseXp":100,"difficultyMultipliers":{"1":1,"2":1.5,"3":2},"repetitionFactors":[1,0.833,0.667,0.5],"repetitionWindowDays":7,"noveltyRecipeBonus":20,"noveltyCuisineBonus":50,"streakTiers":[{"minDays":3,"mult":1.1},{"minDays":7,"mult":1.25},{"minDays":30,"mult":1.5}],"dailySoftcap":{"fullCount":3,"reducedFactor":0.5,"reducedUntilCount":5,"tailFactor":0.25},"coinsPerXp":0.1,"velocityMinSeconds":120,"levelThresholds":[0,500,1200,2200,3500,5100,7000,9300,12000,15100],"badgeXp":{"first_cook":50,"cook_10":150,"cook_25":300,"cook_50":500,"cook_100":1000,"streak_3":100,"streak_7":250,"streak_30":1000,"first_photo":75,"distinct_5":100,"distinct_10":250,"distinct_25":500,"night_owl":75,"weekend_chef":150,"timer_first":50,"timer_10":200,"same_recipe_3":100}}',
   'Gamification point/XP formula (JSON). Tunable at runtime; backend falls back to code defaults if absent.')
ON CONFLICT (key) DO NOTHING;
