/**
 * Idle background preloader for secondary lazy-loaded chunks.
 * Keeps the initial startup bundle lean and fast, while secondary views
 * (MealPlanner, ShoppingList, ProfileView, RecipeDetails, PremiumModal)
 * are smoothly pre-cached during idle time so tab transitions are instant.
 */

let preloadingStarted = false;

export function preloadSecondaryChunks(): void {
  if (typeof window === 'undefined' || preloadingStarted) return;
  preloadingStarted = true;

  // Immediately fire dynamic imports so chunks are cached in memory right away
  import('../components/RecipeDetails').catch(() => {});
  import('../components/MealPlanner').catch(() => {});
  import('../components/ShoppingList').catch(() => {});
  import('../components/ProfileView').catch(() => {});
  import('../components/PremiumModal').catch(() => {});
}

export function preloadChunk(
  view: 'recipe' | 'planner' | 'shopping' | 'profile' | 'premium'
): void {
  switch (view) {
    case 'recipe':
      void import('../components/RecipeDetails');
      break;
    case 'planner':
      void import('../components/MealPlanner');
      break;
    case 'shopping':
      void import('../components/ShoppingList');
      break;
    case 'profile':
      void import('../components/ProfileView');
      break;
    case 'premium':
      void import('../components/PremiumModal');
      break;
  }
}
