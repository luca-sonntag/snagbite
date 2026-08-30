import type { ParentIngredientInfo } from '@cookbook/shared';

export interface ShoppingListRow {
  id: string;
  user_id: string;
  name: string;
  base_name?: string | null;
  parent_ingredient?: ParentIngredientInfo | null;
  modifier?: string | null;
  brand?: string | null;
  amount: number | string;
  unit: string;
  recipe_id?: string | null;
  recipe_title?: string | null;
  checked: boolean;
  category?: string | null;
  canonical_id?: string | null;
  notes?: string | null;
  in_pantry_warning: boolean;
  created_at: string;
  updated_at: string;
}
