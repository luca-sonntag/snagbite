export interface CanonicalNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  nova_group?: number;
}

export interface CanonicalIngredient {
  id: string;
  product_code?: string;
  name_en: string;
  name_de: string;
  category: string;
  nutrients_per_100g: CanonicalNutrients;
  standard_units?: Record<string, number>;
  aliases: string[];
}
