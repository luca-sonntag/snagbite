import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load .env file from project root or backend folder
dotenv.config();
dotenv.config({ path: path.resolve('backend', '.env') });

export interface Config {
  PORT: number;
  /** RapidAPI key for the "Social Download All In One" API (primary social scraper). Optional — falls back to the Apify chain when unset. */
  RAPIDAPI_KEY?: string;
  /** RapidAPI host for the social downloader. */
  RAPIDAPI_SOCIAL_HOST: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY: string;
  GEMINI_MODEL: string;
  GEMINI_TEMPERATURE: number;
  RECIPE_LANGUAGE: string;
  PREFERRED_TEMPERATURE_UNIT: string;
  PREFERRED_UNIT_SYSTEM: string;
  WORKER_CONCURRENCY: number;
  WORKER_LEASE_TIMEOUT_MINUTES: number;
  /** Reject videos longer than this (seconds) before downloading; 0 disables the check. */
  MAX_VIDEO_DURATION_SECONDS: number;
  ROLE: 'web' | 'worker' | 'both';
  MAX_JOBS_PER_USER: number;
  /** Max extractions a free user may run concurrently (in-flight jobs). Free users cannot extract in the background. */
  FREE_MAX_CONCURRENT_EXTRACTIONS: number;
  /** Max extractions a premium/alpha user may run concurrently (in-flight jobs) in the background. */
  PREMIUM_MAX_CONCURRENT_EXTRACTIONS: number;
  EXTRACTION_LIMIT_WINDOW_DAYS: number;
  FREE_MAX_EXTRACTIONS_PER_WINDOW: number;
  PREMIUM_MAX_EXTRACTIONS_PER_WINDOW: number;
  /** Max number of saved recipes (cookbook entries) a free account may keep. Premium is unlimited. */
  FREE_MAX_SAVED_RECIPES: number;
  ALPHA_ACTIVE: boolean;
  ALPHA_MAX_EXTRACTIONS_PER_WINDOW: number;
  ALPHA_MAX_SAVED_RECIPES: number;
  YTDLP_COOKIES_FILE?: string;
  YTDLP_COOKIES_FROM_BROWSER?: string;
  REVENUECAT_SECRET_KEY?: string;
  ADMIN_EMAILS: string;
  HEALTHCHECK_WEBSITE_URL?: string;
  HEALTHCHECK_BACKEND_URL?: string;
  PUBLIC_BACKEND_URL?: string;
  NTFY_TOPIC?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  // ── Smart AI push notifications ──
  /** Master feature flag for the AI push-notification worker. Default off. */
  NOTIFICATIONS_ENABLED: boolean;
  /** Firebase project id that owns the FCM app (for the HTTP v1 endpoint). */
  FCM_PROJECT_ID?: string;
  /** Firebase service-account credentials as a JSON string, or a path to the JSON file. */
  FCM_SERVICE_ACCOUNT_JSON?: string;
  /** How often the notification worker tick runs, in minutes. */
  NOTIFICATION_TICK_MINUTES: number;
  /** Local-time hour (0-23) the daily send window opens. */
  NOTIFICATION_SEND_WINDOW_START: number;
  /** Local-time hour (0-23) the daily send window closes. */
  NOTIFICATION_SEND_WINDOW_END: number;
  /** Hard cap on notifications sent to one user per rolling 7 days (max 1/day is always enforced). */
  NOTIFICATION_MAX_PER_WEEK: number;
  /** IANA timezone used when a user has no notification_timezone set. */
  NOTIFICATION_DEFAULT_TZ: string;
  /** When true, the worker generates + logs but never actually sends to FCM (local testing). */
  NOTIFICATION_DRY_RUN: boolean;
}

// Validation helper
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config: Config = {
  PORT: parseInt(getEnv('PORT', '3000'), 10),
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  RAPIDAPI_SOCIAL_HOST: getEnv('RAPIDAPI_SOCIAL_HOST', 'social-download-all-in-one.p.rapidapi.com'),
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),
  SUPABASE_URL: getEnv('SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: getEnv('SUPABASE_PUBLISHABLE_KEY'),
  SUPABASE_SECRET_KEY: getEnv('SUPABASE_SECRET_KEY'),
  GEMINI_MODEL: getEnv('GEMINI_MODEL', 'gemini-1.5-flash'),
  GEMINI_TEMPERATURE: parseFloat(getEnv('GEMINI_TEMPERATURE', '0')),
  RECIPE_LANGUAGE: getEnv('RECIPE_LANGUAGE', 'German'),
  PREFERRED_TEMPERATURE_UNIT: getEnv('PREFERRED_TEMPERATURE_UNIT', 'Celsius'),
  PREFERRED_UNIT_SYSTEM: getEnv('PREFERRED_UNIT_SYSTEM', 'metric'),
  WORKER_CONCURRENCY: parseInt(getEnv('WORKER_CONCURRENCY', '3'), 10),
  WORKER_LEASE_TIMEOUT_MINUTES: parseInt(getEnv('WORKER_LEASE_TIMEOUT_MINUTES', '10'), 10),
  MAX_VIDEO_DURATION_SECONDS: parseInt(getEnv('MAX_VIDEO_DURATION_SECONDS', '90'), 10),
  ROLE: getEnv('ROLE', 'both') as 'web' | 'worker' | 'both',
  MAX_JOBS_PER_USER: parseInt(getEnv('MAX_JOBS_PER_USER', '3'), 10),
  FREE_MAX_CONCURRENT_EXTRACTIONS: parseInt(getEnv('FREE_MAX_CONCURRENT_EXTRACTIONS', '1'), 10),
  PREMIUM_MAX_CONCURRENT_EXTRACTIONS: parseInt(getEnv('PREMIUM_MAX_CONCURRENT_EXTRACTIONS', '3'), 10),
  EXTRACTION_LIMIT_WINDOW_DAYS: parseInt(getEnv('EXTRACTION_LIMIT_WINDOW_DAYS', '1'), 10),
  FREE_MAX_EXTRACTIONS_PER_WINDOW: parseInt(getEnv('FREE_MAX_EXTRACTIONS_PER_WINDOW', '3'), 10),
  PREMIUM_MAX_EXTRACTIONS_PER_WINDOW: parseInt(getEnv('PREMIUM_MAX_EXTRACTIONS_PER_WINDOW', '50'), 10),
  FREE_MAX_SAVED_RECIPES: parseInt(getEnv('FREE_MAX_SAVED_RECIPES', '5'), 10),
  ALPHA_ACTIVE: getEnv('ALPHA_ACTIVE', 'false') === 'true',
  ALPHA_MAX_EXTRACTIONS_PER_WINDOW: parseInt(getEnv('ALPHA_MAX_EXTRACTIONS_PER_WINDOW', '10'), 10),
  ALPHA_MAX_SAVED_RECIPES: parseInt(getEnv('ALPHA_MAX_SAVED_RECIPES', '20'), 10),
  YTDLP_COOKIES_FILE: process.env.YTDLP_COOKIES_FILE,
  YTDLP_COOKIES_FROM_BROWSER: process.env.YTDLP_COOKIES_FROM_BROWSER,
  REVENUECAT_SECRET_KEY: process.env.REVENUECAT_SECRET_KEY,
  ADMIN_EMAILS: getEnv('ADMIN_EMAILS', ''),
  HEALTHCHECK_WEBSITE_URL: process.env.HEALTHCHECK_WEBSITE_URL,
  HEALTHCHECK_BACKEND_URL: process.env.HEALTHCHECK_BACKEND_URL,
  PUBLIC_BACKEND_URL: process.env.PUBLIC_BACKEND_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined),
  NTFY_TOPIC: process.env.NTFY_TOPIC,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  NOTIFICATIONS_ENABLED: getEnv('NOTIFICATIONS_ENABLED', 'false') === 'true',
  FCM_PROJECT_ID: process.env.FCM_PROJECT_ID,
  FCM_SERVICE_ACCOUNT_JSON: process.env.FCM_SERVICE_ACCOUNT_JSON,
  NOTIFICATION_TICK_MINUTES: parseInt(getEnv('NOTIFICATION_TICK_MINUTES', '15'), 10),
  NOTIFICATION_SEND_WINDOW_START: parseInt(getEnv('NOTIFICATION_SEND_WINDOW_START', '17'), 10),
  NOTIFICATION_SEND_WINDOW_END: parseInt(getEnv('NOTIFICATION_SEND_WINDOW_END', '20'), 10),
  NOTIFICATION_MAX_PER_WEEK: parseInt(getEnv('NOTIFICATION_MAX_PER_WEEK', '3'), 10),
  NOTIFICATION_DEFAULT_TZ: getEnv('NOTIFICATION_DEFAULT_TZ', 'Europe/Vienna'),
  NOTIFICATION_DRY_RUN: getEnv('NOTIFICATION_DRY_RUN', 'false') === 'true',
};

/**
 * Returns options for yt-dlp to handle authentication cookies if configured.
 * Automatically detects a 'cookies.txt' file in the workspace root if it exists
 * and no explicit configuration is provided.
 */
export function getYtdlpCookieOptions(): Record<string, string> {
  const opts: Record<string, string> = {};

  if (config.YTDLP_COOKIES_FILE) {
    opts.cookiefile = path.resolve(config.YTDLP_COOKIES_FILE);
  } else {
    // Default fallback to cookies.txt in root directory
    const defaultCookies = path.resolve('cookies.txt');
    if (existsSync(defaultCookies)) {
      opts.cookiefile = defaultCookies;
    }
  }

  if (config.YTDLP_COOKIES_FROM_BROWSER) {
    opts.cookiesFromBrowser = config.YTDLP_COOKIES_FROM_BROWSER;
  }

  return opts;
}

