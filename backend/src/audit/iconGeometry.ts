import fs from 'node:fs';
import sharp from 'sharp';
import type { IconGeometryResult } from './types.js';

export const TARGET_MARGIN_PCT = 0.2; // 20% margin
export const MIN_ACCEPTABLE_MARGIN_PCT = 0.15; // 15%
export const MAX_ACCEPTABLE_MARGIN_PCT = 0.25; // 25%
export const CLIPPING_MARGIN_THRESHOLD = 0.08; // < 8% is clipped / touching edge

const WHITE_THRESHOLD = 242; // Pixel is non-white if any RGB channel is <= 242

export async function analyzeIconGeometry(
  input: Buffer | string
): Promise<IconGeometryResult> {
  const buffer = typeof input === 'string' ? fs.readFileSync(input) : input;
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 512;
  const height = metadata.height || 512;

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 3 (RGB) or 4 (RGBA)
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = channels === 4 ? data[idx + 3] : 255;

      // Skip fully transparent pixels or pure white pixels
      if (a < 20) continue;
      const isForeground = r <= WHITE_THRESHOLD || g <= WHITE_THRESHOLD || b <= WHITE_THRESHOLD;

      if (isForeground) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Handle completely white or empty images
  if (maxX === -1 || maxY === -1) {
    return {
      width,
      height,
      bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0, objectWidth: 0, objectHeight: 0 },
      margins: { top: 1, bottom: 1, left: 1, right: 1, minMarginPct: 1, avgMarginPct: 1 },
      isClipped: false,
      isTooSmall: true,
      isAcceptable: false,
    };
  }

  const objectWidth = maxX - minX + 1;
  const objectHeight = maxY - minY + 1;

  const left = Number((minX / width).toFixed(4));
  const right = Number(((width - 1 - maxX) / width).toFixed(4));
  const top = Number((minY / height).toFixed(4));
  const bottom = Number(((height - 1 - maxY) / height).toFixed(4));

  const minMarginPct = Math.min(left, right, top, bottom);
  const avgMarginPct = Number(((left + right + top + bottom) / 4).toFixed(4));

  // Determine boundary violations
  const isBorderClipped = minX <= 2 || minY <= 2 || maxX >= width - 3 || maxY >= height - 3;
  const isClipped = isBorderClipped || minMarginPct < CLIPPING_MARGIN_THRESHOLD;
  const isTooSmall = minMarginPct > MAX_ACCEPTABLE_MARGIN_PCT || Math.max(objectWidth, objectHeight) / width < 0.5;
  const isAcceptable = !isClipped && !isTooSmall;

  return {
    width,
    height,
    bbox: { minX, minY, maxX, maxY, objectWidth, objectHeight },
    margins: { top, bottom, left, right, minMarginPct, avgMarginPct },
    isClipped,
    isTooSmall,
    isAcceptable,
  };
}

export async function autoZoomAndPadIcon(
  input: Buffer | string,
  targetMarginPct: number = TARGET_MARGIN_PCT
): Promise<Buffer> {
  const buffer = typeof input === 'string' ? fs.readFileSync(input) : input;
  const geometry = await analyzeIconGeometry(buffer);

  if (geometry.bbox.objectWidth <= 0 || geometry.bbox.objectHeight <= 0) {
    return buffer;
  }

  // Crop exact object bounding box
  const cropped = await sharp(buffer)
    .extract({
      left: geometry.bbox.minX,
      top: geometry.bbox.minY,
      width: geometry.bbox.objectWidth,
      height: geometry.bbox.objectHeight,
    })
    .toBuffer();

  const canvasSize = 512;
  const maxTargetDimension = Math.round(canvasSize * (1 - 2 * targetMarginPct)); // e.g. 512 * 0.6 = 307px

  const resizedObject = await sharp(cropped)
    .resize(maxTargetDimension, maxTargetDimension, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .toBuffer();

  // Center resized object onto solid white 512x512 canvas
  const finalWebp = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resizedObject, gravity: 'center' }])
    .webp({ quality: 90, effort: 6 })
    .toBuffer();

  return finalWebp;
}
