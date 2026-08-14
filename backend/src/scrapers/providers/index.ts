import type { ScrapingResult } from '../index.js';
import { AppError } from '../../errors.js';
import { rapidApiMetadataProvider } from './rapidApiMetadata.js';
import { rapidApiProvider } from './rapidApi.js';
import type { SocialScrapeContext, SocialScrapeProvider } from './types.js';

export type { SocialScrapeProvider, SocialScrapeContext, SocialPlatform } from './types.js';
export { detectPlatform } from './types.js';

/**
 * Ordered registry of social scrape providers (priority: top → bottom).
 *
 * The orchestrator (`scrapeWithProviders`) tries each *enabled* provider in turn and
 * falls through to the next whenever one throws. Add a provider by implementing
 * {@link SocialScrapeProvider} under `providers/` and inserting it here — order is
 * priority, and `isEnabled()` gates it on configuration.
 *
 * Order rationale:
 *  1. rapidApiMetadata — Metadata only, no video downloads, extremely legally safe.
 *  2. rapidApi         — Fallback: direct CDN URLs + video download if metadata was insufficient.
 */
export const socialProviders: SocialScrapeProvider[] = [
  rapidApiMetadataProvider,
  rapidApiProvider,
];

/**
 * Runs the registered providers in order until one succeeds. Throws only when every
 * enabled provider has failed, aggregating the individual reasons.
 */
export async function scrapeWithProviders(
  url: string,
  ctx: SocialScrapeContext,
): Promise<ScrapingResult> {
  const enabled = socialProviders.filter((p) => p.isEnabled());
  if (enabled.length === 0) {
    throw new AppError('SCRAPE_FAILED', { message: 'No social scrape providers are enabled.' });
  }

  const failures: string[] = [];
  for (const provider of enabled) {
    try {
      const result = await provider.scrape(url, ctx);
      console.log(`[social] provider "${provider.name}" succeeded for ${url} (caption ${result.caption.length} chars)`);
      return result;
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.warn(`[social] provider "${provider.name}" failed for ${url}: ${message}`);
      failures.push(`${provider.name}: ${message}`);
    }
  }

  // Every provider failed. The user sees a single friendly "couldn't load"
  // message (SCRAPE_FAILED); the aggregated provider reasons are kept only for
  // logs and admin/DB debugging (params._detail, ignored by the client).
  const detail = `All ${enabled.length} social provider(s) failed for ${url}. ${failures.join(' | ')}`;
  throw new AppError('SCRAPE_FAILED', { message: detail, params: { _detail: detail } });
}
