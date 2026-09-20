import { Router, Request, Response } from 'express';
import {
  listMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
} from '../db.js';
import { AppError, sendAppError } from '../errors.js';
import type { MealType } from '@cookbook/shared';

const VALID_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const mealPlanRoutes = Router();

mealPlanRoutes.get('/meal-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    const mealPlans = await listMealPlans(req.userId!, startDate, endDate);
    res.status(200).json({ success: true, mealPlans });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error listing meal plans:', error);
    sendAppError(res, error);
  }
});

mealPlanRoutes.post('/meal-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipeId, planDate, mealType, servings, notes } = req.body;

    if (!recipeId || typeof recipeId !== 'string') {
      throw new AppError('INVALID_FIELD', { params: { field: 'recipeId' } });
    }
    if (!planDate || typeof planDate !== 'string' || !DATE_REGEX.test(planDate)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'planDate' } });
    }
    if (!mealType || !VALID_MEAL_TYPES.includes(mealType as MealType)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'mealType' } });
    }

    const mealPlan = await createMealPlan(req.userId!, {
      recipeId,
      planDate,
      mealType: mealType as MealType,
      servings: typeof servings === 'number' && servings > 0 ? servings : 2,
      notes: typeof notes === 'string' ? notes : undefined,
    });

    res.status(201).json({ success: true, mealPlan });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating meal plan:', error);
    sendAppError(res, error);
  }
});

mealPlanRoutes.patch('/meal-plan/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { planDate, mealType, servings, isCooked, notes } = req.body;

    if (planDate !== undefined && (!DATE_REGEX.test(planDate) || typeof planDate !== 'string')) {
      throw new AppError('INVALID_FIELD', { params: { field: 'planDate' } });
    }
    if (mealType !== undefined && !VALID_MEAL_TYPES.includes(mealType as MealType)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'mealType' } });
    }

    const mealPlan = await updateMealPlan(id, req.userId!, {
      planDate,
      mealType: mealType as MealType,
      servings: typeof servings === 'number' && servings > 0 ? servings : undefined,
      isCooked: typeof isCooked === 'boolean' ? isCooked : undefined,
      notes: typeof notes === 'string' || notes === null ? notes : undefined,
    });

    res.status(200).json({ success: true, mealPlan });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error updating meal plan:', error);
    sendAppError(res, error);
  }
});

mealPlanRoutes.delete('/meal-plan/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteMealPlan(id, req.userId!);
    res.status(200).json({ success: true, message: 'Meal plan entry deleted.' });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error deleting meal plan:', error);
    sendAppError(res, error);
  }
});
