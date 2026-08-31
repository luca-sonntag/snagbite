import type { Recipe, Ingredient } from '../../types';

export interface RecipeDetailsProps {
  recipe: Recipe;
  onAddIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  onDelete?: () => void;
  reelUrl?: string;
  createdAt?: string;
  onBack?: () => void;
  onNavigateToShoppingList?: () => void;
  shoppingListCount?: number;
  onRemixSuccess?: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent?: (newRecipe: Recipe) => void;
  isParentAvailable?: boolean;
  onNavigateToRecipe?: (recipeId: string, remixRecipe?: Recipe) => void;
  parentRecipeTitle?: string | null;
  onAssignCollections?: () => void;
  onManageFlags?: () => void;
  flags?: string[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export type RecipeSectionId = 'ingredients' | 'instructions' | 'details';

export interface SortedIngredientGroup {
  group: {
    name: string;
    items: Ingredient[];
  };
  originalIdx: number;
}

export interface SelectedNutritionTarget {
  ingredient: Ingredient;
  category: string;
}
