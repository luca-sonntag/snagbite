import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  getRecipe,
  updateRecipe,
  getSavedRecipe,
  getLibrary,
  removeFromLibrary,
  isInLibrary,
  createRemixJob,
  createRecipeForUser,
  setFavorite,
  setFlags,
  setRecipeCollections,
  getCookHistoryForRecipe,
  uploadCookPhoto,
  markMealPlansCookedForRecipe,
  consumePantryForRecipe,
  getClient,
  getUserRecipeRemixes,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import { chatAboutRecipe, generateChatChips, remixRecipe, verifyCookedDishPhoto } from '../gemini.js';
import { generateRecipeCoverImage } from '../imageGenerator.js';
import { enrichRecipeWithCanonicalIngredients } from '../matching/ingredientMatcher.js';
import { applyRecipeOperations } from '../recipeOperations.js';
import { recordCook } from '../gamification.js';
import type { Recipe, RecipeOperation } from '../types.js';
import { fetchAndSyncUser, isPremiumUser, MAX_PHOTOS_TOTAL_CHARS } from './authUtils.js';
import { triggerWorkerTick } from '../queue.js';

export const recipeRoutes = Router();

export async function assertRecipeAccess(userId: string, recipeId: string): Promise<Recipe> {
  if (!recipeId) {
    throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
  }
  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new AppError('RECIPE_NOT_FOUND');
  }
  if (!(await isInLibrary(userId, recipeId))) {
    throw new AppError('RECIPE_NOT_FOUND');
  }
  return recipe;
}

recipeRoutes.get('/recipes', async (req: Request, res: Response): Promise<void> => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const recipes = await getLibrary(req.userId!);
    res.status(200).json({
      success: true,
      recipes,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching cookbook:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.get('/recipes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const saved = await getSavedRecipe(req.userId!, id);
    if (!saved) {
      throw new AppError('RECIPE_NOT_FOUND');
    }
    res.status(200).json({ success: true, ...saved });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching recipe:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.delete('/recipes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const removed = await removeFromLibrary(req.userId!, id);
    if (!removed) {
      throw new AppError('RECIPE_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Recipe removed from cookbook.',
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error removing recipe:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.patch('/recipes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { recipe } = req.body;

    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }
    if (!recipe || typeof recipe !== 'object') {
      throw new AppError('MISSING_FIELD', { params: { field: 'recipe' } });
    }

    const current = await assertRecipeAccess(req.userId!, id);

    recipe.sourceNutritionalValues = current.sourceNutritionalValues ?? null;
    recipe.hasExplicitNutritionalValues = current.hasExplicitNutritionalValues ?? false;
    await enrichRecipeWithCanonicalIngredients(recipe);

    const updated = await updateRecipe(id, { ...current, ...recipe, id });

    res.status(200).json({
      success: true,
      message: 'Recipe updated successfully.',
      recipe: updated,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating recipe in job:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.post('/recipes/:id/remix', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'prompt' } });
    }

    if (prompt.length > 250) {
      throw new AppError('REMIX_PROMPT_TOO_LONG', { params: { max: 250 } });
    }

    const parentRecipe = await assertRecipeAccess(req.userId!, id);

    let isPremium = false;
    try {
      const user = await fetchAndSyncUser(req.userId!);
      isPremium = isPremiumUser(user);
    } catch (err) {
      console.warn(`Failed to fetch user metadata for remix premium check:`, err);
    }

    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'remix' } });
    }

    const job = await createRemixJob(
      parentRecipe.id!,
      parentRecipe.sourceUrl || `remix://${parentRecipe.id}`,
      prompt,
      req.userId!
    );
    triggerWorkerTick();

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Recipe remix job successfully queued.',
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating remix job:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.get('/recipes/:id/cook-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }

    await assertRecipeAccess(req.userId!, id);

    const history = await getCookHistoryForRecipe(req.userId!, id);
    res.status(200).json({ success: true, ...history });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching cook history:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.get('/recipes/:id/chat/chips', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang as string) || 'de';

    const recipe = await assertRecipeAccess(req.userId!, id);
    const chips = await generateChatChips(recipe, lang);

    res.status(200).json({ success: true, chips });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error generating chat chips:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.get('/recipes/:id/remixes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await assertRecipeAccess(req.userId!, id);
    const remixes = await getUserRecipeRemixes(req.userId!, id);
    res.status(200).json({ remixes });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error getting recipe remixes:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.post('/recipes/:id/chat/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { operations, modificationRequest } = req.body;

    const currentRecipe = await assertRecipeAccess(req.userId!, id);

    let remixedRecipe: Recipe;
    let summaryText = modificationRequest;

    if (Array.isArray(operations) && operations.length > 0) {
      remixedRecipe = applyRecipeOperations(currentRecipe, operations);
      if (!summaryText) {
        summaryText = operations.map((op: RecipeOperation) => op.summary).filter(Boolean).join(', ');
      }
    } else if (modificationRequest && typeof modificationRequest === 'string') {
      const { recipe } = await remixRecipe(currentRecipe, modificationRequest);
      remixedRecipe = recipe;
    } else {
      throw new AppError('MISSING_FIELD', { params: { field: 'operations' } });
    }

    // Always canonical enrich ingredients and recalculate macros
    await enrichRecipeWithCanonicalIngredients(remixedRecipe);

    // Preserve cover images
    if (!remixedRecipe.imageUrl && currentRecipe.imageUrl) {
      remixedRecipe.imageUrl = currentRecipe.imageUrl;
      remixedRecipe.imageUrls = currentRecipe.imageUrls ?? [currentRecipe.imageUrl];
    }

    // Always create as private remix for this user (Original is NEVER overwritten!)
    const savedRemix = await createRecipeForUser(
      req.userId!,
      {
        ...remixedRecipe,
        sourceUrl: currentRecipe.sourceUrl,
        sourceHandle: currentRecipe.sourceHandle,
        parentRecipeId: id,
        remixPrompt: summaryText || null,
        visibility: 'private',
        origin: 'remix',
      },
      'remix',
      'remix'
    );

    res.status(200).json({
      success: true,
      newRecipeId: savedRemix.id,
      updatedRecipeJson: savedRemix,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error confirming remix:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.post('/recipes/:id/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message, history, stagedChanges } = req.body;

    const normalizedStagedChanges: string[] | undefined = Array.isArray(stagedChanges)
      ? stagedChanges.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
      : undefined;

    if (!message || typeof message !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'message' } });
    }

    if (!Array.isArray(history)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'history' } });
    }

    const recipe = await assertRecipeAccess(req.userId!, id);

    let isPremium = false;
    let user = null;
    try {
      user = await fetchAndSyncUser(req.userId!);
      isPremium = isPremiumUser(user);
    } catch (err) {
      console.warn(`Failed to fetch user metadata for chat premium check:`, err);
    }

    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'chat' } });
    }

    let userPrefs:
      | {
          recipeLanguage?: string;
          preferredTemperatureUnit?: string;
          preferredUnitSystem?: string;
        }
      | undefined;

    if (user?.user_metadata) {
      const meta = user.user_metadata;
      const languageMap: Record<string, string> = {
        de: 'German',
        en: 'English',
        german: 'German',
        english: 'English',
      };

      let recipeLanguage: string | undefined;
      if (meta.language) {
        recipeLanguage = languageMap[meta.language.toLowerCase()];
      }
      if (!recipeLanguage && meta.recipe_language) {
        recipeLanguage = languageMap[meta.recipe_language.toLowerCase()] || meta.recipe_language;
      }

      userPrefs = {
        recipeLanguage,
        preferredTemperatureUnit: meta.preferred_temperature_unit,
        preferredUnitSystem: meta.preferred_unit_system,
      };
    }

    const result = await chatAboutRecipe(
      recipe,
      message,
      history,
      req.userId!,
      userPrefs,
      normalizedStagedChanges
    );

    const responsePayload: Record<string, unknown> = {
      success: true,
      chatMessage: result.chatMessage,
      toolCalled: result.toolCalled,
      toolArgs: result.toolArgs,
      recipeWasModified: result.recipeWasModified,
      pendingRemix: result.pendingRemix,
      modificationRequest: result.modificationRequest,
      changes: result.changes,
    };

    if (result.recipeWasModified && result.newRecipe) {
      const remixPrompt = result.toolArgs?.modification_request || 'AI Copilot modification';
      console.log(`[chat route] Saving completed recipe remix descended from ${id}`);
      const saved = await createRecipeForUser(
        req.userId!,
        {
          ...result.newRecipe,
          sourceUrl: recipe.sourceUrl,
          sourceHandle: recipe.sourceHandle,
          parentRecipeId: id,
          remixPrompt,
        },
        'remix',
        'remix'
      );
      responsePayload.newRecipeId = saved.id;
      responsePayload.updatedRecipeJson = saved;
    }

    res.status(200).json(responsePayload);
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error in recipe chat handler:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.patch('/recipes/:id/favorite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;

    if (typeof isFavorite !== 'boolean') {
      throw new AppError('INVALID_FIELD', { params: { field: 'isFavorite' } });
    }

    await assertRecipeAccess(req.userId!, id);
    await setFavorite(id, req.userId!, isFavorite);
    res.status(200).json({ success: true, message: 'Favorite status updated.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating favorite status:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.patch('/recipes/:id/flags', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { flags } = req.body;

    if (!Array.isArray(flags) || flags.some((f: unknown) => typeof f !== 'string')) {
      throw new AppError('INVALID_FIELD', { params: { field: 'flags' } });
    }

    const user = await fetchAndSyncUser(req.userId!);
    if (!isPremiumUser(user)) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'tags' } });
    }

    await assertRecipeAccess(req.userId!, id);
    await setFlags(id, req.userId!, flags);
    res.status(200).json({ success: true, message: 'Custom flags updated.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating custom flags:', error);
    sendAppError(res, error);
  }
});


recipeRoutes.patch('/recipes/:id/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { collectionIds } = req.body;

    if (!Array.isArray(collectionIds) || collectionIds.some((cid: unknown) => typeof cid !== 'string')) {
      throw new AppError('INVALID_FIELD', { params: { field: 'collectionIds' } });
    }

    await assertRecipeAccess(req.userId!, id);
    await setRecipeCollections(id, req.userId!, collectionIds);
    res.status(200).json({ success: true, message: 'Recipe collections updated.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating recipe collections:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.post('/recipes/:id/cooked', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { photoBase64, viaCookingMode, timerElapsed } = req.body ?? {};

    const recipe = await assertRecipeAccess(req.userId!, id);

    let photoPath: string | null = null;
    let hasPhoto = false;

    if (photoBase64 && typeof photoBase64 === 'string' && photoBase64.trim().length > 0) {
      if (photoBase64.length > MAX_PHOTOS_TOTAL_CHARS) {
        throw new AppError('PHOTOS_TOO_LARGE');
      }

      const verification = await verifyCookedDishPhoto(recipe, photoBase64);
      if (!verification.isMatchingDish) {
        throw new AppError('PHOTO_NOT_MATCHING', {
          params: { reason: verification.reasoning },
        });
      }

      try {
        photoPath = await uploadCookPhoto(req.userId!, randomUUID(), photoBase64);
        hasPhoto = true;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Cook photo upload failed:', errMsg);
        throw new AppError('PHOTO_UPLOAD_FAILED');
      }
    }

    const result = await recordCook(req.userId!, id, {
      hasPhoto,
      photoPath,
      viaCookingMode: !!viaCookingMode,
      timerElapsed: !!timerElapsed,
    });

    // Automatically synchronize today's meal plan entry for this recipe if planned
    try {
      await markMealPlansCookedForRecipe(req.userId!, id);
    } catch (mealPlanErr) {
      console.warn('Failed to auto-mark meal plan entry as cooked:', mealPlanErr);
    }

    // Automatically deduct consumed ingredients from user's pantry
    try {
      await consumePantryForRecipe(req.userId!, recipe);
    } catch (pantryErr) {
      console.warn('Failed to auto-consume ingredients from pantry:', pantryErr);
    }

    res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error recording cook:', error);
    sendAppError(res, error);
  }
});

recipeRoutes.patch('/recipes/:id/visibility', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { visibility } = req.body;

    if (visibility !== 'public' && visibility !== 'private' && visibility !== 'unlisted') {
      throw new AppError('INVALID_FIELD', { params: { field: 'visibility' } });
    }

    const recipe = await assertRecipeAccess(req.userId!, id);

    const { error } = await getClient()
      .from('recipes')
      .update({
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ success: true, visibility, message: 'Recipe visibility updated.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating recipe visibility:', error);
    sendAppError(res, error);
  }
});

