import type { ScrapingResult } from '../providers/types.js';
import type { WebsiteExtractor, WebsiteScrapeContext } from './types.js';
import { pinterestExtractor } from './pinterestExtractor.js';
import { genericWebsiteExtractor } from './genericWebsiteExtractor.js';
import { AppError } from '../../errors.js';

export type { WebsiteExtractor, WebsiteScrapeContext } from './types.js';
export { pinterestExtractor, isPinterestUrl } from './pinterestExtractor.js';
export {
  genericWebsiteExtractor,
  fetchWebsiteHtml,
  extractCleanWebsiteText,
} from './genericWebsiteExtractor.js';

/**
 * Ordered list of website extractors (priority: top -> bottom).
 * Specialized domain extractors (e.g. Pinterest) come before the generic fallback.
 */
export const websiteExtractors: WebsiteExtractor[] = [
  pinterestExtractor,
  genericWebsiteExtractor,
];

/**
 * Runs the registered website extractors until one succeeds.
 */
export async function extractFromWebsiteContext(
  ctx: WebsiteScrapeContext
): Promise<ScrapingResult> {
  const matching = websiteExtractors.filter((ext) => ext.canHandle(ctx));

  for (const extractor of matching) {
    try {
      const result = await extractor.extract(ctx);
      if (result) {
        console.log(
          `[website-extractor] Extractor "${extractor.name}" succeeded for ${ctx.finalUrl} (caption ${result.caption.length} chars, media kind: ${result.media.kind})`
        );
        return result;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[website-extractor] Extractor "${extractor.name}" failed for ${ctx.finalUrl}: ${message}`
      );
    }
  }

  throw new AppError('SCRAPE_FAILED', {
    message: `All matching website extractors failed for ${ctx.finalUrl}`,
  });
}
