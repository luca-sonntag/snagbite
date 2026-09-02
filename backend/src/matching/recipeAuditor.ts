import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import { config } from '../config.js';
import type { Recipe, GeminiUsageInfo } from '../types.js';
import { estimateCost, type TokenUsage } from '../logger.js';
import { withRetry } from '../retry.js';

export interface IngredientCorrection {
  originalName: string;
  correctedBaseName?: string;
  correctedCategory?: string;
  correctedSynonyms?: string[];
  reason: string;
}

export interface AddedIngredient {
  name: string;
  amount?: number;
  unit?: string;
  baseName: string;
  category: string;
  synonyms?: string[];
  reason: string;
}

export interface RemovedIngredient {
  name: string;
  reason: string;
}

export interface StepCorrection {
  stepNumber: number;
  correctedDescription: string;
  reason: string;
}

export interface AddedStep {
  insertAfterStep?: number;
  description: string;
  reason: string;
}

export interface RecipeAuditPatch {
  ingredientCorrections?: IngredientCorrection[];
  addedIngredients?: AddedIngredient[];
  removedIngredients?: RemovedIngredient[];
  stepCorrections?: StepCorrection[];
  addedSteps?: AddedStep[];
  removedStepNumbers?: number[];
}

export interface RecipeAuditResult {
  patch: RecipeAuditPatch | null;
  usage?: GeminiUsageInfo;
}

const auditPatchSchema = {
  type: FunctionDeclarationSchemaType.OBJECT,
  properties: {
    ingredientCorrections: {
      type: FunctionDeclarationSchemaType.ARRAY,
      description: 'Corrections to baseName, category, or synonyms of existing ingredients to fix misclassifications, umbrella collapsing (e.g. Mozzarella collapsed to cheese, Pfeffer mapped to bell pepper), or wrong supermarket categories.',
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          originalName: { type: FunctionDeclarationSchemaType.STRING, description: 'The exact ingredient name in the recipe as written.' },
          correctedBaseName: { type: FunctionDeclarationSchemaType.STRING, description: 'Specific singular English baseName (e.g. "mozzarella", "black pepper").' },
          correctedCategory: { type: FunctionDeclarationSchemaType.STRING, description: 'Supermarket category (e.g. "DAIRY", "SPICES_SEASONINGS", "PRODUCE").' },
          correctedSynonyms: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING } },
          reason: { type: FunctionDeclarationSchemaType.STRING },
        },
        required: ['originalName', 'reason'],
      },
    },
    addedIngredients: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          name: { type: FunctionDeclarationSchemaType.STRING },
          amount: { type: FunctionDeclarationSchemaType.NUMBER },
          unit: { type: FunctionDeclarationSchemaType.STRING },
          baseName: { type: FunctionDeclarationSchemaType.STRING },
          category: { type: FunctionDeclarationSchemaType.STRING },
          synonyms: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.STRING } },
          reason: { type: FunctionDeclarationSchemaType.STRING },
        },
        required: ['name', 'baseName', 'category', 'reason'],
      },
    },
    removedIngredients: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          name: { type: FunctionDeclarationSchemaType.STRING },
          reason: { type: FunctionDeclarationSchemaType.STRING },
        },
        required: ['name', 'reason'],
      },
    },
    stepCorrections: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          stepNumber: { type: FunctionDeclarationSchemaType.INTEGER },
          correctedDescription: { type: FunctionDeclarationSchemaType.STRING },
          reason: { type: FunctionDeclarationSchemaType.STRING },
        },
        required: ['stepNumber', 'correctedDescription', 'reason'],
      },
    },
    addedSteps: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          insertAfterStep: { type: FunctionDeclarationSchemaType.INTEGER },
          description: { type: FunctionDeclarationSchemaType.STRING },
          reason: { type: FunctionDeclarationSchemaType.STRING },
        },
        required: ['description', 'reason'],
      },
    },
    removedStepNumbers: {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: { type: FunctionDeclarationSchemaType.INTEGER },
    },
  },
};

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

    const prompt = `You are a strict 2nd-stage Culinary Recipe Auditor & Ingredient Disambiguation Engine.
Review the recipe JSON below and identify any ingredient misclassifications, umbrella collapsing, or mismatches:
1. SPECIFICITY INVARIANCE: Never collapse specific varieties into umbrella terms:
   - "Mozzarella" / "Mozzarella (gerieben)" MUST have baseName "mozzarella", NOT "cheese".
   - "Feta" / "Schafskäse" MUST have baseName "feta", NOT "cheese".
   - "Gouda" -> "gouda", "Cheddar" -> "cheddar", "Parmesan" -> "parmesan" (NOT "cheese").
   - "Lachs" / "Salmon" -> "salmon" or "salmon fillet", "Thunfisch" -> "tuna" (NOT "fish").
2. STRICT SPICE VS PRODUCE DISAMBIGUATION:
   - "Pfeffer" / "Schwarzer Pfeffer" (spice) MUST have baseName "black pepper", category "SPICES_SEASONINGS" (NEVER "pepper", "bell pepper", or "PRODUCE").
   - "Paprika" / "Gemüsepaprika" (produce) MUST have baseName "bell pepper", category "FRUITS_VEGETABLES" / "PRODUCE".
   - "Paprikapulver" (spice) MUST have baseName "paprika powder", category "SPICES_SEASONINGS".
3. INLINE TAG ALIGNMENT:
   - If baseName is corrected, update step descriptions containing [Word](ing:oldBaseName) to [Word](ing:newBaseName).
4. If everything is already accurate and complete, return an empty patch {}.

Recipe to audit:
${JSON.stringify({ title: recipe.title, description: recipe.description, ingredients: recipe.ingredients, instructions: recipe.instructions }, null, 2)}`;

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
    if (result.ingredients.length === 0) {
      result.ingredients.push({ name: 'Zutaten', items: [] });
    }
    for (const added of patch.addedIngredients) {
      result.ingredients[0].items.push({
        name: added.name,
        amount: added.amount ?? 1,
        unit: added.unit ?? 'Stück',
        baseName: added.baseName,
        category: added.category,
        synonyms: added.synonyms ?? [],
        isGenericGrocery: true,
      });
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
      if (added.insertAfterStep !== undefined) {
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
    for (const corr of patch.ingredientCorrections) {
      if (corr.correctedBaseName) {
        const origIng = recipe.ingredients.flatMap((g) => g.items).find(
          (i) => i.name.toLowerCase().trim() === corr.originalName.toLowerCase().trim()
        );
        const oldBase = origIng?.baseName;
        if (oldBase && oldBase.toLowerCase() !== corr.correctedBaseName.toLowerCase()) {
          const tagRegex = new RegExp(`\\(ing:${oldBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'gi');
          for (const s of result.instructions) {
            s.description = s.description.replace(tagRegex, `(ing:${corr.correctedBaseName})`);
          }
        }
      }
    }
  }

  // 8. Sequential step renumbering (1..N)
  result.instructions = result.instructions.map((s, idx) => ({ ...s, step: idx + 1 }));

  return result;
}
