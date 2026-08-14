import { config } from '../../config.js';
import type { ScrapingResult } from '../index.js';
import { normalizeDurationToSeconds } from '../index.js';
import { fetchMetadata } from '../youtubeDescription.js';
import type { SocialScrapeContext, SocialScrapeProvider } from './types.js';

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
  owner?: {
    username?: string;
  } | null;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

const MAX_CAROUSEL_IMAGES = 15;

function isType(m: RapidMedia, type: string): boolean {
  return (m.type ?? '').toLowerCase().includes(type);
}

function pickImages(medias: RapidMedia[]): RapidMedia[] {
  return medias.filter((m) => m.url && isType(m, 'image')).slice(0, MAX_CAROUSEL_IMAGES);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let data: RapidResponse;
    try {
      const res = await fetch(`https://${host}/v1/social/autolink`, {
        method: 'POST',
        headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`RapidAPI HTTP ${res.status}`);
      data = (await res.json()) as RapidResponse;
    } finally {
      clearTimeout(timeout);
    }

    if (data.error) throw new Error(`RapidAPI error: ${typeof data.error === 'string' ? data.error : 'unknown'}`);

    const medias = Array.isArray(data.medias) ? data.medias : [];
    // Image-carousel posts (IG/TikTok photo slideshows) contain static image slides
    const hasVideo = medias.some((m) => m.url && (isType(m, 'video') || /\.mp4|mp4/i.test(m.extension ?? '')));
    const carouselImages = hasVideo ? [] : pickImages(medias);

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
        : {
            kind: 'none',
          },
    };
  },
};
