import type { Recipe, GeminiUsageInfo } from '../types.js';
import type { RecipeAuditPatch } from './recipeAuditorSchema.js';
import { writeGeminiLog, type TokenUsage, type CostEstimate } from '../logger.js';

/**
 * Returns true if running in a non-production environment or if DEBUG_AUDIT is enabled.
 */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUDIT === 'true';
}

/**
 * Persists recipe audit calls to `gemini_logs` and outputs dev summary in non-production.
 */
export async function recordAuditLog(
  recipe: Recipe,
  patch: RecipeAuditPatch | null,
  usage?: GeminiUsageInfo,
  rawOutput?: string,
  error?: string
): Promise<void> {
  const model = usage?.model || 'gemini-2.5-flash-lite';
  const durationMs = usage?.durationMs || 0;

  await writeGeminiLog({
    timestamp: new Date().toISOString(),
    requestType: 'audit_recipe',
    model,
    durationMs,
    success: !error,
    error,
    input: { title: recipe.title },
    rawOutput,
    parsedOutput: patch ?? undefined,
    tokenUsage: usage?.tokenUsage as TokenUsage | undefined,
    costEstimate: usage?.costEstimate as CostEstimate | undefined,
  }).catch(() => {});

  if (isDevEnvironment()) {
    logAuditDevSummary(recipe, patch, usage);
  }
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
  const tokenStr = usage?.tokenUsage
    ? `${usage.tokenUsage.totalTokens} tokens (in ${usage.tokenUsage.promptTokens} / out ${usage.tokenUsage.candidateTokens})`
    : 'n/a';

  if (!patch) {
    console.log(`\n🔍 [RecipeAuditor:DEV] Audit for "${recipe.title || 'Untitled'}" (${durationStr} | ${tokenStr} | cost≈${costStr}): No patch returned.`);
    return;
  }

  const hasChanges = Boolean(
    patch.ingredientCorrections?.length || patch.addedIngredients?.length ||
    patch.removedIngredients?.length || patch.stepCorrections?.length ||
    patch.addedSteps?.length || patch.removedStepNumbers?.length
  );

  if (!hasChanges) {
    console.log(`\n🔍 [RecipeAuditor:DEV] Audit for "${recipe.title || 'Untitled'}" (${durationStr} | ${tokenStr} | cost≈${costStr}): 0 corrections needed (clean).`);
    return;
  }

  console.log(`\n🔍 [RecipeAuditor:DEV] Audit Patch for "${recipe.title || 'Untitled'}" (${durationStr} | ${tokenStr} | cost≈${costStr}):`);
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
    hasIncompleteSourceInfo: recipe.hasIncompleteSourceInfo ?? false,
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
