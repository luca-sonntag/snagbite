import { db } from './drizzle.js';
import { households } from './schema/household.js';
import { user as userTable } from './schema/auth.js';
import { eq, or, and, desc } from 'drizzle-orm';
import { getProfilesByIds } from './socialDb.js';
import {
  isHouseholdEnabled,
  getHouseholdPartnerExtractionAds,
} from './settingsDb.js';
import type { HouseholdContext, HouseholdPartnerProfile } from './householdTypes.js';

export * from './householdTypes.js';
export * from './householdActions.js';

const CACHE_TTL_MS = 30_000;
const householdCache = new Map<string, { context: HouseholdContext; cachedAt: number }>();

export function invalidateHouseholdCache(userAId: string, userBId?: string | null): void {
  householdCache.delete(userAId);
  if (userBId) householdCache.delete(userBId);
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
      isPauseLocked: false,
      requiresExtractionAds: false,
      inviteCode: null,
      cooldownUntil: null,
    };
    householdCache.set(userId, { context: empty, cachedAt: Date.now() });
    return empty;
  }

  const [row] = await db
    .select()
    .from(households)
    .where(
      and(
        or(eq(households.userAId, userId), eq(households.userBId, userId)),
        or(eq(households.status, 'active'), eq(households.status, 'pending'))
      )
    )
    .orderBy(desc(households.createdAt))
    .limit(1);

  if (!row) {
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

    const noneContext: HouseholdContext = {
      householdId: null,
      partnerId: null,
      partnerProfile: null,
      status: 'none',
      isTrialActive: false,
      trialEndsAt: null,
      hasHouseholdPro: false,
      isPauseLocked: false,
      requiresExtractionAds: false,
      inviteCode: null,
      cooldownUntil,
    };
    householdCache.set(userId, { context: noneContext, cachedAt: Date.now() });
    return noneContext;
  }

  if (row.status === 'pending') {
    const isInviter = row.userAId === userId;
    const pendingContext: HouseholdContext = {
      householdId: row.id,
      partnerId: null,
      partnerProfile: null,
      status: isInviter ? 'pending' : 'none',
      isTrialActive: false,
      trialEndsAt: null,
      hasHouseholdPro: false,
      isPauseLocked: false,
      requiresExtractionAds: false,
      inviteCode: row.inviteCode,
      cooldownUntil: null,
    };
    householdCache.set(userId, { context: pendingContext, cachedAt: Date.now() });
    return pendingContext;
  }

  const partnerId = row.userAId === userId ? row.userBId! : row.userAId;
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
  const trialEndsDate = row.trialEndsAt ? new Date(row.trialEndsAt) : null;
  const isTrialActive = Boolean(trialEndsDate && trialEndsDate > now);

  const selfTier = selfUser[0]?.tier || 'free';
  const partnerTier = partnerUser[0]?.tier || 'free';
  const isSelfPaidPro = selfTier === 'premium' || selfTier === 'alpha';
  const isPartnerPaidPro = partnerTier === 'premium' || partnerTier === 'alpha';

  const hasHouseholdPro = isSelfPaidPro || isPartnerPaidPro || isTrialActive;
  const isPauseLocked = !hasHouseholdPro;

  const partnerExtractionAdsConfig = await getHouseholdPartnerExtractionAds();
  const requiresExtractionAds = partnerExtractionAdsConfig && !isSelfPaidPro;

  const activeContext: HouseholdContext = {
    householdId: row.id,
    partnerId,
    partnerProfile,
    status: isPauseLocked ? 'paused' : 'active',
    isTrialActive,
    trialEndsAt: trialEndsDate ? trialEndsDate.toISOString() : null,
    hasHouseholdPro,
    isPauseLocked,
    requiresExtractionAds,
    inviteCode: row.inviteCode,
    cooldownUntil: null,
  };

  householdCache.set(userId, { context: activeContext, cachedAt: Date.now() });
  return activeContext;
}

export async function getHouseholdUserIds(userId: string): Promise<string[]> {
  const ctx = await getHouseholdContext(userId);
  if (ctx.partnerId && ctx.hasHouseholdPro && !ctx.isPauseLocked) {
    return [userId, ctx.partnerId];
  }
  return [userId];
}
