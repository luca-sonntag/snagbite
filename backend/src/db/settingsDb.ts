import { config } from '../config.js';
import { getClient, wrapError } from './client.js';
import type { GlobalSetting } from './types.js';

export type { GlobalSetting };


const settingsCache: Record<string, { value: unknown; timestamp: number }> = {};

export async function getGlobalSetting<T>(key: string, defaultValue: T): Promise<T> {
  const now = Date.now();
  const cached = settingsCache[key];
  // Cache for 60 seconds
  if (cached && now - cached.timestamp < 60000) {
    return cached.value as T;
  }

  try {
    const { data, error } = await getClient()
      .from('global_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (!error && data) {
      let val: unknown = data.value;
      if (typeof defaultValue === 'boolean') {
        val = val === true || val === 'true';
      } else if (typeof defaultValue === 'number') {
        const parsed = parseInt(String(val), 10);
        val = isNaN(parsed) ? defaultValue : parsed;
      }
      settingsCache[key] = { value: val, timestamp: now };
      return val as T;
    }
  } catch (err) {
    console.warn(`Error reading global setting ${key}, using default:`, err);
  }

  return defaultValue;
}

export async function isAlphaActive(): Promise<boolean> {
  return getGlobalSetting('alpha_active', config.ALPHA_ACTIVE);
}

export async function getAlphaMaxExtractions(): Promise<number> {
  return getGlobalSetting('alpha_max_extractions_per_window', config.ALPHA_MAX_EXTRACTIONS_PER_WINDOW);
}

export async function getAlphaMaxSavedRecipes(): Promise<number> {
  return getGlobalSetting('alpha_max_saved_recipes', config.ALPHA_MAX_SAVED_RECIPES);
}

export async function getFreeMaxExtractions(): Promise<number> {
  return getGlobalSetting('free_max_extractions_per_window', config.FREE_MAX_EXTRACTIONS_PER_WINDOW);
}

export async function getFreeMaxSavedRecipes(): Promise<number> {
  return getGlobalSetting('free_max_saved_recipes', config.FREE_MAX_SAVED_RECIPES);
}

export async function getPremiumMaxExtractions(): Promise<number> {
  return getGlobalSetting('premium_max_extractions_per_window', config.PREMIUM_MAX_EXTRACTIONS_PER_WINDOW);
}

export async function getPremiumMaxSavedRecipes(): Promise<number> {
  return getGlobalSetting('premium_max_saved_recipes', -1);
}

export async function getFreeMaxConcurrentExtractions(): Promise<number> {
  return getGlobalSetting('free_max_concurrent_extractions', config.FREE_MAX_CONCURRENT_EXTRACTIONS);
}

export async function getPremiumMaxConcurrentExtractions(): Promise<number> {
  return getGlobalSetting('premium_max_concurrent_extractions', config.PREMIUM_MAX_CONCURRENT_EXTRACTIONS);
}

export async function getMaxVideoDurationSeconds(): Promise<number> {
  return getGlobalSetting('max_video_duration_seconds', config.MAX_VIDEO_DURATION_SECONDS);
}

export async function getRewardedAdBonusCredits(): Promise<number> {
  return getGlobalSetting('rewarded_ad_bonus_credits', 3);
}

export async function getAllGlobalSettings(): Promise<GlobalSetting[]> {
  const { data, error } = await getClient()
    .from('global_settings')
    .select('*')
    .order('key', { ascending: true });

  if (error) throw wrapError('Failed to fetch global settings', error);
  return data || [];
}

export async function updateGlobalSettings(settings: Record<string, string>): Promise<void> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await getClient()
    .from('global_settings')
    .upsert(rows);

  if (error) throw wrapError('Failed to update global settings', error);

  for (const key of Object.keys(settings)) {
    delete settingsCache[key];
  }
}
