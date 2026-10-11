import { Router, Request, Response } from 'express';
import { requireAdmin } from '../auth.js';
import { db } from '../db/drizzle.js';
import { ingredientMappings } from '../db/schema/ingredients.js';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';
import { invalidateCache as invalidateMappingCache } from '../matching/mappingStore.js';
import { AppError, sendAppError } from '../errors.js';

export const adminMappingRoutes = Router();

/**
 * List learned ingredient mappings.
 * GET /api/admin/ingredient-mappings?search=&source=&limit=
 */
adminMappingRoutes.get(
  '/admin/ingredient-mappings',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const source = typeof req.query.source === 'string' ? req.query.source.trim() : '';
      const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);

      const conditions = [];
      if (search) conditions.push(ilike(ingredientMappings.mappingKey, `%${search}%`));
      if (source) conditions.push(eq(ingredientMappings.source, source));

      const rows = await db
        .select({
          id: ingredientMappings.id,
          mapping_key: ingredientMappings.mappingKey,
          category: ingredientMappings.category,
          product_code: ingredientMappings.productCode,
          resolution: ingredientMappings.resolution,
          source: ingredientMappings.source,
          confidence: ingredientMappings.confidence,
          model: ingredientMappings.model,
          reasoning: ingredientMappings.reasoning,
          hit_count: ingredientMappings.hitCount,
          created_at: ingredientMappings.createdAt,
          updated_at: ingredientMappings.updatedAt,
        })
        .from(ingredientMappings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ingredientMappings.createdAt))
        .limit(limit);

      res.json({ success: true, mappings: rows });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error fetching ingredient mappings:', error);
      sendAppError(res, error);
    }
  }
);

/**
 * Correct or delete one learned ingredient mapping.
 * PATCH /api/admin/ingredient-mappings/:id  { productCode: string | null }
 */
adminMappingRoutes.patch(
  '/admin/ingredient-mappings/:id',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rawCode = req.body?.productCode;
      const productCode = typeof rawCode === 'string' && rawCode.trim() ? rawCode.trim().toLowerCase() : null;

      if (productCode) {
        const item = openFoodFactsAccess.get(productCode);
        if (!item) {
          throw new AppError('INVALID_FIELD', { params: { field: 'productCode' } });
        }
      }

      await db
        .update(ingredientMappings)
        .set({
          productCode,
          resolution: productCode ? 'matched' : 'no_match',
          source: 'human',
          confidence: '1',
          reasoning: `Corrected by ${req.userEmail ?? 'admin'}`,
          updatedAt: new Date(),
        })
        .where(eq(ingredientMappings.id, id));

      invalidateMappingCache();

      res.json({ success: true });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error updating ingredient mapping:', error);
      sendAppError(res, error);
    }
  }
);

/**
 * DELETE /api/admin/ingredient-mappings/:id
 */
adminMappingRoutes.delete(
  '/admin/ingredient-mappings/:id',
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await db
        .delete(ingredientMappings)
        .where(eq(ingredientMappings.id, req.params.id));

      invalidateMappingCache();
      res.json({ success: true });
    } catch (error: unknown) {
      if (!(error instanceof AppError)) console.error('Error deleting ingredient mapping:', error);
      sendAppError(res, error);
    }
  }
);
