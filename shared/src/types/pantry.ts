import type { Recipe } from './recipes.js';

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  baseName?: string;
  mappingKey?: string;
  category?: string;
  amount: number;
  unit: string;
  canonicalId?: string | null;
  notes?: string;
  expiresAt?: string | null;
  addedAt: string;
  updatedAt: string;
}

export interface CreatePantryItemDto {
  name: string;
  baseName?: string;
  mappingKey?: string;
  category?: string;
  amount: number;
  unit: string;
  canonicalId?: string | null;
  notes?: string;
  expiresAt?: string | null;
  shelfLifeDays?: number | null;
}

export interface UpdatePantryItemDto {
  name?: string;
  baseName?: string;
  category?: string;
  amount?: number;
  unit?: string;
  notes?: string;
  expiresAt?: string | null;
}

export interface ConsumePantryItemDto {
  name: string;
  baseName?: string;
  mappingKey?: string;
  amount: number;
  unit: string;
}

export interface ConsumePantryDto {
  recipeId?: string;
  items: ConsumePantryItemDto[];
}

export interface PantrySuggestion {
  recipeId: string;
  recipe: Recipe;
  matchScore: number;
  matchingIngredients: string[];
  expiringIngredients: string[];
  missingIngredientsCount: number;
  isPublic: boolean;
}
