import type { Recipe, Ingredient, ProgressData } from '../../types';

export interface RecipeDetailsProps {
  recipe: Recipe;
  isExtracting?: boolean;
  progress?: ProgressData | null;
  onAddIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => Promise<boolean> | boolean | void;
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
  getAccessToken?: () => Promise<string | null>;
  onCoverUpdated?: (recipeId: string, imageUrl: string, isAiCover: boolean) => void;
}

export interface RecipeHeaderProps {
  recipe: Recipe;
  reelUrl?: string;
  createdAt?: string;
  onBack?: () => void;
  onNavigateToShoppingList?: () => void;
  onDelete?: () => void;
  onCopyRecipe: () => void;
  isCopied: boolean;
  isParentAvailable?: boolean;
  onNavigateToRecipe?: (recipeId: string, remixRecipe?: Recipe) => void;
  parentRecipeTitle?: string | null;
  onAssignCollections?: () => void;
  onManageFlags?: () => void;
  flags?: string[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  cookRefreshKey?: number;
  onRemixClick?: () => void;
  totalTimeLabel?: string | null;
  isAwaitingCover?: boolean;
  isExtracting?: boolean;
}

export type RecipeSectionId = 'ingredients' | 'instructions' | 'details';

/** @deprecated Use flat Ingredient[] instead */
export interface SortedIngredientGroup {
  group: {
    name: string;
    items: Ingredient[];
  };
  originalIdx: number;
}

export interface SelectedNutritionTarget {
  ingredient: Ingredient;
  category?: string;
}
