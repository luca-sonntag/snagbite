/**
 * How a scraped item's media should be fetched to local files (see `download.ts`).
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
  /** Video length in whole seconds */
  durationSeconds?: number;
  /** Media source + download strategy; `{ kind: 'none' }` for text-only results. */
  media: MediaDownload;
}

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

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

/** Detects the platform from a social URL, or null when unsupported. */
export function detectPlatform(url: string): SocialPlatform | null {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('tiktok.com')) return 'tiktok';
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
  return null;
}

/** Context passed to every provider for a single scrape attempt. */
export interface SocialScrapeContext {
  /** Job id for progress reporting (optional). */
  jobId?: string;
  /** Platform detected from the URL. */
  platform: SocialPlatform;
}

/**
 * A social-media scrape provider.
 *
 * Providers are registered in priority order in `providers/index.ts`; the
 * orchestrator (`scrapeWithProviders`) tries each enabled one top-to-bottom and
 * falls through to the next whenever one throws. To add a provider: implement this
 * interface in a new file under `providers/` and append it to the registry array —
 * no orchestrator changes required.
 */
export interface SocialScrapeProvider {
  /** Short id used in logs (e.g. "rapidapi-all-in-one"). */
  readonly name: string;
  /** True when the provider is configured/usable (e.g. its API key is set). Disabled providers are skipped. */
  isEnabled(): boolean;
  /** Resolve the URL into a normalized {@link ScrapingResult}. Throw to fall through to the next provider. */
  scrape(url: string, ctx: SocialScrapeContext): Promise<ScrapingResult>;
}
