import type { Recipe } from './recipes.js';
import type { ParentIngredientInfo } from './recipes.js';

export type UserRecipeSource = 'extraction' | 'photo' | 'remix' | 'share';

export interface SavedRecipe {
  recipeId: string;
  recipe: Recipe;
  source: UserRecipeSource;
  isFavorite: boolean;
  flags: string[];
  collectionIds: string[];
  addedAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  emoji?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  userId?: string;
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
  amount: number;
  unit: string;
  recipeId?: string;
  recipeTitle?: string;
  checked: boolean;
  notes?: string;
  modifier?: string;
  brand?: string;
  createdAt: string;
  updatedAt?: string;
  category?: string;
  canonicalId?: string | null;
  inPantryWarning?: boolean;
}

export interface CreateShoppingListItemDto {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
  amount: number;
  unit: string;
  recipeId?: string;
  recipeTitle?: string;
  checked?: boolean;
  notes?: string;
  modifier?: string;
  brand?: string;
  category?: string;
  canonicalId?: string | null;
  inPantryWarning?: boolean;
}

export interface UpdateShoppingListItemDto {
  name?: string;
  baseName?: string;
  amount?: number;
  unit?: string;
  checked?: boolean;
  notes?: string;
  modifier?: string;
  brand?: string;
  category?: string;
  inPantryWarning?: boolean;
}

export interface AggregatedShoppingItem {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
  unit: string;
  amount: number;
  checked: boolean;
  category?: string;
  canonicalId?: string | null;
  modifier?: string;
  brand?: string;
  inPantryWarning?: boolean;
  itemIds: string[];
  sources: { recipeId?: string; recipeTitle?: string; amount: number; unit: string }[];
  subItems?: {
    name: string;
    rawName?: string;
    baseName?: string;
    modifier?: string;
    brand?: string;
    amount: number;
    unit: string;
    recipeTitle?: string;
  }[];
}
