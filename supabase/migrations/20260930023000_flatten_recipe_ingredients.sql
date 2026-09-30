-- Migration: Flatten recipe ingredients from nested groups ({ name, items: [] }) to flat Ingredient[] list.
-- Adapts stored recipes to the flat Ingredient[] array structure introduced on 2026-09-30.

DO $$
BEGIN
  -- Update all recipes that still use the nested { name, items: [] } group structure
  UPDATE public.recipes
  SET ingredients = COALESCE(
    (
      SELECT jsonb_agg(
        CASE 
          WHEN g.value->>'name' IS NOT NULL 
           AND g.value->>'name' <> '' 
           AND lower(trim(g.value->>'name')) NOT IN ('ingredients', 'zutaten', 'hauptzutaten', 'default', 'allgemein')
          THEN (i.value || jsonb_build_object('section', trim(g.value->>'name')))
          ELSE i.value
        END
      )
      FROM jsonb_array_elements(ingredients) AS g(value),
           jsonb_array_elements(
             CASE 
               WHEN jsonb_typeof(g.value->'items') = 'array' THEN g.value->'items'
               ELSE '[]'::jsonb
             END
           ) AS i(value)
    ),
    '[]'::jsonb
  )
  WHERE jsonb_typeof(ingredients) = 'array'
    AND jsonb_array_length(ingredients) > 0
    AND jsonb_typeof(ingredients->0->'items') = 'array';
END $$;
