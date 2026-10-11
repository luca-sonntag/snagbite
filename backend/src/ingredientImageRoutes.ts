import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import type { CanonicalIngredient } from './data/canonicalIngredients.js';
import { openFoodFactsAccess } from './matching/openFoodFactsIndex.js';
import { packIngredientIcons } from './ingredientIconPacker.js';
import { renderIngredientViewerHtml } from './views/ingredientStudioHtml.js';
import {
  findExistingIngredientImage,
  generateIngredientIcon,
  getIngredientImagesDir,
  getGenerationCostsSummary,
} from './ingredientImageService.js';
import {
  fetchDevIngredientsList,
} from './routes/ingredientDevService.js';

export const ingredientImageRouter = express.Router();

// GET /api/dev/ingredients - List ingredients with image status & cost summary
ingredientImageRouter.get('/api/dev/ingredients', async (req: Request, res: Response) => {
  try {
    const data = await fetchDevIngredientsList(req.query);
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// Public Ingredient Icons Endpoint: GET /api/ingredient-icons/:filenameOrId
ingredientImageRouter.get(['/api/ingredient-icons/:filename', '/api/dev/ingredients/:id/image'], (req: Request, res: Response) => {
  try {
    const rawParam = req.params.filename || req.params.id || '';
    const cleanId = rawParam.replace(/\.webp$/i, '').toLowerCase().trim();

    const synParam = req.query.synonyms || req.query.syn;
    const synonyms = typeof synParam === 'string'
      ? synParam.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(synParam)
        ? (synParam as string[]).map((s: unknown) => String(s).trim()).filter(Boolean)
        : undefined;

    const filename = findExistingIngredientImage(cleanId, undefined, synonyms);
    if (!filename) {
      return res.status(404).send('Ingredient icon not found');
    }

    const filePath = path.join(getIngredientImagesDir(), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Ingredient icon file missing');
    }

    const hasVersion = !!req.query.v;
    res.setHeader('Content-Type', 'image/webp');
    if (hasVersion) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  } catch {
    res.status(500).send('Error serving ingredient icon');
  }
});

// Public Category Icons Endpoint: GET /api/category-icons/:filename
ingredientImageRouter.get('/api/category-icons/:filename', (req: Request, res: Response) => {
  try {
    const rawParam = req.params.filename || '';
    const cleanName = rawParam.replace(/\.webp$/i, '').toLowerCase().trim();
    const cwd = process.cwd();
    const baseDir = path.basename(cwd).toLowerCase() === 'backend'
      ? path.resolve(cwd, 'public', 'category-icons')
      : path.resolve(cwd, 'backend', 'public', 'category-icons');

    const filePath = path.join(baseDir, `${cleanName}.webp`);
    if (!fs.existsSync(filePath)) {
      const fallbackPath = path.join(baseDir, 'other.webp');
      if (fs.existsSync(fallbackPath)) {
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.sendFile(fallbackPath);
      }
      return res.status(404).send('Category icon not found');
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  } catch {
    res.status(500).send('Error serving category icon');
  }
});

// POST /api/dev/ingredients/:id/generate - Generate or re-generate an icon
ingredientImageRouter.post('/api/dev/ingredients/:id/generate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id.toLowerCase().trim();
    let item: CanonicalIngredient | null = openFoodFactsAccess.get(id);

    if (!item) {
      const slugId = id.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const nameEn = slugId.replace(/_/g, ' ');
      item = {
        id: slugId,
        product_code: slugId,
        name_de: (req.body?.name_de as string) || nameEn,
        name_en: nameEn,
        category: (req.body?.category as string) || 'OTHER',
        nutrients_per_100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        aliases: [nameEn],
      };
    }

    const result = await generateIngredientIcon(item);
    const costsSummary = getGenerationCostsSummary(getIngredientImagesDir());

    res.json({
      success: true,
      item: {
        id: item.id,
        name_de: item.name_de,
        name_en: item.name_en,
        category: item.category,
        filename: result.filename,
        imageUrl: `/api/ingredient-icons/${result.filename}?v=${Date.now()}`,
        hasImage: true,
      },
      costs: result.costs,
      costsSummary,
      durationMs: result.durationMs,
      sizeKb: result.sizeKb,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/dev/ingredients/repack-zip - Repack ingredient-icons.zip
ingredientImageRouter.post('/api/dev/ingredients/repack-zip', (_req: Request, res: Response) => {
  try {
    const result = packIngredientIcons({ verbose: false });
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /dev/ingredients or /ingredients-viewer - Standalone HTML One-Pager
ingredientImageRouter.get(['/dev/ingredients', '/ingredients-viewer'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIngredientViewerHtml());
});
