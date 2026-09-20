import type { IngredientGroup } from './recipes.js';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanRecipeSummary {
  id: string;
  title: string;
  imageUrl?: string | null;
  emoji?: string | null;
  healthScore?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  ingredients?: IngredientGroup[];
}

export interface MealPlanEntry {
  id: string;
  userId: string;
  recipeId: string;
  planDate: string; // YYYY-MM-DD
  mealType: MealType;
  servings: number;
  isCooked: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  recipe?: MealPlanRecipeSummary;
}

export interface CreateMealPlanDto {
  recipeId: string;
  planDate: string; // YYYY-MM-DD
  mealType: MealType;
  servings?: number;
  notes?: string;
}

export interface UpdateMealPlanDto {
  planDate?: string;
  mealType?: MealType;
  servings?: number;
  isCooked?: boolean;
  notes?: string;
}
