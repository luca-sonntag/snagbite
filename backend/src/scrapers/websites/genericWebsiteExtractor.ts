import * as cheerio from 'cheerio';
import type { CheerioRoot } from './types.js';
import type { ScrapingResult } from '../providers/types.js';
import type { WebsiteExtractor, WebsiteScrapeContext } from './types.js';
import { AppError } from '../../errors.js';

export const STANDARD_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
};

/**
 * Downloads website HTML while following redirects.
 */
export async function fetchWebsiteHtml(
  url: string,
  timeoutMs = 15_000
): Promise<{ html: string; finalUrl: string }> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: STANDARD_BROWSER_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new AppError('SCRAPE_FAILED', {
        message: `HTTP error while fetching website! status: ${response.status}`,
      });
    }

    const html = await response.text();
    return {
      html,
      finalUrl: response.url || url,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError('SCRAPE_FAILED', { message: `Failed to scrape website: ${msg}` });
  }
}

/**
 * Extracts visible body/article text stripped of scripts, styles, and nav clutter.
 */
export function extractCleanWebsiteText($: CheerioRoot): string {
  const $clean = cheerio.load($.html());
  $clean('script, style, noscript, iframe, img, svg, video, audio, nav, footer, header').remove();

  const content = $clean('article').text() || $clean('main').text() || $clean('body').text();
  return content.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts JSON-LD Schema.org/Recipe text if present in the page.
 */
function extractJsonLdRecipeText($: CheerioRoot): string | null {
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    const raw = $(jsonLdScripts[i]).html()?.trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const asObj = parsed as Record<string, unknown>;
        const typeStr = String(asObj['@type'] ?? '').toLowerCase();
        if (typeStr.includes('recipe')) {
          return JSON.stringify(parsed, null, 2);
        }
        if (Array.isArray(asObj['@graph'])) {
          const recipeNode = asObj['@graph'].find(
            (node: unknown) =>
              typeof node === 'object' &&
              node !== null &&
              String((node as Record<string, unknown>)['@type'] ?? '').toLowerCase().includes('recipe')
          );
          if (recipeNode) {
            return JSON.stringify(recipeNode, null, 2);
          }
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks
    }
  }
  return null;
}

export const genericWebsiteExtractor: WebsiteExtractor = {
  name: 'generic-website',

  canHandle(): boolean {
    return true; // Fallback handler for all websites
  },

  async extract(ctx: WebsiteScrapeContext): Promise<ScrapingResult> {
    const { $, finalUrl } = ctx;

    // Extract title (prefer og:title, fallback to <title> or <h1>)
    const rawTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      '';
    const title = rawTitle.replace(/\s+/g, ' ').trim();

    // Extract cover image from OpenGraph / Twitter meta
    const rawImageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      undefined;

    let imageUrl: string | undefined;
    if (rawImageUrl) {
      try {
        const parsed = new URL(rawImageUrl, finalUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          imageUrl = parsed.toString();
        }
      } catch {
        imageUrl = undefined;
      }
    }

    // Extract clean content text and prepend JSON-LD recipe if found
    const recipeJsonLd = extractJsonLdRecipeText($);
    const bodyText = extractCleanWebsiteText($);

    const htmlContent = recipeJsonLd
      ? `JSON-LD Recipe Metadata:\n${recipeJsonLd}\n\nPage Text Content:\n${bodyText}`
      : bodyText;

    let authorHandle: string | undefined;
    try {
      authorHandle = new URL(finalUrl).hostname.replace(/^www\./, '');
    } catch {
      authorHandle = undefined;
    }

    return {
      caption: title,
      htmlContent,
      imageUrl,
      authorHandle,
      media: { kind: 'none' },
    };
  },
};
