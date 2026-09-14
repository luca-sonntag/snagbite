import type { MouseEvent } from 'react';
import type { Collection, SavedRecipe, RecipeCategory } from '../../types';
import type { CatalogPreset } from './catalogRoutes';

export interface Shelf {
  items: SavedRecipe[];
  total: number;
}

export interface RecommendedShelf extends Shelf {
  themeId: string;
  title: string;
  badgeEmoji?: string;
}

export interface CookbookHomeProps {
  totalRecipes: number;
  items?: SavedRecipe[];
  collections: Collection[];
  jobsByCollection: Record<string, SavedRecipe[]>;
  jobsByFlag?: Record<string, SavedRecipe[]>;
  jobsByCategory?: Partial<Record<RecipeCategory, SavedRecipe[]>>;
  availableCategories?: RecipeCategory[];
  favoriteJobs?: SavedRecipe[];
  shelves: {
    recommended?: RecommendedShelf | null;
    recent: Shelf;
    favorites: Shelf;
    quick: Shelf;
    newest: Shelf;
  };
  allFlags: string[];
  formatTotalTime: (recipe: any) => string | null;
  onOpenList: (preset: CatalogPreset) => void;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onAddCollection: () => void;
  onManageCollections?: () => void;
  isSelectMode?: boolean;
  onToggleSelectMode?: () => void;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
  onRecipeSaved?: (savedId: string) => void;
  savedRecipeIds?: Set<string>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
}
