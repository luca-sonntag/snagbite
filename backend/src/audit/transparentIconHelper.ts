import fs from 'node:fs';
import path from 'node:path';
import { removeBackgroundWithBgbuster } from './bgbusterService.js';
import { isImageTransparent, centerAndScaleTransparentIcon } from './iconGeometry.js';

export interface TransparentIconResult {
  applied: boolean;
  costUsd: number;
  oldFilePath?: string;
}

/**
 * Ensures an ingredient icon has a clean transparent background, is losslessly
 * scaled to target margins (~20%) and centered on a 512x512 canvas.
 *
 * If the image is not yet transparent, attempts BGBuster API background removal.
 * If BGBuster is unconfigured or fails, falls back gracefully.
 */
export async function ensureTransparentAndCenteredIcon(
  filePath: string,
  imagesDir: string
): Promise<TransparentIconResult> {
  if (!fs.existsSync(filePath)) {
    return { applied: false, costUsd: 0 };
  }

  const filename = path.basename(filePath);
  const oldDir = path.join(imagesDir, 'old');
  const oldFilePath = path.join(oldDir, filename);

  const backupOld = () => {
    if (fs.existsSync(filePath) && !fs.existsSync(oldFilePath)) {
      if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });
      try {
        fs.copyFileSync(filePath, oldFilePath);
        return oldFilePath;
      } catch {
        return undefined;
      }
    }
    return fs.existsSync(oldFilePath) ? oldFilePath : undefined;
  };

  const buffer = fs.readFileSync(filePath);
  const alreadyTransparent = await isImageTransparent(buffer);

  if (alreadyTransparent) {
    // Already transparent: ensure it is perfectly centered and scaled
    const centeredBuffer = await centerAndScaleTransparentIcon(buffer);
    fs.writeFileSync(filePath, centeredBuffer);
    return { applied: true, costUsd: 0 };
  }

  // Not transparent: call BGBuster
  const bgbusterRes = await removeBackgroundWithBgbuster(buffer);
  if (!bgbusterRes) {
    return { applied: false, costUsd: 0 };
  }

  const backedUpPath = backupOld();
  const finalCenteredBuffer = await centerAndScaleTransparentIcon(bgbusterRes.buffer);
  fs.writeFileSync(filePath, finalCenteredBuffer);

  return {
    applied: true,
    costUsd: bgbusterRes.costUsd,
    oldFilePath: backedUpPath,
  };
}
