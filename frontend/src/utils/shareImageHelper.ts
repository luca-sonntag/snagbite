import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native';
import { apiUrl } from '../api';
import { getMemoryCachedImage, getCachedImage } from './imageStore';

export interface PreparedShareImage {
  /** file:// URI for Capacitor native Share on Android / iOS */
  fileUri?: string;
  /** File object for Web Share API in browsers */
  webFile?: File;
}

function sanitizeName(title: string): string {
  return title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_').replace(/_+/g, '_').slice(0, 30) || 'rezept';
}

function normalizeFetchUrl(url: string): string {
  if (url.startsWith('/')) return apiUrl(url);
  const match = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/storage\/.*)/);
  if (match) return apiUrl(match[1]);
  return url;
}

/**
 * Prepares a shareable image file from a recipe's cover image.
 * Uses cached base64 from imageStore when available, or fetches via CapacitorHttp/fetch.
 * On native, writes to Directory.Cache so FileProvider can serve it to WhatsApp etc.
 * On web, creates a standard File object for navigator.share.
 */
export async function prepareShareableImage(
  imageUrl?: string | null,
  recipeTitle: string = 'Rezept'
): Promise<PreparedShareImage | null> {
  if (!imageUrl) return null;

  try {
    // 1. Try memory or IndexedDB cache first
    let base64 = getMemoryCachedImage(imageUrl);
    if (!base64) {
      base64 = await getCachedImage(imageUrl);
    }

    // 2. If not cached, fetch via CapacitorHttp (native) or web fetch
    if (!base64 && !imageUrl.startsWith('local:')) {
      const fetchUrl = normalizeFetchUrl(imageUrl);
      if (isNative()) {
        const resp = await CapacitorHttp.get({
          url: fetchUrl,
          responseType: 'blob',
        });
        if (resp.status >= 200 && resp.status < 300 && resp.data) {
          base64 = resp.data;
        }
      } else {
        const resp = await fetch(fetchUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const cleanName = sanitizeName(recipeTitle);
          const ext = blob.type.includes('png') ? 'png' : 'jpg';
          const webFile = new File([blob], `${cleanName}.${ext}`, {
            type: blob.type || 'image/jpeg',
          });
          return { webFile };
        }
      }
    }

    if (!base64) return null;

    // Detect mime type and extract pure base64 string
    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const rawBase64 = match ? match[2] : base64;
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const cleanName = sanitizeName(recipeTitle);

    if (isNative()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const filename = `recipe_share_cover.${ext}`;
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: rawBase64,
          directory: Directory.Cache,
        });
        return { fileUri: writeResult.uri };
      } catch (nativeErr) {
        console.warn('[shareImageHelper] Filesystem write failed:', nativeErr);
        return null;
      }
    } else {
      const byteChars = atob(rawBase64);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: mimeType });
      const webFile = new File([blob], `${cleanName}.${ext}`, { type: mimeType });
      return { webFile };
    }
  } catch (err) {
    console.warn('[shareImageHelper] Failed to prepare shareable image:', err);
    return null;
  }
}
