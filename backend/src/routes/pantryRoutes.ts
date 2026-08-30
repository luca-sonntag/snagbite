import { Router, Request, Response } from 'express';
import {
  listPantryItems,
  createPantryItem,
  updatePantryItem,
  deletePantryItem,
  getPantryRecipeSuggestions,
  consumePantryForRecipe,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import { assertRecipeAccess } from './recipeRoutes.js';

export const pantryRoutes = Router();

pantryRoutes.get('/pantry', async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await listPantryItems(req.userId!);
    res.status(200).json({ success: true, items });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error listing pantry items:', error);
    sendAppError(res, error);
  }
});

pantryRoutes.post('/pantry', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, baseName, category, amount, unit, notes, expiresAt, shelfLifeDays } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('MISSING_FIELD', { params: { field: 'name' } });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new AppError('INVALID_FIELD', { params: { field: 'amount' } });
    }
    if (!unit || typeof unit !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'unit' } });
    }

    const item = await createPantryItem(req.userId!, {
      name: name.trim(),
      baseName: typeof baseName === 'string' ? baseName.trim() : undefined,
      category: typeof category === 'string' ? category.trim() : undefined,
      amount,
      unit: unit.trim(),
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      expiresAt: typeof expiresAt === 'string' ? expiresAt : undefined,
      shelfLifeDays: typeof shelfLifeDays === 'number' ? shelfLifeDays : undefined,
    });

    res.status(201).json({ success: true, item });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating pantry item:', error);
    sendAppError(res, error);
  }
});

pantryRoutes.patch('/pantry/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, baseName, category, amount, unit, notes, expiresAt } = req.body;

    const item = await updatePantryItem(id, req.userId!, {
      name: typeof name === 'string' ? name.trim() : undefined,
      baseName: typeof baseName === 'string' ? baseName.trim() : undefined,
      category: typeof category === 'string' ? category.trim() : undefined,
      amount: typeof amount === 'number' ? amount : undefined,
      unit: typeof unit === 'string' ? unit.trim() : undefined,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      expiresAt: expiresAt !== undefined ? expiresAt : undefined,
    });

    res.status(200).json({ success: true, item });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating pantry item:', error);
    sendAppError(res, error);
  }
});

pantryRoutes.delete('/pantry/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deletePantryItem(id, req.userId!);
    res.status(200).json({ success: true, message: 'Pantry item deleted.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error deleting pantry item:', error);
    sendAppError(res, error);
  }
});

pantryRoutes.post('/pantry/consume-recipe/:recipeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.params;
    const recipe = await assertRecipeAccess(req.userId!, recipeId);
    const result = await consumePantryForRecipe(req.userId!, recipe);
    res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error consuming recipe from pantry:', error);
    sendAppError(res, error);
  }
});

pantryRoutes.get('/pantry/suggestions', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 30);
    const suggestions = await getPantryRecipeSuggestions(req.userId!, limit);
    res.status(200).json({ success: true, suggestions });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error getting pantry suggestions:', error);
    sendAppError(res, error);
  }
});
