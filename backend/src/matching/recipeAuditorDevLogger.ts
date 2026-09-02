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
  const hr = '─'.repeat(68);
  const doubleHr = '═'.repeat(68);

  const durationStr = usage?.durationMs ? `${usage.durationMs}ms` : 'n/a';
  const tokensStr = usage?.tokenUsage
    ? `${usage.tokenUsage.promptTokens} in / ${usage.tokenUsage.candidateTokens} out (total ${usage.tokenUsage.totalTokens})`
    : 'n/a';
  const costStr = usage?.costEstimate?.totalCostFormatted ?? 'n/a';

  console.log(`\n${doubleHr}`);
  console.log(`🔍 [RecipeAuditor:DEV] Audit Result for "${recipe.title || 'Untitled'}"`);
  console.log(`⏱️ Duration: ${durationStr} | 🪙 Tokens: ${tokensStr} | 💵 Cost: ${costStr}`);
  console.log(hr);

  if (!patch) {
    console.log('⚠️  No patch returned (audit skipped, failed, or model returned empty text).');
    console.log(doubleHr);
    return;
  }

  const hasCorrections = Boolean(patch.ingredientCorrections?.length);
  const hasAddedIngs = Boolean(patch.addedIngredients?.length);
  const hasRemovedIngs = Boolean(patch.removedIngredients?.length);
  const hasStepCorrections = Boolean(patch.stepCorrections?.length);
  const hasAddedSteps = Boolean(patch.addedSteps?.length);
  const hasRemovedSteps = Boolean(patch.removedStepNumbers?.length);

  const hasAnyChange = hasCorrections || hasAddedIngs || hasRemovedIngs || hasStepCorrections || hasAddedSteps || hasRemovedSteps;

  if (!hasAnyChange) {
    console.log('✅ 0 issues found — All ingredients and steps are 100% verified & consistent.');
    console.log(doubleHr);
    return;
  }

  console.log('⚡ Patches Applied:');

  if (hasCorrections) {
    console.log(`  🔧 INGREDIENT CORRECTIONS (${patch.ingredientCorrections!.length}):`);
    for (const corr of patch.ingredientCorrections!) {
      const origGroup = (recipe.ingredients || []).find((g) =>
        (g.items || []).some((i) => (i.name || '').trim().toLowerCase() === corr.originalName.trim().toLowerCase())
      );
      const orig = origGroup?.items.find((i) => (i.name || '').trim().toLowerCase() === corr.originalName.trim().toLowerCase());
      const oldBase = orig?.baseName ? `"${orig.baseName}"` : 'unset';
      const newBase = corr.correctedBaseName ? `"${corr.correctedBaseName}"` : oldBase;
      const catChange = corr.correctedCategory ? ` [cat: ${corr.correctedCategory}]` : '';
      console.log(`     • "${corr.originalName}": baseName ${oldBase} -> ${newBase}${catChange}`);
      if (corr.correctedCategory && origGroup && origGroup.name.toUpperCase() !== corr.correctedCategory.toUpperCase()) {
        console.log(`       ↳ Relocation: group "${origGroup.name}" -> "${corr.correctedCategory}"`);
      }
      console.log(`       ↳ Reason: ${corr.reason}`);
    }
  }

  if (hasAddedIngs) {
    console.log(`  ➕ ADDED INGREDIENTS (${patch.addedIngredients!.length}):`);
    for (const added of patch.addedIngredients!) {
      const qty = `${added.amount ?? 1} ${added.unit ?? 'Stück'}`.trim();
      console.log(`     • "${added.name}" (${qty}) [baseName: "${added.baseName}", cat: ${added.category}]`);
      console.log(`       ↳ Reason: ${added.reason}`);
    }
  }

  if (hasRemovedIngs) {
    console.log(`  ➖ REMOVED INGREDIENTS (${patch.removedIngredients!.length}):`);
    for (const rem of patch.removedIngredients!) {
      console.log(`     • "${rem.name}"`);
      console.log(`       ↳ Reason: ${rem.reason}`);
    }
  }

  if (hasStepCorrections) {
    console.log(`  📝 STEP CORRECTIONS (${patch.stepCorrections!.length}):`);
    for (const step of patch.stepCorrections!) {
      console.log(`     • Step ${step.stepNumber}: "${step.correctedDescription}"`);
      console.log(`       ↳ Reason: ${step.reason}`);
    }
  }

  if (hasAddedSteps) {
    console.log(`  ➕ ADDED STEPS (${patch.addedSteps!.length}):`);
    for (const step of patch.addedSteps!) {
      const pos = step.insertAfterStep !== undefined ? `after step ${step.insertAfterStep}` : 'at end';
      console.log(`     • Insert ${pos}: "${step.description}"`);
      console.log(`       ↳ Reason: ${step.reason}`);
    }
  }

  if (hasRemovedSteps) {
    console.log(`  ➖ REMOVED STEPS: [${patch.removedStepNumbers!.join(', ')}]`);
  }

  if (process.env.DEBUG_AUDIT === 'true') {
    console.log(hr);
    console.log('📦 Raw Audit Patch JSON:');
    console.log(JSON.stringify(patch, null, 2));
  }

  console.log(`${doubleHr}\n`);
}
