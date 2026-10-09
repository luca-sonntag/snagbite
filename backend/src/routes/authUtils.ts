import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import {
  isAlphaActive,
  getPremiumMaxExtractions,
  getAlphaMaxExtractions,
  getFreeMaxExtractions,
  getPremiumMaxConcurrentExtractions,
  getFreeMaxConcurrentExtractions,
} from '../db.js';

export interface AuthUserShape {
  id: string;
  email?: string;
  app_metadata?: {
    tier?: string;
    bonus_credits?: number;
    custom_extraction_limit?: number;
    max_extractions_per_window?: number;
    [key: string]: unknown;
  };
  user_metadata?: Record<string, unknown>;
}

export const SUPPORTED_URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
export const MAX_PHOTOS_TOTAL_CHARS = 9_000_000;

export async function fetchAndSyncUser(userId: string): Promise<AuthUserShape> {
  const [row] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row) {
    throw new Error(`User not found: ${userId}`);
  }

  let currentTier = row.tier || 'free';
  const alphaActive = await isAlphaActive();

  if (alphaActive && currentTier !== 'premium' && currentTier !== 'alpha') {
    currentTier = 'alpha';
    await db
      .update(userTable)
      .set({ tier: 'alpha', updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  } else if (!alphaActive && currentTier === 'alpha') {
    currentTier = 'free';
    await db
      .update(userTable)
      .set({ tier: 'free', updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  }

  return {
    id: row.id,
    email: row.email,
    app_metadata: {
      tier: currentTier,
      bonus_credits: row.bonusCredits ?? 0,
      custom_extraction_limit: row.customExtractionLimit ?? undefined,
    },
    user_metadata: {
      notifications_enabled: row.notificationsEnabled ?? false,
      name: row.name,
      avatar_url: row.image,
    },
  };
}

export async function resolveUserRateLimit(
  user: AuthUserShape | { app_metadata?: Record<string, unknown> } | null | undefined
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
  user: AuthUserShape | { app_metadata?: Record<string, unknown> } | null | undefined
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
  user: AuthUserShape | { app_metadata?: Record<string, unknown> } | null | undefined
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
