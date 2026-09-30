-- Migration: Add profiles, friendships, and weekly leaderboard XP functions

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

-- Weekly XP per user from the point ledger, for the leaderboard weekly window
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

-- Global Weekly XP across all users from the point ledger
CREATE OR REPLACE FUNCTION public.global_weekly_xp(since timestamptz, limit_count int DEFAULT 50)
 RETURNS TABLE (user_id uuid, xp bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pl.user_id, COALESCE(SUM(pl.delta_xp), 0)::bigint AS xp
  FROM point_ledger pl
  WHERE pl.created_at >= since
  GROUP BY pl.user_id
  ORDER BY xp DESC
  LIMIT limit_count;
$function$;
