export interface ParentIngredientInfo {
  name: string;
  baseName: string;
  unit?: string;
  yieldFactor?: number;
}

export interface Ingredient {
  name: string;
  baseName?: string;
  synonyms?: string[];
  parentIngredient?: ParentIngredientInfo;
  replacedOriginal?: string;
  amount: number;
  unit: string;
  gramsPerUnit?: number | null;
  notes?: string;
  modifier?: string;
  brand?: string;
  category?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  isStaple?: boolean;
  isGenericGrocery?: boolean;
  canonicalId?: string | null;
  matchedName?: string | null;
  isVerified?: boolean | null;
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
  shelfLifeDays?: number | null;
}

export interface IngredientGroup {
  name: string;
  items: Ingredient[];
}

export interface InstructionStep {
  step: number;
  description: string;
  parallelPrepHint?: string;
}

export interface AlternativeIngredient {
  original: string;
  substitute: string;
  notes?: string;
}

export interface NutritionalValues {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export type RecipeVisibility = 'private' | 'unlisted' | 'public';
export type RecipeOrigin = 'url' | 'photo' | 'remix';

export type RecipeCategory =
  | 'MAIN_COURSE'
  | 'DESSERT'
  | 'BREAKFAST'
  | 'SNACK'
  | 'SIDE_DISH'
  | 'BEVERAGE'
  | 'SOUP'
  | 'SALAD'
  | 'BAKING'
  | 'OTHER';

export const RECIPE_CATEGORIES: readonly RecipeCategory[] = [
  'MAIN_COURSE',
  'DESSERT',
  'BREAKFAST',
  'SNACK',
  'SIDE_DISH',
  'BEVERAGE',
  'SOUP',
  'SALAD',
  'BAKING',
  'OTHER',
] as const;

export type RecipeOperationType =
  | 'REPLACE_INGREDIENT'
  | 'ADD_INGREDIENTS'
  | 'REMOVE_INGREDIENT'
  | 'SCALE_SERVINGS'
  | 'UPDATE_INSTRUCTION'
  | 'ADD_INSTRUCTION_STEP'
  | 'UPDATE_TITLE';

export interface RecipeOperation {
  id: string;
  type: RecipeOperationType;
  summary: string;
  targetIngredientName?: string;
  newIngredient?: Ingredient;
  groupName?: string;
  newIngredients?: Ingredient[];
  removeIngredientName?: string;
  newServings?: number;
  stepUpdates?: Array<{ step: number; description: string; parallelPrepHint?: string }>;
  newSteps?: Array<{ description: string; parallelPrepHint?: string }>;
  newTitle?: string;
}

export interface Recipe {
  id?: string;
  isRecipe?: boolean;
  createdBy?: string | null;
  visibility?: RecipeVisibility;
  origin?: RecipeOrigin;
  sourceUrl?: string | null;
  parentRecipeId?: string | null;
  remixCount?: number;
  title: string;
  description: string;
  emoji?: string | null;
  category?: RecipeCategory | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
  ingredients: IngredientGroup[];
  instructions: InstructionStep[];
  equipment: string[];
  nutritionalValues?: NutritionalValues;
  sourceNutritionalValues?: NutritionalValues | null;
  hasExplicitNutritionalValues?: boolean;
  nutritionCoverage?: number;
  tips?: string[];
  alternativeIngredients?: AlternativeIngredient[];
  transcript?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  imagePrompt?: string | null;
  isAiCover?: boolean;
  tags?: string[];
  sourceHandle?: string | null;
  remixPrompt?: string | null;
  parentRecipeTitle?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
