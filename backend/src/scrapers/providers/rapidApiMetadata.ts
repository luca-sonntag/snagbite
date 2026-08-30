import { config } from '../../config.js';
import { withRetry } from '../../retry.js';
import type { ScrapingResult } from '../index.js';
import { fetchMetadata } from '../youtubeDescription.js';
import { normalizeDurationToSeconds, type SocialScrapeContext, type SocialScrapeProvider } from './types.js';

/**
 * Metadata-only provider using RapidAPI.
 *
 * It hits the exact same endpoint as rapidApiProvider, but strictly returns
 * `media: { kind: 'none' }`. This prevents the worker from downloading the video/audio,
 * drastically reducing copyright and ToS risks while saving bandwidth. Gemini
 * will extract the recipe entirely from the textual caption.
 *
 * If the caption is too short, it throws so the orchestrator can fall back to
 * the legacy video-downloading provider.
 */

interface RapidMedia {
  url?: string;
  type?: string; // "video" | "audio" | "image"
  quality?: string;
  extension?: string;
}

interface RapidResponse {
  url?: string;
  source?: string;
  author?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  medias?: RapidMedia[];
  error?: boolean | string;
  message?: string;
  detail?: string;
  owner?: {
    username?: string;
  } | null;
}

class FatalApiError extends Error {
  isFatal = true;
}

function extractErrorMessage(data: RapidResponse): string {
  if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim();
  return 'unknown';
}

async function fetchRapidApiAutolink(url: string, key: string, host: string): Promise<RapidResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(`https://${host}/v1/social/autolink`, {
      method: 'POST',
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 || res.status === 403) {
    const text = await res.text().catch(() => '');
    throw new FatalApiError(`RapidAPI authentication failed (HTTP ${res.status}): ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const preview = text.slice(0, 100).replace(/\s+/g, ' ').trim();
    throw new Error(`RapidAPI HTTP ${res.status}${preview ? `: ${preview}` : ''}`);
  }

  let data: RapidResponse;
  try {
    data = (await res.json()) as RapidResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`RapidAPI returned invalid JSON: ${message}`);
  }

  if (data.error) {
    const msg = extractErrorMessage(data);
    throw new Error(`RapidAPI error: ${msg}`);
  }

  return data;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

const MAX_CAROUSEL_IMAGES = 15;
const MAX_HEIGHT = 720;

function parseHeight(m: RapidMedia): number | null {
  const s = `${m.quality ?? ''} ${m.extension ?? ''} ${m.url ?? ''}`;
  const wxh = s.match(/(\d{3,4})x(\d{3,4})/);
  if (wxh) return parseInt(wxh[2], 10);
  const p = s.match(/(\d{3,4})\s*p/i);
  if (p) return parseInt(p[1], 10);
  if (/\bhd\b/i.test(s)) return 720;
  if (/\bsd\b/i.test(s)) return 480;
  return null;
}

function isType(m: RapidMedia, type: string): boolean {
  return (m.type ?? '').toLowerCase().includes(type) || (type === 'video' && /\.mp4|mp4/i.test(m.extension ?? ''));
}

function pickImages(medias: RapidMedia[]): RapidMedia[] {
  return medias.filter((m) => m.url && isType(m, 'image')).slice(0, MAX_CAROUSEL_IMAGES);
}

/** Pick the best video ≤ MAX_HEIGHT (else the smallest available), preferring mp4. */
function pickVideo(medias: RapidMedia[]): RapidMedia | null {
  const videos = medias.filter((m) => m.url && isType(m, 'video'));
  if (!videos.length) return null;
  const mp4s = videos.filter((m) => /mp4/i.test(m.extension ?? '') || /mp4/i.test(m.url ?? ''));
  const pool = mp4s.length ? mp4s : videos;

  const annotated = pool.map((m) => ({ m, h: parseHeight(m) }));
  const underCap = annotated.filter((a) => a.h != null && a.h <= MAX_HEIGHT);
  if (underCap.length) return underCap.sort((a, b) => b.h! - a.h!)[0].m;
  const known = annotated.filter((a) => a.h != null);
  if (known.length) return known.sort((a, b) => a.h! - b.h!)[0].m;
  return pool[0];
}

/** RapidAPI often returns a generic/placeholder author (e.g. "youtube", "User"); prefer yt-dlp's when so. */
function isGenericAuthor(handle?: string): boolean {
  if (!handle) return true;
  const s = handle.replace(/^@/, '').toLowerCase();
  return ['', 'youtube', 'facebook', 'instagram', 'tiktok', 'user', 'admin'].includes(s);
}

export const rapidApiMetadataProvider: SocialScrapeProvider = {
  name: 'rapidapi-metadata-only',

  isEnabled() {
    return !!config.RAPIDAPI_KEY;
  },

  async scrape(url: string, ctx: SocialScrapeContext): Promise<ScrapingResult> {
    const key = config.RAPIDAPI_KEY!;
    const host = config.RAPIDAPI_SOCIAL_HOST;

    const data = await withRetry(
      () => fetchRapidApiAutolink(url, key, host),
      {
        maxAttempts: 3,
        baseDelayMs: 1200,
        jitter: true,
        isRetryable: (err) => !(err instanceof FatalApiError),
        onRetry: (attempt, delayMs, err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[rapidapi-metadata] Attempt ${attempt}/3 failed for ${url} (${msg}). Retrying in ${Math.round(delayMs)}ms...`
          );
        },
      }
    );

    const medias = Array.isArray(data.medias) ? data.medias : [];
    // Image-carousel posts (IG/TikTok photo slideshows) contain static image slides
    const hasVideo = medias.some((m) => m.url && (isType(m, 'video') || /\.mp4|mp4/i.test(m.extension ?? '')));
    const carouselImages = hasVideo ? [] : pickImages(medias);
    const video = hasVideo ? pickVideo(medias) : null;

    let caption = (data.title ?? '').toString();
    let authorHandle = (data.owner?.username ?? data.author ?? '').toString();
    if (authorHandle && !authorHandle.startsWith('@')) authorHandle = `@${authorHandle}`;

    // RapidAPI's caption is the full post text for IG/TikTok, but only the *title* for
    // YouTube and a stub ("- Facebook Reel") for Facebook; its author is often generic.
    // Enrich from local yt-dlp metadata (~2s, no proxy) when weak — best-effort.
    if (ctx.platform === 'youtube' || caption.length < 40 || isGenericAuthor(authorHandle)) {
      const meta = await fetchMetadata(url);
      if (meta.description && meta.description.length > caption.length) caption = meta.description;
      if (meta.authorHandle && isGenericAuthor(authorHandle)) authorHandle = meta.authorHandle;
    }

    const headers = { 'User-Agent': BROWSER_UA };

    return {
      caption,
      imageUrl: (data.thumbnail ?? '').toString(),
      authorHandle: authorHandle || undefined,
      durationSeconds: normalizeDurationToSeconds(data.duration),
      media: carouselImages.length > 0
        ? {
            kind: 'images',
            imageUrls: carouselImages.map((m) => m.url!),
            headers,
          }
        : video?.url
        ? {
            kind: 'client',
            videoUrl: video.url,
            headers,
          }
        : {
            kind: 'none',
          },
    };
  },
};
