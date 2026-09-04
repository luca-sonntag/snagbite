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

  const loaders = [
    () => import('../components/RecipeDetails'),
    () => import('../components/MealPlanner'),
    () => import('../components/ShoppingList'),
    () => import('../components/ProfileView'),
    () => import('../components/PremiumModal'),
  ];

  // Stagger chunk fetching during idle time to avoid network or main-thread congestion
  loaders.forEach((loadChunk, index) => {
    const delay = 800 + index * 350;
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          loadChunk().catch(() => {});
        },
        { timeout: delay + 1000 }
      );
    } else {
      setTimeout(() => {
        loadChunk().catch(() => {});
      }, delay);
    }
  });
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
