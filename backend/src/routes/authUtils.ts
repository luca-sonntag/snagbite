import type { User } from '@supabase/supabase-js';
import {
  getClient,
  isAlphaActive,
  getPremiumMaxExtractions,
  getAlphaMaxExtractions,
  getFreeMaxExtractions,
  getPremiumMaxConcurrentExtractions,
  getFreeMaxConcurrentExtractions,
} from '../db.js';

export const SUPPORTED_URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
export const MAX_PHOTOS_TOTAL_CHARS = 9_000_000;

export async function fetchAndSyncUser(userId: string): Promise<User> {
  const { data, error } = await getClient().auth.admin.getUserById(userId);
  if (error || !data?.user) {
    throw error || new Error('User not found');
  }

  let user = data.user;
  const currentTier = user.app_metadata?.tier;
  const alphaActive = await isAlphaActive();

  if (alphaActive && currentTier !== 'premium' && currentTier !== 'alpha') {
    try {
      console.log(`Auto-assigning alpha tier to user ${userId} (current: ${currentTier})`);
      const { data: updatedData, error: updateError } = await getClient().auth.admin.updateUserById(userId, {
        app_metadata: { ...user.app_metadata, tier: 'alpha' },
      });
      if (updateError) {
        console.error(`Failed to auto-assign alpha tier to user ${userId}:`, updateError.message);
      } else if (updatedData?.user) {
        user = updatedData.user;
      }
    } catch (err) {
      console.error(`Error auto-assigning alpha tier to user ${userId}:`, err);
    }
  } else if (!alphaActive && currentTier === 'alpha') {
    try {
      console.log(`Auto-reverting user ${userId} from alpha to free tier because alpha is inactive`);
      const { data: updatedData, error: updateError } = await getClient().auth.admin.updateUserById(userId, {
        app_metadata: { ...user.app_metadata, tier: 'free' },
      });
      if (updateError) {
        console.error(`Failed to auto-revert alpha tier for user ${userId}:`, updateError.message);
      } else if (updatedData?.user) {
        user = updatedData.user;
      }
    } catch (err) {
      console.error(`Error auto-reverting alpha tier for user ${userId}:`, err);
    }
  }

  return user;
}

export async function resolveUserRateLimit(
  user: User | { app_metadata?: Record<string, unknown> } | null | undefined
): Promise<number> {
  const meta = (user?.app_metadata || {}) as Record<string, unknown>;

  if (typeof meta.custom_extraction_limit === 'number') {
    return meta.custom_extraction_limit;
  }
  if (typeof meta.max_extractions_per_window === 'number') {
    return meta.max_extractions_per_window;
  }
  if (typeof meta.custom_extraction_limit === 'string') {
    return parseInt(meta.custom_extraction_limit, 10);
  }
  if (typeof meta.max_extractions_per_window === 'string') {
    return parseInt(meta.max_extractions_per_window, 10);
  }

  if (meta.tier === 'premium') {
    return await getPremiumMaxExtractions();
  }
  if (meta.tier === 'alpha') {
    return await getAlphaMaxExtractions();
  }

  return await getFreeMaxExtractions();
}

export function isPremiumUser(
  user: User | { app_metadata?: Record<string, unknown> } | null | undefined
): boolean {
  const meta = (user?.app_metadata || {}) as Record<string, unknown>;
  return (
    meta.tier === 'premium' ||
    meta.tier === 'alpha' ||
    meta.custom_extraction_limit === -1 ||
    meta.max_extractions_per_window === -1
  );
}


export async function resolveConcurrencyLimit(
  user: User | { app_metadata?: Record<string, unknown> } | null | undefined
): Promise<number> {
  const meta = (user?.app_metadata || {}) as Record<string, unknown>;
  const premiumLike =
    meta.tier === 'premium' ||
    meta.tier === 'alpha' ||
    meta.custom_extraction_limit === -1 ||
    meta.max_extractions_per_window === -1;
  return premiumLike
    ? await getPremiumMaxConcurrentExtractions()
    : await getFreeMaxConcurrentExtractions();
}

