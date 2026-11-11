import type { CheerioRoot } from './types.js';
import * as cheerio from 'cheerio';
import { formatAuthorHandle } from '@cookbook/shared';
import type { ScrapingResult } from '../providers/types.js';
import type { WebsiteExtractor, WebsiteScrapeContext } from './types.js';
import { fetchWebsiteHtml, extractCleanWebsiteText, STANDARD_BROWSER_HEADERS } from './genericWebsiteExtractor.js';
import { isSafeMediaUrl } from '../../routes/videoProxy.js';

const MAX_PIN_IMAGES = 15;

export function isPinterestUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'pin.it' || host.endsWith('.pin.it') || host.includes('pinterest.');
  } catch {
    return false;
  }
}

interface PinterestRelayPin {
  title?: string | null;
  gridTitle?: string | null;
  seoTitle?: string | null;
  description?: string | null;
  seoDescription?: string | null;
  link?: string | null;
  images_orig?: { url?: string | null } | null;
  images_736x?: { url?: string | null } | null;
  imageLargeUrl?: string | null;
  pinner?: {
    username?: string | null;
    fullName?: string | null;
  } | null;
  videos?: {
    videoList?: Array<{ url?: string; width?: number; height?: number; duration?: number }>;
  } | null;
  carouselData?: {
    carousel_slots?: Array<{
      images?: {
        orig?: { url?: string };
        [key: string]: unknown;
      };
      images_orig?: { url?: string };
    }>;
  } | null;
  storyPinData?: {
    pages?: Array<{
      image?: {
        images?: {
          originals?: { url?: string };
          [key: string]: unknown;
        };
      };
      blocks?: Array<{
        image?: {
          images?: {
            originals?: { url?: string };
            [key: string]: unknown;
          };
        };
        video?: {
          videoList?: Array<{ url?: string }>;
        };
      }>;
    }>;
  } | null;
  richMetadata?: {
    title?: string | null;
    description?: string | null;
    recipe?: Record<string, unknown>;
    article?: Record<string, unknown>;
  } | null;
}

/**
 * Extracts pin data from Pinterest Relay completed request script tags.
 */
function extractRelayPinData($: CheerioRoot): PinterestRelayPin | null {
  const scripts = $('script');
  for (let i = 0; i < scripts.length; i++) {
    const text = $(scripts[i]).html() || '';
    if (!text.includes('__PWS_RELAY_REGISTER_COMPLETED_REQUEST__') || !text.includes('v3GetPinQueryv2')) {
      continue;
    }

    try {
      // Matches window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("<query>", {<data>});
      const match = text.match(/window\.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__\("[^"]+",\s*(\{.*\})\);?\s*$/s);
      if (match) {
        const parsed = JSON.parse(match[1]) as {
          data?: {
            v3GetPinQueryv2?: {
              data?: PinterestRelayPin;
            };
          };
        };
        const pinData = parsed.data?.v3GetPinQueryv2?.data;
        if (pinData) return pinData;
      }
    } catch {
      // Continue searching next script if one fails parsing
    }
  }
  return null;
}

interface PinterestJsonLd {
  headline?: string;
  articleBody?: string;
  image?: string;
  author?: {
    name?: string;
    alternateName?: string;
    url?: string;
  };
}

/**
 * Extracts structured SocialMediaPosting / Recipe from Pinterest JSON-LD.
 */
function extractPinterestJsonLd($: CheerioRoot): PinterestJsonLd | null {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    const raw = $(jsonLdScripts[i]).html()?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed['@type'] === 'SocialMediaPosting' || parsed['@type'] === 'Recipe') {
        const authorObj = (parsed.author ?? {}) as Record<string, unknown>;
        return {
          headline: typeof parsed.headline === 'string' ? parsed.headline : undefined,
          articleBody: typeof parsed.articleBody === 'string' ? parsed.articleBody : undefined,
          image: typeof parsed.image === 'string' ? parsed.image : undefined,
          author: {
            name: typeof authorObj.name === 'string' ? authorObj.name : undefined,
            alternateName: typeof authorObj.alternateName === 'string' ? authorObj.alternateName : undefined,
            url: typeof authorObj.url === 'string' ? authorObj.url : undefined,
          },
        };
      }
    } catch {
      // Ignore invalid JSON-LD
    }
  }
  return null;
}

/**
 * Collects all unique slide / infographic image URLs up to MAX_PIN_IMAGES.
 */
function collectPinImages(
  relay: PinterestRelayPin | null,
  jsonLd: PinterestJsonLd | null,
  $: CheerioRoot
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (candidate?: string | null) => {
    if (!candidate || typeof candidate !== 'string') return;
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;
    const imageKey = trimmed.split('/').pop()?.split('?')[0] || trimmed;
    if (!seen.has(imageKey)) {
      seen.add(imageKey);
      urls.push(trimmed);
    }
  };

  // 1. Primary high-res original image from Relay
  add(relay?.images_orig?.url);

  // 2. Carousel slots (if multi-image pin)
  if (Array.isArray(relay?.carouselData?.carousel_slots)) {
    for (const slot of relay.carouselData.carousel_slots) {
      add(slot.images_orig?.url ?? slot.images?.orig?.url);
    }
  }

  // 3. Story Pin pages (Idea pins)
  if (Array.isArray(relay?.storyPinData?.pages)) {
    for (const page of relay.storyPinData.pages) {
      add(page.image?.images?.originals?.url);
      if (Array.isArray(page.blocks)) {
        for (const block of page.blocks) {
          add(block.image?.images?.originals?.url);
        }
      }
    }
  }

  // 4. Large preview fallbacks
  add(relay?.imageLargeUrl);
  add(jsonLd?.image);
  add(relay?.images_736x?.url);
  add($('meta[property="og:image"]').attr('content'));

  return urls.slice(0, MAX_PIN_IMAGES);
}

/**
 * Checks for direct video stream URL in Relay data.
 */
function findPinVideoUrl(relay: PinterestRelayPin | null): string | null {
  if (!relay) return null;

  if (Array.isArray(relay.videos?.videoList)) {
    const mp4Videos = relay.videos.videoList.filter(
      (v) => typeof v.url === 'string' && v.url.includes('.mp4')
    );
    if (mp4Videos.length > 0) {
      // Prefer highest resolution
      const sorted = [...mp4Videos].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
      return sorted[0].url ?? null;
    }
  }

  if (Array.isArray(relay.storyPinData?.pages)) {
    for (const page of relay.storyPinData.pages) {
      if (Array.isArray(page.blocks)) {
        for (const block of page.blocks) {
          const vList = block.video?.videoList;
          if (Array.isArray(vList)) {
            const mp4 = vList.find((v) => typeof v.url === 'string' && v.url.includes('.mp4'));
            if (mp4?.url) return mp4.url;
          }
        }
      }
    }
  }

  return null;
}

export const pinterestExtractor: WebsiteExtractor = {
  name: 'pinterest',

  canHandle(ctx: WebsiteScrapeContext): boolean {
    return isPinterestUrl(ctx.requestedUrl) || isPinterestUrl(ctx.finalUrl);
  },

  async extract(ctx: WebsiteScrapeContext): Promise<ScrapingResult> {
    const { $, finalUrl } = ctx;

    const relay = extractRelayPinData($);
    const jsonLd = extractPinterestJsonLd($);

    // 1. Resolve Title
    const titleCandidates = [
      relay?.title,
      relay?.gridTitle,
      jsonLd?.headline,
      $('meta[property="og:title"]').attr('content'),
      $('h1').first().text(),
      $('title').text(),
    ];
    let title = (titleCandidates.find((c) => typeof c === 'string' && c.trim().length > 0) || '').trim();
    // Clean up generic Pinterest title suffixes
    title = title.replace(/\s*\|\s*Pinterest$/i, '').trim();

    // 2. Resolve Description
    const descriptionCandidates = [
      relay?.description,
      relay?.seoDescription,
      jsonLd?.articleBody,
      relay?.richMetadata?.description,
      $('meta[property="og:description"]').attr('content'),
      $('meta[name="description"]').attr('content'),
    ];
    const description = (descriptionCandidates.find((c) => typeof c === 'string' && c.trim().length > 0) || '').trim();

    // 3. Resolve Author Handle
    const rawHandle =
      relay?.pinner?.username ||
      jsonLd?.author?.alternateName ||
      relay?.pinner?.fullName ||
      jsonLd?.author?.name ||
      '';
    const authorHandle = formatAuthorHandle(rawHandle) || undefined;

    // 4. Resolve Images
    const imageUrls = collectPinImages(relay, jsonLd, $);
    const primaryImageUrl = imageUrls[0] ?? undefined;

    // 5. Check for Video
    const videoUrl = findPinVideoUrl(relay);

    // 6. External linked blog recipe resolution (if pin links to a food blog)
    let externalBlogContent = '';
    const externalLink = relay?.link?.trim();
    if (externalLink && !isPinterestUrl(externalLink)) {
      try {
        const parsed = new URL(externalLink);
        if (isSafeMediaUrl(parsed)) {
          console.log(`[pinterestExtractor] Following linked recipe website: ${parsed.hostname}...`);
          const { html: extHtml } = await fetchWebsiteHtml(externalLink);
          const $ext = cheerio.load(extHtml);
          const extText = extractCleanWebsiteText($ext);
          if (extText.length > 50) {
            externalBlogContent = `\n\nLinked Recipe Blog (${parsed.hostname}):\n${extText.slice(0, 15000)}`;
          }
        }
      } catch (linkErr: unknown) {
        const msg = linkErr instanceof Error ? linkErr.message : String(linkErr);
        console.warn(`[pinterestExtractor] Non-fatal failure reading external link ${externalLink}: ${msg}`);
      }
    }

    const caption = title || description || 'Pinterest Pin';
    const htmlContent = [
      description ? `Pin Description:\n${description}` : '',
      relay?.richMetadata?.recipe ? `Rich Recipe Data:\n${JSON.stringify(relay.richMetadata.recipe, null, 2)}` : '',
      externalBlogContent,
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    // Determine media download kind:
    // If it's a video pin -> client streaming
    // If it has images -> images (OCR & full resolution carousel)
    // Else -> none
    let media: ScrapingResult['media'] = { kind: 'none' };
    if (videoUrl) {
      media = {
        kind: 'client',
        videoUrl,
        headers: STANDARD_BROWSER_HEADERS,
      };
    } else if (imageUrls.length > 0) {
      media = {
        kind: 'images',
        imageUrls,
        headers: STANDARD_BROWSER_HEADERS,
      };
    }

    return {
      caption,
      htmlContent: htmlContent || undefined,
      imageUrl: primaryImageUrl,
      authorHandle,
      media,
    };
  },
};
