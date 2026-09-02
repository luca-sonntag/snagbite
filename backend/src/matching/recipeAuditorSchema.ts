import { FunctionDeclarationSchemaType } from '@google/generative-ai';
import type { Recipe, GeminiUsageInfo } from '../types.js';

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

export const auditPatchSchema = {
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

export function buildAuditPrompt(recipe: Recipe): string {
  return `You are a strict 2nd-stage Culinary Recipe Auditor & Ingredient Disambiguation Engine.
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
}
