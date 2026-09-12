export interface MealPlanRow {
  id: string;
  user_id: string;
  recipe_id: string;
  plan_date: string;
  meal_type: string;
  servings: number | string;
  is_cooked: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  recipes?: {
    id: string;
    title: string;
    image_url: string | null;
    prep_time: number | null;
    cook_time: number | null;
    servings: number | string | null;
    nutritional_values?: unknown;
    ingredients: unknown;
  } | null;
}
