-- Migration: Add learned ingredient mapping store table and hit counter RPC

CREATE TABLE IF NOT EXISTS public.ingredient_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_key text NOT NULL,
  category text NOT NULL DEFAULT '',
  product_code text,
  resolution text NOT NULL CHECK (resolution IN ('matched', 'no_match')),
  estimated_nutrients jsonb,
  source text NOT NULL DEFAULT 'agent' CHECK (source IN ('static', 'agent', 'human')),
  confidence numeric(3, 2),
  model text,
  reasoning text,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (mapping_key, category)
);

CREATE INDEX IF NOT EXISTS ingredient_mappings_key_idx
  ON public.ingredient_mappings (mapping_key);
CREATE INDEX IF NOT EXISTS ingredient_mappings_source_created_idx
  ON public.ingredient_mappings (source, created_at DESC);

ALTER TABLE public.ingredient_mappings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_ingredient_mapping_hits(keys text[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.ingredient_mappings
  SET hit_count = hit_count + 1
  WHERE mapping_key = ANY(keys);
$$;
