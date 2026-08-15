import canonicalIngredientsData from './canonicalIngredientsData.json' with { type: 'json' };

export interface CanonicalNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface CanonicalIngredient {
  id: string;
  bls_code: string;
  name_en: string;
  name_de: string;
  category: string;
  nutrients_per_100g: CanonicalNutrients;
  standard_units?: Record<string, number>;
  aliases: string[];
}

export const CANONICAL_INGREDIENTS: CanonicalIngredient[] = (canonicalIngredientsData as unknown) as CanonicalIngredient[];
