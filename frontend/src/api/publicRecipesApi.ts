import { apiUrl } from '../api';
import type { Recipe, SavedRecipe } from '../types';

export interface SavePublicRecipeResponse {
  success: boolean;
  message: string;
  savedRecipe: SavedRecipe;
  recipeId: string;
}

/**
 * Fetches the daily rotated demo recipes from the backend.
 */
export async function fetchPublicDemoRecipes(getAccessToken?: () => Promise<string | null>): Promise<Recipe[]> {
  const headers: Record<string, string> = {};
  if (getAccessToken) {
    const token = await getAccessToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }

  const res = await fetch(apiUrl('/api/public/recipe/demo'), { headers });
  if (!res.ok) throw new Error('Failed to fetch demo recipes: ' + res.statusText);
  const data = await res.json();
  return data.recipes || [];
}

/**
 * Fetches public recipe recommendations for the current user.
 */
export async function fetchPublicRecipeRecommendations(
  getAccessToken: () => Promise<string | null>,
  limit = 6
): Promise<Recipe[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const res = await fetch(apiUrl('/api/public/recipe/recommendations?limit=' + limit), {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Failed to fetch recommendations: ' + res.statusText);
  const data = await res.json();
  return data.recipes || [];
}

/**
 * Saves a public recipe directly into the user's cookbook.
 */
export async function savePublicRecipeToCookbook(
  recipeId: string,
  getAccessToken: () => Promise<string | null>
): Promise<SavePublicRecipeResponse> {
  const token = await getAccessToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(apiUrl('/api/public/recipe/' + recipeId + '/save'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save recipe: ' + res.statusText);
  }

  return res.json();
}

