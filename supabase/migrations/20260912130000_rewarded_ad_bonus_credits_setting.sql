-- Migration: Add rewarded_ad_bonus_credits key to global_settings

INSERT INTO public.global_settings (key, value, description)
VALUES ('rewarded_ad_bonus_credits', '3', 'Number of recipe extractions granted when watching a rewarded video ad')
ON CONFLICT (key) DO NOTHING;
