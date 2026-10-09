import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

const backendDir = path.resolve(import.meta.dirname, '..');

// 1. Base .env (shared defaults across environments)
dotenv.config({ path: path.resolve(backendDir, '.env') });
dotenv.config();

// 2. Mode-specific environment file (.env.production if NODE_ENV === 'production', else .env.development)
const isProd = process.env.NODE_ENV === 'production';
const modeEnvName = isProd ? '.env.production' : '.env.development';
const modeEnvPath = path.resolve(backendDir, modeEnvName);
if (existsSync(modeEnvPath)) {
  dotenv.config({ path: modeEnvPath, override: true });
}

// 3. Local override (.env.local has highest local precedence, e.g. written by npm run use:prod)
if (existsSync(path.resolve(backendDir, '.env.local'))) {
  dotenv.config({ path: path.resolve(backendDir, '.env.local'), override: true });
} else if (existsSync('.env.local')) {
  dotenv.config({ path: path.resolve('.env.local'), override: true });
}

export interface Config {
  PORT: number;
  /** RapidAPI key for the "Social Download All In One" API (primary social scraper). Optional — falls back to the Apify chain when unset. */
  RAPIDAPI_KEY?: string;
  /** RapidAPI host for the social downloader. */
  RAPIDAPI_SOCIAL_HOST: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  GEMINI_MODEL: string;
  /** Model used by the tool-using ingredient resolver. */
  GEMINI_RERANKER_MODEL: string;
  /** Kill switch for the tool-using resolver. When off, unmatched ingredients keep the LLM estimate. */
  INGREDIENT_RESOLVER_ENABLED: boolean;
  /** Max tool-calling turns the resolver may spend on one ingredient. */
  INGREDIENT_RESOLVER_MAX_TURNS: number;
  /** Resolver calls in flight across the whole process. Guards the provider rate limit. */
  INGREDIENT_RESOLVER_CONCURRENCY: number;
  GEMINI_TEMPERATURE: number;
  RECIPE_LANGUAGE: string;
  PREFERRED_TEMPERATURE_UNIT: string;
  PREFERRED_UNIT_SYSTEM: string;
  WORKER_CONCURRENCY: number;
  WORKER_LEASE_TIMEOUT_MINUTES: number;
  /** Timeout (minutes) before a job stuck in awaiting_frames reverts to pending to run caption-only. */
  CLIENT_FRAMES_TIMEOUT_MINUTES: number;
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
  // ── FLUX.1 AI Cover Generation (fal.ai) ──
  /** Master toggle to generate AI cover images for recipes during extraction/remix. Default true. */
  GENERATE_RECIPE_COVERS: boolean;
  /** fal.ai API key (format: 'Key ...' or raw key). */
  FAL_KEY?: string;
  /** BGBuster API key for background removal on ingredient icons. */
  BGBUSTER_API_KEY?: string;
  // ── S3 / Tigris Object Storage ──
  S3_ENDPOINT?: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_BUCKET_NAME?: string;
  S3_PUBLIC_URL?: string;
  S3_PUBLIC_DOMAIN?: string;
  S3_FORCE_PATH_STYLE: boolean;
  DATABASE_URL?: string;
  APP_URL?: string;
  STORAGE_STREAMING_URL?: string;
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
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  GEMINI_MODEL: getEnv('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
  // Defaults to the same generation as GEMINI_MODEL: a stale default here silently
  // ran ingredient matching on a two-generation-old model whenever the env var was unset.
  GEMINI_RERANKER_MODEL: getEnv('GEMINI_RERANKER_MODEL', 'gemini-3.1-flash-lite'),
  INGREDIENT_RESOLVER_ENABLED: getEnv('INGREDIENT_RESOLVER_ENABLED', 'true') === 'true',
  INGREDIENT_RESOLVER_MAX_TURNS: parseInt(getEnv('INGREDIENT_RESOLVER_MAX_TURNS', '5'), 10),
  INGREDIENT_RESOLVER_CONCURRENCY: parseInt(getEnv('INGREDIENT_RESOLVER_CONCURRENCY', '6'), 10),
  GEMINI_TEMPERATURE: parseFloat(getEnv('GEMINI_TEMPERATURE', '0')),
  RECIPE_LANGUAGE: getEnv('RECIPE_LANGUAGE', 'German'),
  PREFERRED_TEMPERATURE_UNIT: getEnv('PREFERRED_TEMPERATURE_UNIT', 'Celsius'),
  PREFERRED_UNIT_SYSTEM: getEnv('PREFERRED_UNIT_SYSTEM', 'metric'),
  WORKER_CONCURRENCY: parseInt(getEnv('WORKER_CONCURRENCY', '3'), 10),
  WORKER_LEASE_TIMEOUT_MINUTES: parseInt(getEnv('WORKER_LEASE_TIMEOUT_MINUTES', '10'), 10),
  CLIENT_FRAMES_TIMEOUT_MINUTES: parseInt(getEnv('CLIENT_FRAMES_TIMEOUT_MINUTES', '5'), 10),
  MAX_VIDEO_DURATION_SECONDS: parseInt(getEnv('MAX_VIDEO_DURATION_SECONDS', '90'), 10),
  ROLE: getEnv('ROLE', 'both') as 'web' | 'worker' | 'both',
  MAX_JOBS_PER_USER: parseInt(getEnv('MAX_JOBS_PER_USER', '3'), 10),
  FREE_MAX_CONCURRENT_EXTRACTIONS: parseInt(getEnv('FREE_MAX_CONCURRENT_EXTRACTIONS', '1'), 10),
  PREMIUM_MAX_CONCURRENT_EXTRACTIONS: parseInt(getEnv('PREMIUM_MAX_CONCURRENT_EXTRACTIONS', '3'), 10),
  EXTRACTION_LIMIT_WINDOW_DAYS: parseInt(getEnv('EXTRACTION_LIMIT_WINDOW_DAYS', '1'), 10),
  FREE_MAX_EXTRACTIONS_PER_WINDOW: parseInt(getEnv('FREE_MAX_EXTRACTIONS_PER_WINDOW', '3'), 10),
  PREMIUM_MAX_EXTRACTIONS_PER_WINDOW: parseInt(getEnv('PREMIUM_MAX_EXTRACTIONS_PER_WINDOW', '30'), 10),
  FREE_MAX_SAVED_RECIPES: parseInt(getEnv('FREE_MAX_SAVED_RECIPES', '10'), 10),
  ALPHA_ACTIVE: getEnv('ALPHA_ACTIVE', 'false') === 'true',
  ALPHA_MAX_EXTRACTIONS_PER_WINDOW: parseInt(getEnv('ALPHA_MAX_EXTRACTIONS_PER_WINDOW', '10'), 10),
  ALPHA_MAX_SAVED_RECIPES: parseInt(getEnv('ALPHA_MAX_SAVED_RECIPES', '20'), 10),
  YTDLP_COOKIES_FILE: process.env.YTDLP_COOKIES_FILE,
  YTDLP_COOKIES_FROM_BROWSER: process.env.YTDLP_COOKIES_FROM_BROWSER,
  REVENUECAT_SECRET_KEY: process.env.REVENUECAT_SECRET_KEY,
  ADMIN_EMAILS: getEnv('ADMIN_EMAILS', ''),
  HEALTHCHECK_WEBSITE_URL: process.env.HEALTHCHECK_WEBSITE_URL,
  HEALTHCHECK_BACKEND_URL: process.env.HEALTHCHECK_BACKEND_URL,
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
  GENERATE_RECIPE_COVERS: getEnv('GENERATE_RECIPE_COVERS', 'true') === 'true',
  FAL_KEY: process.env.FAL_KEY || process.env.FLUX_API_KEY,
  BGBUSTER_API_KEY: process.env.BGBUSTER_API_KEY,
  S3_ENDPOINT: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
  S3_REGION: getEnv('S3_REGION', 'auto'),
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || process.env.BUCKET_NAME,
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
  S3_PUBLIC_DOMAIN: process.env.S3_PUBLIC_DOMAIN,
  S3_FORCE_PATH_STYLE: getEnv('S3_FORCE_PATH_STYLE', 'true') === 'true',
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  STORAGE_STREAMING_URL: process.env.STORAGE_STREAMING_URL,
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

