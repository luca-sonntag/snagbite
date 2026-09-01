import fs from 'node:fs';
import path from 'node:path';
import { getIngredientImagesDir } from '../ingredientImageService.js';
import type {
  MappingsManifest,
  IconsManifest,
  MappingAuditEntry,
  IconAuditEntry,
} from './types.js';

export function getMappingsManifestPath(): string {
  return process.env.TEST_MAPPINGS_MANIFEST_PATH || path.join(getIngredientImagesDir(), 'mappings_manifest.json');
}

export function getIconsManifestPath(): string {
  return process.env.TEST_ICONS_MANIFEST_PATH || path.join(getIngredientImagesDir(), 'icons_manifest.json');
}

function makeMappingKey(key: string, category: string): string {
  return `${(key || '').trim().toLowerCase()}::${(category || '').trim().toUpperCase()}`;
}

let mappingsCache: MappingsManifest | null = null;
let iconsCache: IconsManifest | null = null;

export function loadMappingsManifest(): MappingsManifest {
  if (mappingsCache) return mappingsCache;

  const filePath = getMappingsManifestPath();
  const fallback: MappingsManifest = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: {},
  };

  if (!fs.existsSync(filePath)) {
    mappingsCache = fallback;
    return fallback;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as MappingsManifest;
    mappingsCache = {
      version: parsed.version || 1,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      entries: parsed.entries || {},
    };
    return mappingsCache;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[auditManifest] Error reading mappings manifest (${msg}), using empty.`);
    mappingsCache = fallback;
    return fallback;
  }
}

export function saveMappingsManifest(manifest: MappingsManifest): void {
  mappingsCache = manifest;
  const filePath = getMappingsManifestPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  manifest.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
}

export function isMappingConfirmed(key: string, category: string): boolean {
  const manifest = loadMappingsManifest();
  const compositeKey = makeMappingKey(key, category);
  const entry = manifest.entries[compositeKey];
  return entry?.status === 'ai_confirmed';
}

export function recordMappingAudit(entry: MappingAuditEntry): void {
  const manifest = loadMappingsManifest();
  const compositeKey = makeMappingKey(entry.mappingKey, entry.category);
  manifest.entries[compositeKey] = entry;
  saveMappingsManifest(manifest);
}

export function loadIconsManifest(): IconsManifest {
  if (iconsCache) return iconsCache;

  const filePath = getIconsManifestPath();
  const fallback: IconsManifest = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    entries: {},
  };

  if (!fs.existsSync(filePath)) {
    iconsCache = fallback;
    return fallback;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as IconsManifest;
    iconsCache = {
      version: parsed.version || 1,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      entries: parsed.entries || {},
    };
    return iconsCache;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[auditManifest] Error reading icons manifest (${msg}), using empty.`);
    iconsCache = fallback;
    return fallback;
  }
}

export function saveIconsManifest(manifest: IconsManifest): void {
  iconsCache = manifest;
  const filePath = getIconsManifestPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  manifest.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
}

export function isIconConfirmed(filename: string): boolean {
  const manifest = loadIconsManifest();
  const cleanName = path.basename(filename).toLowerCase().trim();
  const entry = manifest.entries[cleanName];
  return entry?.status === 'ai_confirmed';
}

export function recordIconAudit(entry: IconAuditEntry): void {
  const manifest = loadIconsManifest();
  const cleanName = path.basename(entry.filename).toLowerCase().trim();
  manifest.entries[cleanName] = { ...entry, filename: cleanName };
  saveIconsManifest(manifest);
}

export function resetManifestsCache(): void {
  mappingsCache = null;
  iconsCache = null;
}
