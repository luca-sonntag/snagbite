import type * as cheerio from 'cheerio';
import type { ScrapingResult } from '../providers/types.js';

export type CheerioRoot = ReturnType<typeof cheerio.load>;

export interface WebsiteScrapeContext {
  requestedUrl: string;
  finalUrl: string;
  hostname: string;
  html: string;
  $: CheerioRoot;
  jobId?: string;
}

export interface WebsiteExtractor {
  readonly name: string;
  canHandle(ctx: WebsiteScrapeContext): boolean;
  extract(ctx: WebsiteScrapeContext): Promise<ScrapingResult | null>;
}
