import { Router, Request, Response } from 'express';
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import { fetchAndSyncUser, isPremiumUser } from './authUtils.js';

export const collectionRoutes = Router();

async function checkPremium(req: Request): Promise<boolean> {
  try {
    const user = await fetchAndSyncUser(req.userId!);
    return isPremiumUser(user);
  } catch (err) {
    console.warn(`Failed to fetch user metadata for premium check:`, err);
    return false;
  }
}

collectionRoutes.get('/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const collections = await listCollections(req.userId!);
    res.status(200).json({ success: true, collections });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error listing collections:', error);
    sendAppError(res, error);
  }
});

collectionRoutes.post('/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, emoji, position } = req.body;

    if (!name || typeof name !== 'string') {
      throw new AppError('INVALID_FIELD', { params: { field: 'name' } });
    }

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    const collection = await createCollection(req.userId!, { name, emoji, position });
    res.status(201).json({ success: true, collection });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating collection:', error);
    sendAppError(res, error);
  }
});

collectionRoutes.patch('/collections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, emoji, position } = req.body;

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    const collection = await updateCollection(id, req.userId!, { name, emoji, position });
    res.status(200).json({ success: true, collection });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating collection:', error);
    sendAppError(res, error);
  }
});

collectionRoutes.delete('/collections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    await deleteCollection(id, req.userId!);
    res.status(200).json({ success: true, message: 'Collection deleted.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error deleting collection:', error);
    sendAppError(res, error);
  }
});
