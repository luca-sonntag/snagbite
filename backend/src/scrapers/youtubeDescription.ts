import yt from 'youtube-dl-exec';
import { getYtdlpCookieOptions } from '../config.js';
import { formatAuthorHandle } from '@cookbook/shared';

const youtubedl: any = (yt as any).default || yt;

export interface YtdlpMetadata {
  /** Full post description / caption text, or null when unavailable. */
  description: string | null;
  /** Uploader handle, normalized to start with "@", or null when unavailable. */
  authorHandle: string | null;
}

/**
 * Local yt-dlp "metadata" provider — `--dump-single-json`, no download, no proxy (~2s).
 *
 * It exists to fill the gaps in the RapidAPI primary scraper: RapidAPI returns only the
 * YouTube *title* (never the description) and a stub caption + generic author for
 * Facebook. yt-dlp's metadata JSON has the full `description` (where recipe Shorts/Reels
 * usually put the recipe) and the real `uploader`. YouTube/Facebook metadata resolve fine
 * from any IP, so this is cheap and reliable for enrichment.
 *
 * Best-effort: returns nulls on failure, never throws to the caller.
 */
export async function fetchMetadata(url: string): Promise<YtdlpMetadata> {
  try {
    const meta: any = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      socketTimeout: 20,
      ...getYtdlpCookieOptions(),
    });
    const description = (meta?.description ?? meta?.title ?? '').toString().trim() || null;
    const authorHandle = formatAuthorHandle(meta?.uploader_id ?? meta?.uploader ?? meta?.channel);
    return { description, authorHandle };
  } catch (err: any) {
    console.warn(`[meta] yt-dlp metadata fetch failed for ${url}: ${err?.message ?? err}`);
    return { description: null, authorHandle: null };
  }
}
