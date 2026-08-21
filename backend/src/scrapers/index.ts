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

/**
 * Normalize a provider-reported `duration` field to whole seconds.
 *
 * Providers are inconsistent: yt-dlp reports seconds, while some RapidAPI/Apify
 * responses report milliseconds. Because we only ingest short-form videos, any value
 * that would mean a >2h clip is treated as milliseconds and scaled down — this cleanly
 * separates the two clusters (short-form seconds ~5–600 vs ms ~5000–600000) without a
 * per-provider unit table. Returns `undefined` for missing/invalid input so the
 * length-cap check simply passes.
 */
export function normalizeDurationToSeconds(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined;
  const TWO_HOURS_SECONDS = 2 * 60 * 60;
  const seconds = raw > TWO_HOURS_SECONDS ? raw / 1000 : raw;
  return Math.round(seconds);
}

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
