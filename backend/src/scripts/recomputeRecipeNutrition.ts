/**
 * One-off migration: rebuild per-ingredient and recipe-level nutrition from BLS.
 *
 * Stored recipes accumulated two defects that this brings in line with the
 * now-derived model (see `enrichRecipeWithCanonicalIngredients`):
 *
 *   1. Inflated per-ingredient macros. The adjust-servings sheet used to multiply
 *      every ingredient's absolute macros by base/target while leaving `amount`
 *      untouched, so a recipe corrected from 4 servings to 1 ended up with each
 *      ingredient claiming four times its real values.
 *   2. Indistinguishable recipe totals. `nutritionalValues` held either a figure
 *      stated by the source or a computed sum, with no way to tell them apart
 *      afterwards, and remixes/photo imports left model estimates in place.
 *
 * Re-running the matcher fixes both: every ingredient is recomputed from its own
 * `amount`/`unit` against BLS, and the recipe total becomes the ingredient sum.
 * A pre-existing `nutritionalValues` cannot be reclassified as source-stated in
 * hindsight, so it is preserved under `sourceNutritionalValues` only when it
 * diverges from the freshly computed sum by more than 10% — a near-identical
 * value was a computed one and carries no extra information.
 *
 * Idempotent. Run with DRY_RUN=1 to preview without writing.
 *
 *   npx tsx src/scripts/recomputeRecipeNutrition.ts
 *   DRY_RUN=1 npx tsx src/scripts/recomputeRecipeNutrition.ts
 */
import { getClient, rowToRecipe, recipeToRow } from '../db.js';
import { enrichRecipeWithCanonicalIngredients } from '../matching/ingredientMatcher.js';
import type { Recipe } from '../types.js';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const PAGE_SIZE = 200;
/** Relative gap above which a pre-existing total is treated as genuinely source-stated. */
const DIVERGENCE_THRESHOLD = 0.1;

function hasIngredients(recipe: any): recipe is Recipe {
  return !!(
    recipe &&
    typeof recipe === 'object' &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.some((g: any) => Array.isArray(g?.items) && g.items.length > 0)
  );
}

async function main(): Promise<void> {
  console.log(`Recomputing recipe nutrition from BLS${DRY_RUN ? ' (DRY RUN)' : ''}...`);
  const client = getClient();

  let from = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let sourceKept = 0;

  for (;;) {
    const { data, error } = await client
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to page recipes: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      const recipe = rowToRecipe(row as any) as any;

      // A recipe without an ingredient list has nothing to derive from — leaving
      // it untouched is the only safe outcome. (Progress placeholders used to
      // land here too, back when the recipe column doubled as the progress
      // channel; they now live in jobs.progress and never reach this table.)
      if (!hasIngredients(recipe)) {
        skipped++;
        continue;
      }

      const previousTotal = recipe.nutritionalValues?.calories;
      const previousSource = recipe.sourceNutritionalValues;

      await enrichRecipeWithCanonicalIngredients(recipe);

      const computed = recipe.nutritionalValues?.calories ?? 0;

      // Preserve a plausible source-stated figure, but never invent one: only a
      // value that clearly disagrees with the computed sum can have come from the
      // source rather than from an earlier run of this same computation.
      if (previousSource === undefined && typeof previousTotal === 'number' && previousTotal > 0 && computed > 0) {
        const divergence = Math.abs(previousTotal - computed) / computed;
        if (divergence >= DIVERGENCE_THRESHOLD) {
          recipe.sourceNutritionalValues = { calories: previousTotal };
          recipe.hasExplicitNutritionalValues = true;
          sourceKept++;
        } else {
          recipe.sourceNutritionalValues = null;
          recipe.hasExplicitNutritionalValues = false;
        }
      }

      updated++;
      if (DRY_RUN) {
        console.log(
          `[dry-run] recipe ${row.id}: ${previousTotal ?? '—'} → ${computed} kcal/serving ` +
          `(coverage ${Math.round((recipe.nutritionCoverage ?? 0) * 100)}%)`
        );
        continue;
      }

      const { error: updateError } = await client
        .from('recipes')
        .update(recipeToRow(recipe))
        .eq('id', row.id);
      if (updateError) {
        console.error(`Failed to update recipe ${row.id}: ${updateError.message}`);
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(
    `Scanned ${scanned} recipes: ${updated} recomputed${DRY_RUN ? ' (no writes)' : ''}, ` +
    `${skipped} skipped (no ingredients), ${sourceKept} kept a diverging source figure.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
