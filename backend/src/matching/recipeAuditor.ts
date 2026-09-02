import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import type { Recipe, GeminiUsageInfo } from '../types.js';
import { estimateCost, type TokenUsage } from '../logger.js';
import { withRetry } from '../retry.js';
import {
  auditPatchSchema, buildAuditPrompt,
  type RecipeAuditPatch, type RecipeAuditResult,
  type IngredientCorrection, type AddedIngredient,
  type RemovedIngredient, type StepCorrection, type AddedStep,
} from './recipeAuditorSchema.js';

export type { RecipeAuditPatch, RecipeAuditResult, IngredientCorrection, AddedIngredient, RemovedIngredient, StepCorrection, AddedStep };

export async function auditRecipe(recipe: Recipe): Promise<RecipeAuditResult> {
  if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') return { patch: null };
  const modelName = 'gemini-2.5-flash-lite';
  const startTime = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: auditPatchSchema as unknown as Record<string, unknown>,
        temperature: 0.1,
      } as unknown as Record<string, unknown>,
    });

    const result = await withRetry(() => model.generateContent([buildAuditPrompt(recipe)]), { maxAttempts: 2, baseDelayMs: 1000 });
    const text = result.response.text();
    if (!text) return { patch: null };
    const patch = JSON.parse(text) as RecipeAuditPatch;

    const usageMeta = result.response.usageMetadata;
    const tokenUsage: TokenUsage | undefined = usageMeta
      ? { promptTokens: usageMeta.promptTokenCount ?? 0, candidateTokens: usageMeta.candidatesTokenCount ?? 0, totalTokens: usageMeta.totalTokenCount ?? 0 }
      : undefined;
    const costEstimate = tokenUsage ? estimateCost(modelName, tokenUsage) : undefined;
    const usage: GeminiUsageInfo = { tokenUsage, costEstimate, durationMs: Date.now() - startTime, model: modelName };

    return { patch, usage };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[recipeAuditor] audit failed, proceeding with original recipe:', msg);
    return { patch: null };
  }
}

export function applyRecipeAuditPatch(recipe: Recipe, patch: RecipeAuditPatch | null | undefined): Recipe {
  if (!patch) return { ...recipe };
  const hasChanges = Boolean(
    patch.ingredientCorrections?.length || patch.addedIngredients?.length ||
    patch.removedIngredients?.length || patch.stepCorrections?.length ||
    patch.addedSteps?.length || patch.removedStepNumbers?.length
  );
  if (!hasChanges) return { ...recipe };

  const norm = (s?: string) => (s || '').toLowerCase().replace(/[,;:./\\()\-–—_!?'"`„“"»«[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const result: Recipe = {
    ...recipe,
    ingredients: (recipe.ingredients || []).map((g) => ({ ...g, items: (g.items || []).map((i) => ({ ...i })) })),
    instructions: (recipe.instructions || []).map((s) => ({ ...s })),
  };

  // 1. Remove ingredients
  if (patch.removedIngredients?.length) {
    const removeNorms = new Set(patch.removedIngredients.map((r) => norm(r.name)));
    result.ingredients = result.ingredients
      .map((g) => ({ ...g, items: g.items.filter((i) => !removeNorms.has(norm(i.name))) }))
      .filter((g) => g.items.length > 0);
  }

  // 2. Correct ingredients
  if (patch.ingredientCorrections?.length) {
    for (const group of result.ingredients) {
      group.items = group.items.map((ing) => {
        const ingNorm = norm(ing.name);
        const corr = patch.ingredientCorrections?.find((c) => norm(c.originalName) === ingNorm);
        if (!corr) return ing;
        return {
          ...ing,
          ...(corr.correctedBaseName ? { baseName: corr.correctedBaseName.trim() } : {}),
          ...(corr.correctedCategory ? { category: corr.correctedCategory.trim() } : {}),
          ...(corr.correctedSynonyms ? { synonyms: corr.correctedSynonyms.map((s) => s.trim()).filter(Boolean) } : {}),
        };
      });
    }
  }

  // 3. Add ingredients
  if (patch.addedIngredients?.length) {
    if (result.ingredients.length === 0) result.ingredients.push({ name: 'Zutaten', items: [] });
    for (const added of patch.addedIngredients) {
      const newIng = {
        name: added.name.trim(),
        amount: added.amount ?? 1,
        unit: added.unit?.trim() ?? 'Stück',
        baseName: added.baseName.trim(),
        category: added.category.trim(),
        synonyms: (added.synonyms ?? []).map((s) => s.trim()).filter(Boolean),
        isGenericGrocery: true,
      };
      const catUpper = added.category.toUpperCase().trim();
      let targetGroup = result.ingredients.find((g) => g.name.toUpperCase().trim() === catUpper);
      if (!targetGroup) {
        if (result.ingredients.length === 1 && result.ingredients[0].name.toLowerCase() === 'zutaten') {
          targetGroup = result.ingredients[0];
        } else {
          targetGroup = { name: added.category.trim(), items: [] };
          result.ingredients.push(targetGroup);
        }
      }
      targetGroup.items.push(newIng);
    }
  }

  // 4. Remove steps
  if (patch.removedStepNumbers?.length) {
    const removeSteps = new Set(patch.removedStepNumbers);
    result.instructions = result.instructions.filter((s) => !removeSteps.has(s.step));
  }

  // 5. Correct steps
  if (patch.stepCorrections?.length) {
    const stepMap = new Map(patch.stepCorrections.map((sc) => [sc.stepNumber, sc.correctedDescription]));
    for (const s of result.instructions) {
      const updated = stepMap.get(s.step);
      if (updated) s.description = updated;
    }
  }

  // 6. Add steps (preserving relative order for multi-inserts at identical anchors)
  if (patch.addedSteps?.length) {
    let zeroOffset = 0;
    const lastInsertedIndices = new Map<number, number>();
    for (const added of patch.addedSteps) {
      const newStep = { step: 0, description: added.description };
      if (added.insertAfterStep === 0) {
        result.instructions.splice(zeroOffset++, 0, newStep);
      } else if (added.insertAfterStep !== undefined && added.insertAfterStep > 0) {
        const prevInsert = lastInsertedIndices.get(added.insertAfterStep);
        const anchorIdx = prevInsert !== undefined ? prevInsert : result.instructions.findIndex((s) => s.step === added.insertAfterStep);
        if (anchorIdx >= 0) {
          result.instructions.splice(anchorIdx + 1, 0, newStep);
          lastInsertedIndices.set(added.insertAfterStep, anchorIdx + 1);
        } else {
          result.instructions.push(newStep);
        }
      } else {
        result.instructions.push(newStep);
      }
    }
  }

  // 7. Align inline tags for corrected baseNames
  if (patch.ingredientCorrections?.length) {
    const origIngredients = (recipe.ingredients || []).flatMap((g) => g.items || []);
    for (const corr of patch.ingredientCorrections) {
      if (!corr.correctedBaseName) continue;
      const corrOrigNorm = norm(corr.originalName);
      const origIng = origIngredients.find((i) => norm(i.name) === corrOrigNorm);
      const oldBase = origIng?.baseName?.toLowerCase().trim();
      const newBase = corr.correctedBaseName.trim();

      for (const s of result.instructions) {
        if (!s.description) continue;
        s.description = s.description.replace(/\[([^\]]+)\]\(ing:([^)]+)\)/g, (fullMatch, label, tagBase) => {
          const labelNorm = norm(label as string);
          const cleanTagBase = (tagBase as string).toLowerCase().trim();

          const labelMatchesOrig = labelNorm === corrOrigNorm || labelNorm.includes(corrOrigNorm) || corrOrigNorm.includes(labelNorm);
          const baseMatchesOld = Boolean(oldBase && cleanTagBase === oldBase);

          const otherMatchesLabel = origIngredients.some((other) => {
            const otherNorm = norm(other.name);
            return otherNorm !== corrOrigNorm && (labelNorm.includes(otherNorm) || otherNorm.includes(labelNorm));
          });

          if (labelMatchesOrig || (baseMatchesOld && !otherMatchesLabel)) {
            return `[${label}](ing:${newBase})`;
          }
          return fullMatch;
        });
      }
    }
  }

  // 8. Sequential step renumbering (1..N)
  result.instructions = result.instructions.map((s, idx) => ({ ...s, step: idx + 1 }));

  return result;
}
