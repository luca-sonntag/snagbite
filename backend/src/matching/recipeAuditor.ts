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
import { recordAuditLog } from './recipeAuditorDevLogger.js';
import { placeIngredientInGroup, normalizeToCategoryKey } from './categoryGroups.js';
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

    await recordAuditLog(recipe, patch, usage, text);

    return { patch, usage };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await recordAuditLog(recipe, null, undefined, undefined, msg);
    console.warn('[recipeAuditor] audit failed, proceeding with original recipe:', msg);
    return { patch: null };
  }
}

export function applyRecipeAuditPatch(recipe: Recipe, patch: RecipeAuditPatch | null | undefined): Recipe {
  if (!patch) return { ...recipe };
  const hasChanges = Boolean(patch.ingredientCorrections?.length || patch.addedIngredients?.length ||
    patch.removedIngredients?.length || patch.stepCorrections?.length || patch.addedSteps?.length || patch.removedStepNumbers?.length);
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

  // 2. Correct ingredients & relocate across category groups
  if (patch.ingredientCorrections?.length) {
    for (const corr of patch.ingredientCorrections) {
      const corrOrigNorm = norm(corr.originalName);
      for (const group of result.ingredients) {
        const itemIdx = group.items.findIndex((i) => norm(i.name) === corrOrigNorm);
        if (itemIdx === -1) continue;

        const oldItem = group.items[itemIdx];
        const targetCategory = corr.correctedCategory
          ? normalizeToCategoryKey(corr.correctedCategory)
          : (oldItem.category ? normalizeToCategoryKey(oldItem.category) : normalizeToCategoryKey(group.name));

        const updatedItem = {
          ...oldItem,
          ...(corr.correctedName ? { name: corr.correctedName.trim() } : {}),
          ...(corr.correctedBaseName ? { baseName: corr.correctedBaseName.trim() } : {}),
          category: targetCategory,
          ...(corr.correctedSynonyms ? { synonyms: corr.correctedSynonyms.map((s) => s.trim()).filter(Boolean) } : {}),
        };

        const currentGroupCat = normalizeToCategoryKey(group.name);
        if (targetCategory !== currentGroupCat && group.name.toLowerCase() !== 'zutaten') {
          group.items.splice(itemIdx, 1);
          placeIngredientInGroup(result.ingredients, updatedItem, targetCategory);
        } else {
          group.items[itemIdx] = updatedItem;
        }
        break;
      }
    }
    result.ingredients = result.ingredients.filter((g) => g.items.length > 0);
  }

  // 3. Add ingredients
  if (patch.addedIngredients?.length) {
    for (const added of patch.addedIngredients) {
      const cat = normalizeToCategoryKey(added.category);
      placeIngredientInGroup(result.ingredients, {
        name: added.name.trim(),
        amount: added.amount ?? 1,
        unit: added.unit?.trim() ?? 'Stück',
        baseName: added.baseName.trim(),
        category: cat,
        synonyms: (added.synonyms ?? []).map((s) => s.trim()).filter(Boolean),
        isGenericGrocery: true,
      }, cat);
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
      if (oldBase && oldBase === newBase.toLowerCase()) continue;

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

  result.instructions = result.instructions.map((s, idx) => ({ ...s, step: idx + 1 }));
  return result;
}
