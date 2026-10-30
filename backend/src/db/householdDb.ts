import { db } from './drizzle.js';
import { households } from './schema/household.js';
import { user as userTable } from './schema/auth.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { getProfilesByIds } from './socialDb.js';
import {
  isHouseholdEnabled,
  getHouseholdPartnerExtractionAds,
} from './settingsDb.js';
import { checkAndNotifySingleHouseholdTrialExpired } from '../push/householdTrialNotifications.js';
import type { HouseholdContext, HouseholdPartnerProfile } from './householdTypes.js';

export * from './householdTypes.js';
export * from './householdActions.js';

const CACHE_TTL_MS = 30_000;
const householdCache = new Map<string, { context: HouseholdContext; cachedAt: number }>();

export function invalidateHouseholdCache(userAId: string, userBId?: string | null): void {
  householdCache.delete(userAId);
  if (userBId) householdCache.delete(userBId);
}

export async function invalidateHouseholdForUser(userId: string): Promise<void> {
  const cached = householdCache.get(userId);
  householdCache.delete(userId);
  if (cached?.context.partnerId) {
    householdCache.delete(cached.context.partnerId);
  }

  try {
    const [row] = await db
      .select({ userAId: households.userAId, userBId: households.userBId })
      .from(households)
      .where(
        and(
          or(eq(households.userAId, userId), eq(households.userBId, userId)),
          eq(households.status, 'active')
        )
      )
      .limit(1);

    if (row) {
      householdCache.delete(row.userAId);
      if (row.userBId) householdCache.delete(row.userBId);
    }
  } catch (err) {
    console.warn('[householdDb] Error invalidating household for user:', err);
  }
}

export async function getHouseholdContext(userId: string): Promise<HouseholdContext> {
  const cached = householdCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.context;
  }

  const enabled = await isHouseholdEnabled();
  if (!enabled) {
    const empty: HouseholdContext = {
      householdId: null,
      partnerId: null,
      partnerProfile: null,
      status: 'none',
      isTrialActive: false,
      trialEndsAt: null,
      hasHouseholdPro: false,
      hasPaidPro: false,
      isPauseLocked: false,
      requiresExtractionAds: false,
      inviteCode: null,
      cooldownUntil: null,
    };
    householdCache.set(userId, { context: empty, cachedAt: Date.now() });
    return empty;
  }

  // 1. Check for an active household first
  const [activeRow] = await db
    .select()
    .from(households)
    .where(
      and(
        or(eq(households.userAId, userId), eq(households.userBId, userId)),
        eq(households.status, 'active')
      )
    )
    .orderBy(desc(households.createdAt))
    .limit(1);

  if (activeRow) {
    const partnerId = activeRow.userAId === userId ? activeRow.userBId! : activeRow.userAId;
    const [partnerProfiles, partnerUser, selfUser] = await Promise.all([
      getProfilesByIds([partnerId]),
      db.select({ tier: userTable.tier }).from(userTable).where(eq(userTable.id, partnerId)).limit(1),
      db.select({ tier: userTable.tier }).from(userTable).where(eq(userTable.id, userId)).limit(1),
    ]);

    const pProfile = partnerProfiles.get(partnerId);
    const partnerProfile: HouseholdPartnerProfile = {
      userId: partnerId,
      displayName: pProfile?.displayName || 'Partner',
      avatarUrl: pProfile?.avatarUrl || null,
    };

    const now = new Date();
    const trialEndsDate = activeRow.trialEndsAt ? new Date(activeRow.trialEndsAt) : null;
    const isTrialActive = Boolean(trialEndsDate && trialEndsDate > now);

    const selfTier = selfUser[0]?.tier || 'free';
    const partnerTier = partnerUser[0]?.tier || 'free';
    const isSelfPaidPro = selfTier === 'premium';
    const isPartnerPaidPro = partnerTier === 'premium';

    const hasPaidPro = isSelfPaidPro || isPartnerPaidPro;
    const hasHouseholdPro = hasPaidPro || isTrialActive;
    const isPauseLocked = !hasHouseholdPro;

    if (isPauseLocked && trialEndsDate && trialEndsDate <= now && activeRow.userBId) {
      void checkAndNotifySingleHouseholdTrialExpired(activeRow.userAId, activeRow.userBId);
    }

    const partnerExtractionAdsConfig = await getHouseholdPartnerExtractionAds();
    const requiresExtractionAds = partnerExtractionAdsConfig && !isSelfPaidPro;

    const activeContext: HouseholdContext = {
      householdId: activeRow.id,
      partnerId,
      partnerProfile,
      status: isPauseLocked ? 'paused' : 'active',
      isTrialActive,
      trialEndsAt: trialEndsDate ? trialEndsDate.toISOString() : null,
      hasHouseholdPro,
      hasPaidPro,
      isPauseLocked,
      requiresExtractionAds,
      inviteCode: activeRow.inviteCode,
      cooldownUntil: null,
    };

    householdCache.set(userId, { context: activeContext, cachedAt: Date.now() });
    return activeContext;
  }

  // 2. Check if the user is in an active cooldown from a recently unlinked household
  const [unlinked] = await db
    .select({ cooldownUntil: households.cooldownUntil })
    .from(households)
    .where(
      and(
        or(eq(households.userAId, userId), eq(households.userBId, userId)),
        eq(households.status, 'unlinked')
      )
    )
    .orderBy(desc(households.unlinkedAt))
    .limit(1);

  const now = new Date();
  const cooldownDate = unlinked?.cooldownUntil ? new Date(unlinked.cooldownUntil) : null;
  const cooldownUntil = cooldownDate && cooldownDate > now ? cooldownDate.toISOString() : null;

  if (cooldownUntil) {
    const cooldownContext: HouseholdContext = {
      householdId: null,
      partnerId: null,
      partnerProfile: null,
      status: 'none',
      isTrialActive: false,
      trialEndsAt: null,
      hasHouseholdPro: false,
      hasPaidPro: false,
      isPauseLocked: false,
      requiresExtractionAds: false,
      inviteCode: null,
      cooldownUntil,
    };
    householdCache.set(userId, { context: cooldownContext, cachedAt: Date.now() });
    return cooldownContext;
  }

  // 3. Check for a pending invite created by this user (only valid if not in cooldown)
  const [pendingRow] = await db
    .select()
    .from(households)
    .where(
      and(
        eq(households.userAId, userId),
        eq(households.status, 'pending')
      )
    )
    .orderBy(desc(households.createdAt))
    .limit(1);

  if (pendingRow) {
    const pendingContext: HouseholdContext = {
      householdId: pendingRow.id,
      partnerId: null,
      partnerProfile: null,
      status: 'pending',
      isTrialActive: false,
      trialEndsAt: null,
      hasHouseholdPro: false,
      hasPaidPro: false,
      isPauseLocked: false,
      requiresExtractionAds: false,
      inviteCode: pendingRow.inviteCode,
      cooldownUntil: null,
    };
    householdCache.set(userId, { context: pendingContext, cachedAt: Date.now() });
    return pendingContext;
  }

  // 4. Default clean none state
  const noneContext: HouseholdContext = {
    householdId: null,
    partnerId: null,
    partnerProfile: null,
    status: 'none',
    isTrialActive: false,
    trialEndsAt: null,
    hasHouseholdPro: false,
    hasPaidPro: false,
    isPauseLocked: false,
    requiresExtractionAds: false,
    inviteCode: null,
    cooldownUntil: null,
  };
  householdCache.set(userId, { context: noneContext, cachedAt: Date.now() });
  return noneContext;
}

export async function getHouseholdUserIds(userId: string): Promise<string[]> {
  const ctx = await getHouseholdContext(userId);
  if (ctx.partnerId && ctx.hasHouseholdPro && !ctx.isPauseLocked) {
    return [userId, ctx.partnerId];
  }
  return [userId];
}
