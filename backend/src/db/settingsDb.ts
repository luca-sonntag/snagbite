import { config } from '../config.js';
import { db } from './drizzle.js';
import { globalSettings } from './schema/system.js';
import { eq, asc } from 'drizzle-orm';
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
    const [row] = await db
      .select({ value: globalSettings.value })
      .from(globalSettings)
      .where(eq(globalSettings.key, key))
      .limit(1);

    if (row) {
      let val: unknown = row.value;
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
  const rows = await db
    .select()
    .from(globalSettings)
    .orderBy(asc(globalSettings.key));

  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    description: r.description ?? null,
    updated_at: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  }));
}

export async function updateGlobalSettings(settings: Record<string, string>): Promise<void> {
  const entries = Object.entries(settings);
  if (entries.length === 0) return;

  for (const [key, value] of entries) {
    await db
      .insert(globalSettings)
      .values({
        key,
        value: String(value),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: globalSettings.key,
        set: {
          value: String(value),
          updatedAt: new Date(),
        },
      });
  }

  for (const key of Object.keys(settings)) {
    delete settingsCache[key];
  }
}
