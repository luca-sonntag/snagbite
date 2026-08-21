-- Verification for 001_split_jobs_recipes.sql. Read-only; run against
-- public.jobs_legacy after the migration and before dropping it.
-- Every query below must return the stated result.

-- 1. Every completed, non-placeholder job produced exactly one recipe.
--    (prod baseline: 122 = 122)
SELECT (SELECT count(*) FROM public.jobs_legacy
         WHERE status = 'completed' AND recipe IS NOT NULL
           AND COALESCE((recipe->>'isProgress')::boolean, false) = false) AS expected,
       (SELECT count(*) FROM public.recipes)                              AS actual;

-- 2. Job count preserved, minus the ownerless legacy row.
SELECT (SELECT count(*) FROM public.jobs_legacy WHERE user_id IS NOT NULL) AS expected,
       (SELECT count(*) FROM public.jobs)                                  AS actual;

-- 3. Cookbook entries = completed, non-soft-deleted, owned recipes.
SELECT (SELECT count(*) FROM public.jobs_legacy
         WHERE status = 'completed' AND recipe IS NOT NULL AND deleted_at IS NULL
           AND user_id IS NOT NULL
           AND COALESCE((recipe->>'isProgress')::boolean, false) = false) AS expected,
       (SELECT count(*) FROM public.user_recipes)                          AS actual;

-- 4. No progress placeholder leaked into recipes. MUST BE 0.
SELECT count(*) AS leaked_placeholders
  FROM public.recipes r JOIN public.jobs_legacy j ON j.id = r.id::text
 WHERE COALESCE((j.recipe->>'isProgress')::boolean, false);

-- 5. Strict 1:1 — no recipe is claimed by two jobs. MUST BE 0.
SELECT count(*) AS duplicate_recipe_owners FROM (
  SELECT recipe_id FROM public.jobs WHERE recipe_id IS NOT NULL
   GROUP BY recipe_id HAVING count(*) > 1
) x;

-- 6. No recipe field was silently dropped: every key that ever appeared in the
--    old JSONB must map to a column or be a deliberate discard. MUST BE 0 ROWS.
SELECT DISTINCT k AS unmapped_key
  FROM public.jobs_legacy j, jsonb_object_keys(j.recipe) k
 WHERE j.recipe IS NOT NULL
   AND k NOT IN (
     -- mapped to columns
     'title','description','emoji','isRecipe','prepTime','cookTime','servings',
     'tags','equipment','tips','imageUrl','imageUrls','imagePrompt','isAiCover',
     'transcript','ingredients','instructions','alternativeIngredients',
     'nutritionalValues','nutritionalEstimates','sourceNutritionalValues',
     'hasExplicitNutritionalValues','nutritionCoverage','instagramHandle',
     'parentJobId','remixPrompt',
     -- deliberate discards
     'id',                                   -- became the row PK
     'parentRecipeTitle',                    -- derived via parent_recipe_id join
     'isProgress','percent','stage',         -- moved to jobs.progress
     'geminiUsage'                           -- moved to llm_usage in 2026-08
   );

-- 7. Field-level spot check. MUST BE 0 ROWS.
SELECT r.id
  FROM public.recipes r JOIN public.jobs_legacy j ON j.id = r.id::text
 WHERE r.title     IS DISTINCT FROM COALESCE(NULLIF(j.recipe->>'title',''), 'Rezept')
    OR r.image_url IS DISTINCT FROM j.recipe->>'imageUrl'
    OR r.emoji     IS DISTINCT FROM j.recipe->>'emoji'
    OR COALESCE(array_length(r.tags, 1), 0)
       IS DISTINCT FROM COALESCE(jsonb_array_length(NULLIF(j.recipe->'tags','null'::jsonb)), 0)
    OR COALESCE(array_length(r.image_urls, 1), 0)
       IS DISTINCT FROM COALESCE(jsonb_array_length(NULLIF(j.recipe->'imageUrls','null'::jsonb)), 0)
    OR jsonb_array_length(r.instructions)
       IS DISTINCT FROM COALESCE(jsonb_array_length(NULLIF(j.recipe->'instructions','null'::jsonb)), 0);

-- 8. Ingredient item count preserved across the flat-array -> group shim.
--    MUST BE 0 ROWS.
SELECT r.id
  FROM public.recipes r JOIN public.jobs_legacy j ON j.id = r.id::text
 WHERE (SELECT COALESCE(sum(jsonb_array_length(g->'items')), 0)
          FROM jsonb_array_elements(r.ingredients) g)
    <> (SELECT CASE
                 WHEN jsonb_typeof(j.recipe->'ingredients') <> 'array' THEN 0
                 WHEN jsonb_array_length(j.recipe->'ingredients') = 0 THEN 0
                 WHEN jsonb_typeof(j.recipe->'ingredients'->0->'items') = 'array'
                   THEN (SELECT COALESCE(sum(jsonb_array_length(g->'items')), 0)
                           FROM jsonb_array_elements(j.recipe->'ingredients') g)
                 ELSE jsonb_array_length(j.recipe->'ingredients')
               END);

-- 9. Dependents survived (prod baseline: 28 collection rows, 2 cook events).
SELECT (SELECT count(*) FROM public.recipe_collections) AS collections,
       (SELECT count(*) FROM public.cook_events WHERE recipe_id IS NOT NULL) AS cook_events;

-- 10. No orphaned references anywhere. All MUST BE 0.
SELECT
  (SELECT count(*) FROM public.user_recipes ur
    LEFT JOIN public.recipes r ON r.id = ur.recipe_id WHERE r.id IS NULL)        AS orphan_user_recipes,
  (SELECT count(*) FROM public.recipe_collections rc
    LEFT JOIN public.user_recipes ur ON ur.id = rc.user_recipe_id WHERE ur.id IS NULL) AS orphan_collections,
  (SELECT count(*) FROM public.jobs j
    LEFT JOIN public.recipes r ON r.id = j.recipe_id
   WHERE j.recipe_id IS NOT NULL AND r.id IS NULL)                                AS orphan_job_recipes;

-- 11. Per-user cookbook sizes, to eyeball against the pre-migration counts.
SELECT user_id, count(*) AS recipes FROM public.user_recipes GROUP BY 1 ORDER BY 1;
