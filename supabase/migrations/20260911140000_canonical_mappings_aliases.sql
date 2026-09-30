-- Migration: Add canonical German key and aliases to ingredient_mappings
-- Enables 1-row-per-food architecture (mapping_key = English, mapping_key_de = German, aliases = synonyms)

ALTER TABLE public.ingredient_mappings
  ADD COLUMN IF NOT EXISTS mapping_key_de text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS ingredient_mappings_key_de_idx
  ON public.ingredient_mappings (mapping_key_de);

CREATE INDEX IF NOT EXISTS ingredient_mappings_aliases_gin
  ON public.ingredient_mappings USING gin(aliases);
