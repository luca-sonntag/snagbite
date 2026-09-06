import { Router, Request, Response } from 'express';
import {
  getPublicDemoRecipes,
  getPublicRecipeRecommendations,
  getRecipe,
  addToLibrary,
  isInLibrary,
  getSavedRecipe,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';

export const publicRecipesRoutes = Router();

/**
 * GET /api/public/recipe/demo
 * Returns up to 2 featured demo recipes (rotated daily if pool > 2).
 */
publicRecipesRoutes.get('/public/recipe/demo', async (_req: Request, res: Response): Promise<void> => {
  try {
    const demoRecipes = await getPublicDemoRecipes();
    res.status(200).json({
      success: true,
      recipes: demoRecipes,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching public demo recipes:', error);
    sendAppError(res, error);
  }
});

/**
 * GET /api/public/recipe/recommendations
 * Returns public recipe recommendations customized for the user.
 */
publicRecipesRoutes.get('/public/recipe/recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 6), 20);
    const recommendations = await getPublicRecipeRecommendations(req.userId!, limit);
    res.status(200).json({
      success: true,
      recipes: recommendations,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching public recipe recommendations:', error);
    sendAppError(res, error);
  }
});

/**
 * POST /api/public/recipe/:id/save
 * Adds an existing public recipe to the user's cookbook.
 */
publicRecipesRoutes.post('/public/recipe/:id/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }

    const recipe = await getRecipe(id);
    if (!recipe || recipe.visibility !== 'public') {
      throw new AppError('RECIPE_NOT_FOUND');
    }

    const alreadyInLibrary = await isInLibrary(req.userId!, id);
    if (!alreadyInLibrary) {
      await addToLibrary(req.userId!, id, 'share');
    }

    const saved = await getSavedRecipe(req.userId!, id);

    res.status(200).json({
      success: true,
      message: 'Recipe saved to cookbook.',
      savedRecipe: saved,
      recipeId: id,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error saving public recipe to cookbook:', error);
    sendAppError(res, error);
  }
});
