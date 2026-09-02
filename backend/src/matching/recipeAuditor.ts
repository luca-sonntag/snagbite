import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import type { Recipe, GeminiUsageInfo } from '../types.js';
import { estimateCost, type TokenUsage } from '../logger.js';
import { withRetry } from '../retry.js';
import {
  auditPatchSchema,
  buildAuditPrompt,
  type RecipeAuditPatch,
  type RecipeAuditResult,
  type IngredientCorrection,
  type AddedIngredient,
  type RemovedIngredient,
  type StepCorrection,
  type AddedStep,
} from './recipeAuditorSchema.js';

export type { RecipeAuditPatch, RecipeAuditResult, IngredientCorrection, AddedIngredient, RemovedIngredient, StepCorrection, AddedStep };

export async function auditRecipe(recipe: Recipe): Promise<RecipeAuditResult> {
  if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return { patch: null };
  }
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

    const prompt = buildAuditPrompt(recipe);
    const result = await withRetry(() => model.generateContent([prompt]), { maxAttempts: 2, baseDelayMs: 1000 });
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

  const result: Recipe = {
    ...recipe,
    ingredients: (recipe.ingredients || []).map((g) => ({ ...g, items: (g.items || []).map((i) => ({ ...i })) })),
    instructions: (recipe.instructions || []).map((s) => ({ ...s })),
  };

  // 1. Remove ingredients
  if (patch.removedIngredients?.length) {
    const removeSet = new Set(patch.removedIngredients.map((r) => r.name.toLowerCase().trim()));
    result.ingredients = result.ingredients
      .map((g) => ({ ...g, items: g.items.filter((i) => !removeSet.has(i.name.toLowerCase().trim())) }))
      .filter((g) => g.items.length > 0);
  }

  // 2. Correct ingredients
  if (patch.ingredientCorrections?.length) {
    const corrMap = new Map(patch.ingredientCorrections.map((c) => [c.originalName.toLowerCase().trim(), c]));
    for (const group of result.ingredients) {
      group.items = group.items.map((ing) => {
        const corr = corrMap.get(ing.name.toLowerCase().trim());
        if (!corr) return ing;
        return {
          ...ing,
          ...(corr.correctedBaseName ? { baseName: corr.correctedBaseName } : {}),
          ...(corr.correctedCategory ? { category: corr.correctedCategory } : {}),
          ...(corr.correctedSynonyms ? { synonyms: corr.correctedSynonyms } : {}),
        };
      });
    }
  }

  // 3. Add ingredients
  if (patch.addedIngredients?.length) {
    if (result.ingredients.length === 0) result.ingredients.push({ name: 'Zutaten', items: [] });
    for (const added of patch.addedIngredients) {
      const newIng = {
        name: added.name,
        amount: added.amount ?? 1,
        unit: added.unit ?? 'Stück',
        baseName: added.baseName,
        category: added.category,
        synonyms: added.synonyms ?? [],
        isGenericGrocery: true,
      };
      const catUpper = added.category.toUpperCase().trim();
      let targetGroup = result.ingredients.find((g) => g.name.toUpperCase().trim() === catUpper);
      if (!targetGroup) {
        if (result.ingredients.length === 1 && result.ingredients[0].name.toLowerCase() === 'zutaten') {
          targetGroup = result.ingredients[0];
        } else {
          targetGroup = { name: added.category, items: [] };
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

  // 6. Add steps
  if (patch.addedSteps?.length) {
    for (const added of patch.addedSteps) {
      const newStep = { step: 0, description: added.description };
      if (added.insertAfterStep === 0) {
        result.instructions.unshift(newStep);
      } else if (added.insertAfterStep !== undefined && added.insertAfterStep > 0) {
        const idx = result.instructions.findIndex((s) => s.step === added.insertAfterStep);
        if (idx >= 0) result.instructions.splice(idx + 1, 0, newStep);
        else result.instructions.push(newStep);
      } else {
        result.instructions.push(newStep);
      }
    }
  }

  // 7. Align inline tags for corrected baseNames
  if (patch.ingredientCorrections?.length) {
    const origIngredients = recipe.ingredients.flatMap((g) => g.items);
    for (const corr of patch.ingredientCorrections) {
      if (!corr.correctedBaseName) continue;
      const origIng = origIngredients.find(
        (i) => i.name.toLowerCase().trim() === corr.originalName.toLowerCase().trim()
      );
      const oldBase = origIng?.baseName?.toLowerCase().trim();
      const corrOrig = corr.originalName.toLowerCase().trim();
      const newBase = corr.correctedBaseName;

      for (const s of result.instructions) {
        s.description = s.description.replace(/\[([^\]]+)\]\(ing:([^)]+)\)/g, (fullMatch, label, tagBase) => {
          const cleanLabel = (label as string).toLowerCase().trim();
          const cleanTagBase = (tagBase as string).toLowerCase().trim();

          const labelMatchesOrig = cleanLabel === corrOrig || cleanLabel.includes(corrOrig) || corrOrig.includes(cleanLabel);
          const baseMatchesOld = Boolean(oldBase && cleanTagBase === oldBase);

          // Disambiguate against other ingredients sharing the old baseName
          const otherMatchesLabel = origIngredients.some(
            (other) => other.name.toLowerCase().trim() !== corrOrig &&
              (cleanLabel.includes(other.name.toLowerCase().trim()) || other.name.toLowerCase().trim().includes(cleanLabel))
          );

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
