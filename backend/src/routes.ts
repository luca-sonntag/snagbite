import { Router } from 'express';
import { requireAuth } from './auth.js';
import { extractionRoutes } from './routes/extractionRoutes.js';
import { recipeRoutes } from './routes/recipeRoutes.js';
import { collectionRoutes } from './routes/collectionRoutes.js';
import { socialRoutes } from './routes/socialRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { mealPlanRoutes } from './routes/mealPlanRoutes.js';
import { pantryRoutes } from './routes/pantryRoutes.js';
import { shoppingListRoutes } from './routes/shoppingListRoutes.js';
import { publicRecipesRoutes } from './routes/publicRecipesRoutes.js';

export const apiRouter = Router();

// Apply auth middleware to all /api routes
apiRouter.use(requireAuth);

// Mount domain sub-routers
apiRouter.use(extractionRoutes);
apiRouter.use(recipeRoutes);
apiRouter.use(collectionRoutes);
apiRouter.use(socialRoutes);
apiRouter.use(userRoutes);
apiRouter.use(adminRoutes);
apiRouter.use(mealPlanRoutes);
apiRouter.use(pantryRoutes);
apiRouter.use(shoppingListRoutes);
apiRouter.use(publicRecipesRoutes);

// Re-export helpers for backwards compatibility
export * from './routes/authUtils.js';
export { assertRecipeAccess } from './routes/recipeRoutes.js';
