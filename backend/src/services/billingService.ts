import { eq } from 'drizzle-orm';
import { emitAlert } from '../alerts/index.js';
import { config } from '../config.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { AppError } from '../errors.js';
import { invalidateHouseholdForUser } from '../db/householdDb.js';

export interface BillingSyncResult {
  tier: string;
  adminBypass?: boolean;
  fallback?: boolean;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null }>;
  };
}

async function checkAdminBypass(userId: string, userEmail?: string | null): Promise<boolean> {
  const adminEmails = config.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return true;
  }

  const [u] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return Boolean(u?.email && adminEmails.includes(u.email.toLowerCase()));
}

async function fetchRevenueCatTier(userId: string, secretKey: string): Promise<string> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('RevenueCat API error:', errorText);
    throw new AppError('REVENUECAT_FAILED', { message: 'Failed to fetch status from RevenueCat.' });
  }

  const rcData = (await response.json()) as RevenueCatSubscriberResponse;
  const premiumEntitlement = rcData.subscriber?.entitlements?.premium;

  let isPremium = false;
  if (premiumEntitlement) {
    const expiresDate = premiumEntitlement.expires_date;
    isPremium = !expiresDate || new Date(expiresDate).getTime() > Date.now();
  }

  return isPremium ? 'premium' : 'free';
}

async function updateUserTier(
  userId: string,
  previousTier: string | null,
  newTier: string,
  source: 'revenuecat' | 'client-fallback',
): Promise<void> {
  if (previousTier !== newTier) {
    emitAlert({
      type: 'subscription.changed',
      payload: { previousTier, newTier, source },
    });
  }

  await db
    .update(userTable)
    .set({ tier: newTier, updatedAt: new Date() })
    .where(eq(userTable.id, userId));

  await invalidateHouseholdForUser(userId);
}

/**
 * Synchronizes a user's subscription tier with RevenueCat, with fallback to
 * client-reported tier if RevenueCat is unconfigured, or admin bypass.
 */
export async function syncUserBilling(
  userId: string,
  userEmail?: string | null,
  clientTier?: unknown,
): Promise<BillingSyncResult> {
  const [currentUser] = await db
    .select({ tier: userTable.tier })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const rawTier = currentUser?.tier || 'free';
  const previousTier = rawTier === 'alpha' ? 'free' : rawTier;

  const isAdmin = await checkAdminBypass(userId, userEmail);
  if (isAdmin) {
    return { tier: previousTier, adminBypass: true };
  }

  const secretKey = config.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    console.warn(
      'REVENUECAT_SECRET_KEY is not configured in backend. Trusting client tier update (fallback mode).'
    );
    if (clientTier === 'premium' || clientTier === 'free') {
      await updateUserTier(userId, previousTier, clientTier, 'client-fallback');
      return { tier: clientTier, fallback: true };
    }
    if (rawTier === 'alpha') {
      await updateUserTier(userId, 'free', 'free', 'client-fallback');
    }
    return { tier: 'free', fallback: true };
  }

  const newTier = await fetchRevenueCatTier(userId, secretKey);

  try {
    await updateUserTier(userId, previousTier, newTier, 'revenuecat');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to update user tier:', msg);
    throw new AppError('PROFILE_UPDATE_FAILED', { message: 'Failed to update user profile.' });
  }

  return { tier: newTier };
}
