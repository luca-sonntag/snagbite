import { Router, Request, Response } from 'express';
import {
  listShoppingList,
  createShoppingListItem,
  batchAddShoppingListItems,
  updateShoppingListItem,
  toggleShoppingListItem,
  batchToggleShoppingListItems,
  deleteShoppingListItem,
  deleteShoppingListItems,
  clearShoppingList,
  removeRecipeFromShoppingList,
  listPantryItems,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import type { CreateShoppingListItemDto } from '@cookbook/shared';

export const shoppingListRoutes = Router();

shoppingListRoutes.get('/shopping-list', async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await listShoppingList(req.userId!);
    res.status(200).json({ success: true, items });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error listing shopping list:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.post('/shopping-list', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      baseName,
      parentIngredient,
      modifier,
      brand,
      amount,
      unit,
      recipeId,
      recipeTitle,
      checked,
      category,
      canonicalId,
      notes,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('MISSING_FIELD', { params: { field: 'name' } });
    }

    // Check if ingredient is already in user's pantry
    let inPantryWarning = false;
    try {
      const pantry = await listPantryItems(req.userId!);
      const searchKey = (baseName || name || '').toLowerCase().trim();
      inPantryWarning = pantry.some((p) => {
        if (p.amount <= 0) return false;
        const pName = (p.name || '').toLowerCase().trim();
        const pBase = (p.baseName || '').toLowerCase().trim();
        return pName === searchKey || pBase === searchKey;
      });
    } catch {}

    const item = await createShoppingListItem(req.userId!, {
      name: name.trim(),
      baseName: typeof baseName === 'string' ? baseName.trim() : undefined,
      parentIngredient: typeof parentIngredient === 'object' ? parentIngredient : undefined,
      modifier: typeof modifier === 'string' ? modifier.trim() : undefined,
      brand: typeof brand === 'string' ? brand.trim() : undefined,
      amount: typeof amount === 'number' ? amount : 0,
      unit: typeof unit === 'string' ? unit.trim() : '',
      recipeId: typeof recipeId === 'string' ? recipeId : undefined,
      recipeTitle: typeof recipeTitle === 'string' ? recipeTitle : undefined,
      checked: !!checked,
      category: typeof category === 'string' ? category : undefined,
      canonicalId: typeof canonicalId === 'string' ? canonicalId : undefined,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      inPantryWarning,
    });

    res.status(201).json({ success: true, item });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating shopping list item:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.post('/shopping-list/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, recipeId } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'items' } });
    }

    // If recipeId is given, remove previous ingredients from this recipe first (to prevent dupes on portion change)
    if (typeof recipeId === 'string' && recipeId.trim()) {
      await removeRecipeFromShoppingList(req.userId!, recipeId.trim()).catch(() => {});
    }

    // Check pantry stock to flag items already in stock
    const pantry = await listPantryItems(req.userId!).catch(() => []);
    const pantryNames = new Set(
      pantry
        .filter((p) => p.amount > 0)
        .flatMap((p) => [
          (p.name || '').toLowerCase().trim(),
          (p.baseName || '').toLowerCase().trim(),
        ])
        .filter(Boolean)
    );

    const dtos: CreateShoppingListItemDto[] = items.map((raw: any) => {
      const name = String(raw.name ?? '').trim();
      const baseName = typeof raw.baseName === 'string' ? raw.baseName.trim() : undefined;
      const searchKey = (baseName || name).toLowerCase().trim();
      const inPantryWarning = pantryNames.has(searchKey);

      return {
        name,
        baseName,
        parentIngredient: typeof raw.parentIngredient === 'object' ? raw.parentIngredient : undefined,
        modifier: typeof raw.modifier === 'string' ? raw.modifier.trim() : undefined,
        brand: typeof raw.brand === 'string' ? raw.brand.trim() : undefined,
        amount: typeof raw.amount === 'number' ? raw.amount : 0,
        unit: typeof raw.unit === 'string' ? raw.unit.trim() : '',
        recipeId: typeof raw.recipeId === 'string' ? raw.recipeId : recipeId,
        recipeTitle: typeof raw.recipeTitle === 'string' ? raw.recipeTitle : undefined,
        checked: !!raw.checked,
        category: typeof raw.category === 'string' ? raw.category : undefined,
        canonicalId: typeof raw.canonicalId === 'string' ? raw.canonicalId : undefined,
        notes: typeof raw.notes === 'string' ? raw.notes.trim() : undefined,
        inPantryWarning,
      };
    });

    const created = await batchAddShoppingListItems(req.userId!, dtos);
    res.status(201).json({ success: true, items: created });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error batch adding shopping items:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.patch('/shopping-list/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, baseName, amount, unit, checked, notes, modifier, brand, category, inPantryWarning, autoAddToPantry } = req.body;

    if (checked !== undefined) {
      const item = await toggleShoppingListItem(id, req.userId!, !!checked, autoAddToPantry !== false);
      res.status(200).json({ success: true, item });
      return;
    }

    const item = await updateShoppingListItem(id, req.userId!, {
      name: typeof name === 'string' ? name.trim() : undefined,
      baseName: typeof baseName === 'string' ? baseName.trim() : undefined,
      amount: typeof amount === 'number' ? amount : undefined,
      unit: typeof unit === 'string' ? unit.trim() : undefined,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      modifier: typeof modifier === 'string' ? modifier.trim() : undefined,
      brand: typeof brand === 'string' ? brand.trim() : undefined,
      category: typeof category === 'string' ? category : undefined,
      inPantryWarning: typeof inPantryWarning === 'boolean' ? inPantryWarning : undefined,
    });

    res.status(200).json({ success: true, item });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating shopping list item:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.post('/shopping-list/batch-toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, checked, autoAddToPantry } = req.body;
    if (!Array.isArray(ids)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'ids' } });
    }
    if (typeof checked !== 'boolean') {
      throw new AppError('INVALID_FIELD', { params: { field: 'checked' } });
    }

    const items = await batchToggleShoppingListItems(req.userId!, ids, checked, autoAddToPantry !== false);
    res.status(200).json({ success: true, items });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error batch toggling shopping items:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.delete('/shopping-list/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteShoppingListItem(id, req.userId!);
    res.status(200).json({ success: true, message: 'Shopping list item deleted.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error deleting shopping list item:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.post('/shopping-list/delete-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'ids' } });
    }
    await deleteShoppingListItems(req.userId!, ids);
    res.status(200).json({ success: true, message: 'Shopping list items deleted.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error batch deleting shopping items:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.post('/shopping-list/clear', async (req: Request, res: Response): Promise<void> => {
  try {
    const { onlyChecked } = req.body ?? {};
    await clearShoppingList(req.userId!, !!onlyChecked);
    res.status(200).json({ success: true, message: 'Shopping list cleared.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error clearing shopping list:', error);
    sendAppError(res, error);
  }
});

shoppingListRoutes.post('/shopping-list/remove-recipe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId } = req.body ?? {};
    if (!recipeId || typeof recipeId !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'recipeId' } });
    }
    await removeRecipeFromShoppingList(req.userId!, recipeId);
    res.status(200).json({ success: true, message: 'Recipe ingredients removed from shopping list.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error removing recipe from shopping list:', error);
    sendAppError(res, error);
  }
});
