/**
 * Canvas-based image downscaling/compression, shared by every client-side
 * shrink-before-upload path (feedback screenshots, the recipe image cache and
 * the photo import). Each caller picks its own profile: a screenshot only has
 * to be recognizable, while a photographed recipe card has to stay OCR-legible.
 */

export interface CompressionProfile {
  /** Longest edge in pixels; larger images are scaled down proportionally. */
  maxEdge: number;
  /** JPEG quality between 0 and 1. */
  quality: number;
}

/** Small preview profile: thumbnails and screenshots (the historical default). */
export const PREVIEW_PROFILE: CompressionProfile = { maxEdge: 800, quality: 0.75 };

/** Photo-import profile. 800px/0.75 is far too lossy to read handwriting from —
 * at 1800px the strokes on a recipe card survive, at roughly 400-800 KB per
 * photo, so five photos stay comfortably inside the route's body budget.
 */
export const RECIPE_PHOTO_PROFILE: CompressionProfile = { maxEdge: 1800, quality: 0.82 };

/** Video keyframe capture profile: 720px / q0.70 for crisp Gemini multimodal extraction and small payloads. */
export const VIDEO_FRAME_PROFILE: CompressionProfile = { maxEdge: 720, quality: 0.70 };

/** Fallback profile applied when a whole photo set is still too large to send. */
export const RECIPE_PHOTO_FALLBACK_PROFILE: CompressionProfile = { maxEdge: 1400, quality: 0.7 };

/**
 * Draws `source` onto a canvas scaled to fit the profile and returns it as a
 * JPEG data URL. Images already smaller than `maxEdge` keep their dimensions.
 */
export function compressImage(source: Blob, profile: CompressionProfile): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }

        const { maxEdge, quality } = profile;
        let width = img.width;
        let height = img.height;

        if (width > maxEdge || height > maxEdge) {
          if (width > height) {
            height = Math.round((height * maxEdge) / width);
            width = maxEdge;
          } else {
            width = Math.round((width * maxEdge) / height);
            height = maxEdge;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses a set of recipe photos for upload. If the combined payload would
 * still be too large, the whole set is re-encoded with the fallback profile —
 * dropping every photo a notch keeps the pages legible relative to each other.
 */
export async function compressRecipePhotos(
  files: File[],
  maxTotalChars: number,
): Promise<string[]> {
  const encode = (profile: CompressionProfile) =>
    Promise.all(files.map(file => compressImage(file, profile)));

  const photos = await encode(RECIPE_PHOTO_PROFILE);
  const totalChars = photos.reduce((sum, photo) => sum + photo.length, 0);
  if (totalChars <= maxTotalChars) return photos;

  return encode(RECIPE_PHOTO_FALLBACK_PROFILE);
}
