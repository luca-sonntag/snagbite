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
  remixCount?: number;
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
  synonyms?: string[];
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
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
}

export interface CreateShoppingListItemDto {
  name: string;
  baseName?: string;
  synonyms?: string[];
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
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
}

export interface UpdateShoppingListItemDto {
  name?: string;
  baseName?: string;
  synonyms?: string[];
  amount?: number;
  unit?: string;
  checked?: boolean;
  notes?: string;
  modifier?: string;
  brand?: string;
  category?: string;
  inPantryWarning?: boolean;
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
}

export interface AggregatedShoppingItem {
  name: string;
  baseName?: string;
  synonyms?: string[];
  parentIngredient?: ParentIngredientInfo;
  unit: string;
  amount: number;
  checked: boolean;
  category?: string;
  canonicalId?: string | null;
  modifier?: string;
  brand?: string;
  inPantryWarning?: boolean;
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
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
