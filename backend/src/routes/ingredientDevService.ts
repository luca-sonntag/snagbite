import path from 'path';
import fs from 'fs';
import { db } from '../db/drizzle.js';
import { ingredientMappings } from '../db/schema/ingredients.js';
import { desc } from 'drizzle-orm';
import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';
import {
  findExistingIngredientImage,
  getIngredientImagesDir,
  ensureImageDirExists,
  getIngredientSlug,
  getGenerationCostsSummary,
} from '../ingredientImageService.js';

export function getFileMtimeMs(filename: string | null): number {
  if (!filename) return 0;
  try {
    const fullPath = path.join(getIngredientImagesDir(), filename);
    if (fs.existsSync(fullPath)) {
      return Math.floor(fs.statSync(fullPath).mtimeMs);
    }
  } catch {}
  return Date.now();
}

export interface DevIngredientItem {
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
}

export async function fetchDevIngredientsList(query: Record<string, unknown>) {
  const imageDir = getIngredientImagesDir();
  ensureImageDirExists(imageDir);
  const source = ((query.source as string) || 'disk').toLowerCase().trim();
  const search = ((query.search as string) || '').toLowerCase().trim();
  const category = ((query.category as string) || '').trim();
  const hasImageFilter = (query.hasImage as string) || 'all';
  const limit = parseInt(query.limit as string, 10) || 1500;
  const offset = parseInt(query.offset as string, 10) || 0;

  const files = fs.existsSync(imageDir) ? fs.readdirSync(imageDir) : [];
  const iconFiles = files.filter(f => f.toLowerCase().endsWith('.webp') && !f.toLowerCase().startsWith('category_'));

  let dbMappings: Array<{
    mapping_key: string;
    mapping_key_de: string | null;
    category: string | null;
    product_code: string | null;
    hit_count?: number;
  }> = [];

  try {
    const rows = await db
      .select({
        mapping_key: ingredientMappings.mappingKey,
        mapping_key_de: ingredientMappings.mappingKeyDe,
        category: ingredientMappings.category,
        product_code: ingredientMappings.productCode,
        hit_count: ingredientMappings.hitCount,
      })
      .from(ingredientMappings)
      .orderBy(desc(ingredientMappings.hitCount));
    dbMappings = rows;
  } catch {
    // Postgres offline in dev mode fallback
  }

  const missingInDbCount = dbMappings.filter(m => !findExistingIngredientImage(m.mapping_key)).length;
  let items: DevIngredientItem[] = [];

  if (source === 'mappings' || source === 'missing') {
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

  return {
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
  };
}
