import { FunctionDeclarationSchemaType } from '@google/generative-ai';
import { RECIPE_CATEGORY_KEYS } from './categoryGroups.js';
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
          correctedCategory: {
            type: FunctionDeclarationSchemaType.STRING,
            enum: [...RECIPE_CATEGORY_KEYS],
            description: 'Canonical supermarket category key (e.g. VEGETABLES for corn/Mais, DAIRY_EGGS for mozzarella/cheese, SPICES_HERBS for black pepper, PANTRY_BAKING for protein powder/baking).',
          },
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
          category: {
            type: FunctionDeclarationSchemaType.STRING,
            enum: [...RECIPE_CATEGORY_KEYS],
            description: 'Canonical supermarket category key.',
          },
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
Review the recipe JSON below and identify any ingredient misclassifications, umbrella collapsing, or category mismatches:
1. SPECIFICITY INVARIANCE: Never collapse specific varieties into umbrella terms:
   - "Mozzarella" / "Mozzarella (gerieben)" MUST have baseName "mozzarella" (NOT "cheese") and category "DAIRY_EGGS".
   - "Feta" / "Schafskäse" MUST have baseName "feta" (NOT "cheese") and category "DAIRY_EGGS".
   - "Gouda" -> "gouda", "Cheddar" -> "cheddar", "Parmesan" -> "parmesan" (NOT "cheese") with category "DAIRY_EGGS".
   - "Lachs" / "Salmon" -> "salmon" or "salmon fillet", "Thunfisch" -> "tuna" (NOT "fish") with category "SEAFOOD".
2. STRICT SPICE VS PRODUCE & PANTRY DISAMBIGUATION:
   - "Pfeffer" / "Schwarzer Pfeffer" (spice) MUST have baseName "black pepper" and category "SPICES_HERBS" (NEVER "pepper", "bell pepper", or "VEGETABLES").
   - "Paprika" / "Gemüsepaprika" (produce) MUST have baseName "bell pepper" and category "VEGETABLES".
   - "Paprikapulver" (spice) MUST have baseName "paprika powder" and category "SPICES_HERBS".
   - "Mais" / "Corn" (vegetable) MUST have baseName "corn" and category "VEGETABLES" (NEVER "OILS_CONDIMENTS").
   - "Protein Pulver" / "Sahne Protein" MUST have category "PANTRY_BAKING" (NEVER invent custom categories like SUPPLEMENTS).
3. CANONICAL CATEGORIES ONLY: Any corrected or added category MUST be strictly one of: ${RECIPE_CATEGORY_KEYS.join(', ')}.
4. INLINE TAG ALIGNMENT:
   - If baseName is corrected, update step descriptions containing [Word](ing:oldBaseName) to [Word](ing:newBaseName).
5. If everything is already accurate and complete, return an empty patch {}.

Recipe to audit:
${JSON.stringify({ title: recipe.title, description: recipe.description, ingredients: recipe.ingredients, instructions: recipe.instructions }, null, 2)}`;
}
