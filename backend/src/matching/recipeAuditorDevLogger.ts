import type { Recipe, GeminiUsageInfo } from '../types.js';
import type { RecipeAuditPatch } from './recipeAuditorSchema.js';

/**
 * Returns true if running in a non-production environment or if DEBUG_AUDIT is enabled.
 */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUDIT === 'true';
}

/**
 * Pretty-prints audit diff, performance metrics, and patch details to console in dev mode.
 */
export function logAuditDevSummary(
  recipe: Recipe,
  patch: RecipeAuditPatch | null,
  usage?: GeminiUsageInfo
): void {
  const durationStr = usage?.durationMs ? `${usage.durationMs}ms` : 'n/a';
  const costStr = usage?.costEstimate?.totalCostFormatted ?? 'n/a';

  if (!patch) {
    console.log(`\n🔍 [RecipeAuditor:DEV] Audit for "${recipe.title || 'Untitled'}" (${durationStr}, ${costStr}): No patch returned.`);
    return;
  }

  const hasChanges = Boolean(
    patch.ingredientCorrections?.length || patch.addedIngredients?.length ||
    patch.removedIngredients?.length || patch.stepCorrections?.length ||
    patch.addedSteps?.length || patch.removedStepNumbers?.length
  );

  if (!hasChanges) {
    console.log(`\n🔍 [RecipeAuditor:DEV] Audit for "${recipe.title || 'Untitled'}" (${durationStr}, ${costStr}): 0 corrections needed (clean).`);
    return;
  }

  console.log(`\n🔍 [RecipeAuditor:DEV] Audit Patch for "${recipe.title || 'Untitled'}" (${durationStr}, ${costStr}):`);
  console.log(JSON.stringify(patch, null, 2));
}

/**
 * Logs selected JSON contents of an extracted recipe to console in dev mode.
 */
export function logExtractionDevSummary(
  recipe: Recipe,
  source: string,
  usage?: GeminiUsageInfo
): void {
  const durationStr = usage?.durationMs ? `${usage.durationMs}ms` : 'n/a';
  const costStr = usage?.costEstimate?.totalCostFormatted ?? 'n/a';

  const selectedPayload = {
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    servings: recipe.servings,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    ingredients: (recipe.ingredients || []).map((group) => ({
      group: group.name,
      items: (group.items || []).map((item) => ({
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        baseName: item.baseName,
        category: item.category,
        synonyms: item.synonyms,
      })),
    })),
    instructions: (recipe.instructions || []).map((step) => ({
      step: step.step,
      description: step.description,
    })),
  };

  console.log(`\n📋 [RecipeExtraction:DEV] Extracted Recipe via ${source.toUpperCase()} ("${recipe.title || 'Untitled'}", ${durationStr}, ${costStr}):`);
  console.log(JSON.stringify(selectedPayload, null, 2));
}
