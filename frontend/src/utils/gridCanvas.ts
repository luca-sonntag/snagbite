/**
 * Utility to composite 16 video keyframes into a single 4x4 tiled JPEG grid.
 * Runs in-browser/app on an off-screen HTML5 Canvas.
 * Drastically reduces upload payload from ~6 MB (16 separate images) to ~200 KB (1 grid image).
 */

export interface GridOptions {
  /** Dimension of the square grid canvas in pixels (default: 1024). */
  size?: number;
  /** JPEG compression quality between 0.0 and 1.0 (default: 0.82). */
  quality?: number;
}

/**
 * Loads an image from a base64 data URL into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load frame image for grid compositing'));
    img.src = src;
  });
}

/**
 * Composites an array of up to 16 keyframe base64 images into a single 4x4 grid image.
 * Returns the base64 JPEG string of the composite grid.
 */
export async function compositeKeyframesToGridCanvas(
  framesBase64: string[],
  options: GridOptions = {}
): Promise<string | null> {
  if (!framesBase64 || framesBase64.length === 0) {
    return null;
  }

  const size = options.size ?? 1024;
  const quality = options.quality ?? 0.82;
  const cols = 4;
  const rows = 4;
  const cellWidth = Math.floor(size / cols);
  const cellHeight = Math.floor(size / rows);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill background with clean dark neutral
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, size, size);

    // Load all frame images concurrently
    const loadedImages = await Promise.all(
      framesBase64.slice(0, 16).map((b64) => loadImage(b64).catch(() => null))
    );

    const validImages = loadedImages.filter((img): img is HTMLImageElement => img !== null);
    if (validImages.length === 0) {
      return null;
    }

    // Draw up to 16 images into the 4x4 matrix
    for (let index = 0; index < 16; index++) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * cellWidth;
      const y = row * cellHeight;

      // Resample if fewer than 16 frames are available
      const imageIndex = Math.min(
        validImages.length - 1,
        Math.floor((index * validImages.length) / 16)
      );
      const img = validImages[imageIndex];

      if (img) {
        // Calculate aspect ratio fill/crop (cover center)
        const imgAspect = img.naturalWidth / (img.naturalHeight || 1);
        const cellAspect = cellWidth / cellHeight;

        let srcX = 0;
        let srcY = 0;
        let srcW = img.naturalWidth;
        let srcH = img.naturalHeight;

        if (imgAspect > cellAspect) {
          srcW = Math.floor(img.naturalHeight * cellAspect);
          srcX = Math.floor((img.naturalWidth - srcW) / 2);
        } else {
          srcH = Math.floor(img.naturalWidth / cellAspect);
          srcY = Math.floor((img.naturalHeight - srcH) / 2);
        }

        ctx.drawImage(img, srcX, srcY, srcW, srcH, x, y, cellWidth, cellHeight);
      }
    }

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[gridCanvas] Grid compositing failed:', msg);
    return null;
  }
}
