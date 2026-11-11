import * as cheerio from 'cheerio';
import type { ScrapingResult } from './index.js';
import { AppError } from '../errors.js';
import { fetchWebsiteHtml, extractFromWebsiteContext } from './websites/index.js';

/**
 * Scrapes a website URL by fetching HTML and running the extensible
 * website extractor registry (specialized domain handlers -> generic fallback).
 */
export async function scrapeWebsite(url: string, jobId?: string): Promise<ScrapingResult> {
  try {
    const { html, finalUrl } = await fetchWebsiteHtml(url);
    const $ = cheerio.load(html);

    let hostname = '';
    try {
      hostname = new URL(finalUrl).hostname.toLowerCase();
    } catch {
      hostname = '';
    }

    return await extractFromWebsiteContext({
      requestedUrl: url,
      finalUrl,
      hostname,
      html,
      $,
      jobId,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new AppError('SCRAPE_FAILED', { message: `Failed to scrape website: ${msg}` });
  }
}
