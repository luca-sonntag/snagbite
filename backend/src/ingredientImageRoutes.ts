import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import type { CanonicalIngredient } from './data/canonicalIngredients.js';
import { openFoodFactsAccess } from './matching/openFoodFactsIndex.js';
import { getClient } from './db.js';
import { packIngredientIcons } from './ingredientIconPacker.js';
import { renderIngredientViewerHtml } from './views/ingredientStudioHtml.js';
import {
  findExistingIngredientImage,
  generateIngredientIcon,
  getIngredientImagesDir,
  ensureImageDirExists,
  getIngredientSlug,
  getGenerationCostsSummary,
} from './ingredientImageService.js';

export const ingredientImageRouter = express.Router();

function getFileMtimeMs(filename: string | null): number {
  if (!filename) return 0;
  try {
    const fullPath = path.join(getIngredientImagesDir(), filename);
    if (fs.existsSync(fullPath)) {
      return Math.floor(fs.statSync(fullPath).mtimeMs);
    }
  } catch {}
  return Date.now();
}

// GET /api/dev/ingredients - List ingredients with image status & cost summary
ingredientImageRouter.get('/api/dev/ingredients', async (req: Request, res: Response) => {
  try {
    const imageDir = getIngredientImagesDir();
    ensureImageDirExists(imageDir);
    const source = ((req.query.source as string) || 'disk').toLowerCase().trim(); // 'disk' | 'mappings' | 'missing' | 'off'
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const category = ((req.query.category as string) || '').trim();
    const hasImageFilter = (req.query.hasImage as string) || 'all'; // 'all' | 'true' | 'false'
    const limit = parseInt(req.query.limit as string, 10) || 1500;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    // 1. Gather all actual icons existing on disk
    const files = fs.existsSync(imageDir) ? fs.readdirSync(imageDir) : [];
    const iconFiles = files.filter(f => f.toLowerCase().endsWith('.webp') && !f.toLowerCase().startsWith('category_'));

    // 2. Fetch database mappings from Postgres (ingredient_mappings)
    let dbMappings: Array<{ mapping_key: string; mapping_key_de: string | null; category: string | null; product_code: string | null; hit_count?: number }> = [];
    try {
      const { data, error } = await getClient()
        .from('ingredient_mappings')
        .select('mapping_key, mapping_key_de, category, product_code, hit_count')
        .order('hit_count', { ascending: false });
      if (!error && data) {
        dbMappings = data;
      }
    } catch {
      // Postgres might be offline in local dev mode
    }

    // Count missing in DB
    const missingInDbCount = dbMappings.filter(m => !findExistingIngredientImage(m.mapping_key)).length;

    let items: Array<{
      id: string;
      slug: string;
      name_de: string;
      name_en: string;
      category: string;
      hasImage: boolean;
      filename: string | null;
      imageUrl: string | null;
      hitCount?: number;
      source: string;
    }> = [];

    if (source === 'mappings' || source === 'missing') {
      // Build items from Postgres mappings
      for (const m of dbMappings) {
        const key = m.mapping_key.toLowerCase().trim();
        const filename = findExistingIngredientImage(key);
        const hasImage = !!filename;
        if (source === 'missing' && hasImage) continue;

        const formatted = key.replace(/_/g, ' ');
        const v = getFileMtimeMs(filename);
        items.push({
          id: key,
          slug: key.replace(/\s+/g, '_'),
          name_de: m.mapping_key_de || formatted,
          name_en: formatted,
          category: m.category || 'OTHER',
          hasImage,
          filename,
          imageUrl: hasImage ? `/api/ingredient-icons/${filename}?v=${v}` : null,
          hitCount: m.hit_count ?? 0,
          source: 'db',
        });
      }
    } else if (source === 'off') {
      // Search / list top items from Open Food Facts SQLite
      const offResults = search
        ? openFoodFactsAccess.search(search, category && category !== 'ALL' ? category : undefined, 100)
        : openFoodFactsAccess.listCategory(category && category !== 'ALL' ? category : 'FRUITS_VEGETABLES', 100);

      for (const prod of offResults) {
        const slug = getIngredientSlug(prod);
        const filename = findExistingIngredientImage(prod.id) || (slug ? findExistingIngredientImage(slug) : null);
        const hasImage = !!filename;
        const v = getFileMtimeMs(filename);

        items.push({
          id: prod.id,
          slug: slug || prod.id,
          name_de: prod.name_de,
          name_en: prod.name_en || prod.name_de,
          category: prod.category,
          hasImage,
          filename,
          imageUrl: hasImage ? `/api/ingredient-icons/${filename}?v=${v}` : null,
          source: 'off',
        });
      }
    } else {
      // Default: source === 'disk' (The complete 1,192 icon inventory on disk)
      for (const f of iconFiles) {
        const slug = f.replace(/\.webp$/i, '').toLowerCase();
        const formatted = slug.replace(/_/g, ' ');
        const v = getFileMtimeMs(f);
        items.push({
          id: slug,
          slug,
          name_de: formatted,
          name_en: formatted,
          category: 'OTHER',
          hasImage: true,
          filename: f,
          imageUrl: `/api/ingredient-icons/${f}?v=${v}`,
          source: 'disk',
        });
      }
    }

    // Apply filters
    if (category && category !== 'ALL') {
      items = items.filter(item => item.category === category);
    }

    if (hasImageFilter === 'true') {
      items = items.filter(item => item.hasImage);
    } else if (hasImageFilter === 'false') {
      items = items.filter(item => !item.hasImage);
    }

    if (search && source !== 'off') {
      items = items.filter(
        item =>
          item.name_de.toLowerCase().includes(search) ||
          item.name_en.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search) ||
          item.id.toLowerCase().includes(search)
      );
    }

    const totalFiltered = items.length;
    const paged = limit > 0 ? items.slice(offset, offset + limit) : items;
    const costsSummary = getGenerationCostsSummary(imageDir);

    res.json({
      success: true,
      source,
      stats: {
        diskCount: iconFiles.length,
        mappingsCount: dbMappings.length,
        missingCount: missingInDbCount,
        costs: costsSummary,
      },
      totalFiltered,
      items: paged,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Ingredient Icons Endpoint: GET /api/ingredient-icons/:filenameOrId
ingredientImageRouter.get(['/api/ingredient-icons/:filename', '/api/dev/ingredients/:id/image'], (req: Request, res: Response) => {
  try {
    const rawParam = req.params.filename || req.params.id || '';
    const cleanId = rawParam.replace(/\.webp$/i, '').toLowerCase().trim();
    const filename = findExistingIngredientImage(cleanId);
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
  } catch (err: any) {
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
  } catch (err: any) {
    res.status(500).send('Error serving category icon');
  }
});

// POST /api/dev/ingredients/:id/generate - Generate or re-generate an icon
ingredientImageRouter.post('/api/dev/ingredients/:id/generate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id.toLowerCase().trim();
    let item: CanonicalIngredient | null = openFoodFactsAccess.get(id);

    if (!item) {
      // Construct canonical pseudo-item from baseName slug
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

    if (!item) {
      return res.status(404).json({ success: false, error: `Ingredient ${id} not found` });
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Generation failed' });
  }
});

// POST /api/dev/ingredients/repack-zip - Repack ingredient-icons.zip
ingredientImageRouter.post('/api/dev/ingredients/repack-zip', (_req: Request, res: Response) => {
  try {
    const result = packIngredientIcons({ verbose: false });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /dev/ingredients or /ingredients-viewer - Standalone HTML One-Pager
ingredientImageRouter.get(['/dev/ingredients', '/ingredients-viewer'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIngredientViewerHtml());
});
