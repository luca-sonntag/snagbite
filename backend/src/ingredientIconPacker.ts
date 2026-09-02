import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export function getIngredientZipPath(): string {
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === 'backend') {
    return path.resolve(cwd, 'public', 'ingredient-icons.zip');
  }
  return path.resolve(cwd, 'backend', 'public', 'ingredient-icons.zip');
}

export function getIngredientImagesDir(): string {
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === 'backend') {
    return path.resolve(cwd, 'public', 'ingredient-icons');
  }
  return path.resolve(cwd, 'backend', 'public', 'ingredient-icons');
}

export interface PackIconsResult {
  fileCount: number;
  zipSizeMb: number;
  zipPath: string;
  durationMs: number;
}

/**
 * Packages all .webp icon files and generation_costs.jsonl from public/ingredient-icons
 * into a single archive (public/ingredient-icons.zip).
 */
export function packIngredientIcons(options: { verbose?: boolean } = {}): PackIconsResult {
  const startTime = Date.now();
  const iconsDir = getIngredientImagesDir();
  const zipPath = getIngredientZipPath();

  if (!fs.existsSync(iconsDir)) {
    throw new Error(`Icons directory not found at: ${iconsDir}`);
  }

  // Ensure target directory exists for zipPath
  const zipDir = path.dirname(zipPath);
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true });
  }

  const allFiles = fs.readdirSync(iconsDir);
  const iconFiles = allFiles.filter((f) => f.endsWith('.webp') || f.endsWith('.json') || f.endsWith('.jsonl'));

  if (iconFiles.length === 0) {
    throw new Error(`No .webp icon files found in: ${iconsDir}`);
  }

  if (options.verbose) {
    console.log(`[ingredientIconPacker] Packing ${iconFiles.length} files into ${zipPath}...`);
  }

  const zip = new AdmZip();
  for (const filename of iconFiles) {
    const fullPath = path.join(iconsDir, filename);
    zip.addLocalFile(fullPath, '', filename);
  }

  zip.writeZip(zipPath);

  const durationMs = Date.now() - startTime;
  const stat = fs.statSync(zipPath);
  const zipSizeMb = Number((stat.size / (1024 * 1024)).toFixed(2));

  // Write stamp file to indicate this folder matches this zip
  const stampPath = path.join(iconsDir, '.unpacked_stamp');
  try {
    fs.writeFileSync(
      stampPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        zipMtime: stat.mtimeMs,
        zipSize: stat.size,
        count: iconFiles.length,
      }, null, 2),
      'utf-8'
    );
  } catch {
    // Non-fatal if stamp can't be written
  }

  if (options.verbose) {
    console.log(`[ingredientIconPacker] Successfully packed ${iconFiles.length} icons (${zipSizeMb} MB) in ${durationMs}ms`);
  }

  return {
    fileCount: iconFiles.length,
    zipSizeMb,
    zipPath,
    durationMs,
  };
}

export interface EnsureExtractedResult {
  extracted: boolean;
  reason?: 'zip_not_found' | 'already_extracted' | 'extracted_ok' | 'error';
  count: number;
  durationMs?: number;
  error?: string;
}

/**
 * Checks if the ingredient icons need to be extracted from ingredient-icons.zip
 * and unpacks them into public/ingredient-icons if needed.
 * Runs on server startup (Railway / local).
 */
export async function ensureIngredientIconsExtracted(options: { force?: boolean; verbose?: boolean } = {}): Promise<EnsureExtractedResult> {
  const startTime = Date.now();
  const zipPath = getIngredientZipPath();
  const targetDir = getIngredientImagesDir();

  if (!fs.existsSync(zipPath)) {
    if (options.verbose) {
      console.log(`[ingredientIconPacker] No icon archive found at ${zipPath}, skipping extraction.`);
    }
    // Check if icons already exist directly
    let existingCount = 0;
    if (fs.existsSync(targetDir)) {
      existingCount = fs.readdirSync(targetDir).filter((f) => f.endsWith('.webp')).length;
    }
    return { extracted: false, reason: 'zip_not_found', count: existingCount };
  }

  const zipStat = fs.statSync(zipPath);
  const stampPath = path.join(targetDir, '.unpacked_stamp');

  // Check if already unpacked and up-to-date
  if (!options.force && fs.existsSync(targetDir) && fs.existsSync(stampPath)) {
    try {
      const stampContent = fs.readFileSync(stampPath, 'utf-8');
      const stamp = JSON.parse(stampContent);
      if (stamp.zipMtime === zipStat.mtimeMs && stamp.zipSize === zipStat.size) {
        const webpCount = fs.readdirSync(targetDir).filter((f) => f.endsWith('.webp')).length;
        if (webpCount > 0) {
          if (options.verbose) {
            console.log(`[ingredientIconPacker] Icons up to date (${webpCount} icons cached).`);
          }
          return { extracted: false, reason: 'already_extracted', count: webpCount };
        }
      }
    } catch {
      // If stamp read fails, proceed to extraction
    }
  }

  // Need extraction
  console.log(`[ingredientIconPacker] Extracting ingredient icons from ${zipPath} into ${targetDir}...`);
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetDir, true /* overwrite */);

    const extractedFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith('.webp'));
    const durationMs = Date.now() - startTime;

    // Write stamp
    try {
      fs.writeFileSync(
        stampPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          zipMtime: zipStat.mtimeMs,
          zipSize: zipStat.size,
          count: extractedFiles.length,
        }, null, 2),
        'utf-8'
      );
    } catch {
      // Non-fatal
    }

    console.log(`[ingredientIconPacker] Successfully extracted ${extractedFiles.length} icons in ${durationMs}ms`);
    return {
      extracted: true,
      reason: 'extracted_ok',
      count: extractedFiles.length,
      durationMs,
    };
  } catch (err: any) {
    console.error(`[ingredientIconPacker] Failed to extract icons: ${err.message}`);
    return {
      extracted: false,
      reason: 'error',
      count: 0,
      error: err.message,
    };
  }
}
