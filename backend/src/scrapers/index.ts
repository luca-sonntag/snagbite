import { scrapeSocial } from './social.js';
import { scrapeWebsite } from './website.js';

import type { MediaDownload, ScrapingResult } from './providers/types.js';
export type { MediaDownload, ScrapingResult };

export interface Scraper {
  scrape(url: string, jobId?: string): Promise<ScrapingResult>;
}

export { normalizeDurationToSeconds } from './providers/types.js';

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
