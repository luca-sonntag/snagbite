import { scrapeSocial } from './social.js';
import { scrapeWebsite } from './website.js';

/**
 * How a scraped item's media should be fetched to local files (see `download.ts`).
 *
 * The download *strategy* is part of the scrape result, so `queue.ts` never branches
 * on ad-hoc flags — it just calls `downloadMedia(result.media, dir)`:
 *  - `direct` — the URLs are directly fetchable (with optional `headers`); we GET them.
 *  - `images` — an image-carousel post (IG/TikTok photo slideshow); the image URLs are
 *               directly fetchable in carousel order. No audio/video exists.
 *  - `ytdlp`  — the URLs aren't reliably fetchable; re-run yt-dlp against `sourceUrl`.
 *  - `none`   — no media (e.g. websites; text goes via `htmlContent`).
 */
export type MediaDownload =
  | { kind: 'direct'; videoUrl?: string; audioUrl?: string; headers?: Record<string, string> }
  | { kind: 'images'; imageUrls: string[]; headers?: Record<string, string> }
  | { kind: 'client'; videoUrl: string; headers?: Record<string, string> }
  | { kind: 'none' };

export interface ScrapingResult {
  caption: string;
  imageUrl?: string;
  authorHandle?: string;
  htmlContent?: string; // For text-based websites
  /**
   * Video length in **whole seconds** when the provider reports it; used to enforce a
   * length cap before downloading. Providers report `duration` in inconsistent units
   * (some seconds, some milliseconds), so always run the raw value through
   * `normalizeDurationToSeconds()` at the provider boundary — never assign it directly.
   */
  durationSeconds?: number;
  /** Media source + download strategy; `{ kind: 'none' }` for text-only results. */
  media: MediaDownload;
}

export interface Scraper {
  scrape(url: string, jobId?: string): Promise<ScrapingResult>;
}

export { normalizeDurationToSeconds } from './providers/types.js';

export function getScraperForUrl(url: string): Scraper {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  const isSocial = hostname.includes('instagram.com') ||
                   hostname.includes('facebook.com') ||
                   hostname.includes('tiktok.com') ||
                   hostname.includes('youtube.com') ||
                   hostname.includes('youtu.be');

  if (isSocial) {
    return { scrape: scrapeSocial };
  } else {
    return { scrape: scrapeWebsite };
  }
}
