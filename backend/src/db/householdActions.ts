import { db } from './drizzle.js';
import { households } from './schema/household.js';
import { eq, and, or, sql } from 'drizzle-orm';
import { AppError } from '../errors.js';
import {
  getHouseholdTrialHours,
  getHouseholdSwitchCooldownDays,
} from './settingsDb.js';
import type { HouseholdContext } from './householdTypes.js';
import { getHouseholdContext, invalidateHouseholdCache } from './householdDb.js';

export async function syncHouseholdCookbooks(userAId: string, userBId: string): Promise<void> {
  // Mirror recipes from A to B as 'household' source
  await db.execute(sql`
    INSERT INTO user_recipes (user_id, recipe_id, source)
    SELECT ${userBId}, recipe_id, 'household'
    FROM user_recipes
    WHERE user_id = ${userAId}
    ON CONFLICT (user_id, recipe_id) DO NOTHING
  `);

  // Mirror recipes from B to A as 'household' source
  await db.execute(sql`
    INSERT INTO user_recipes (user_id, recipe_id, source)
    SELECT ${userAId}, recipe_id, 'household'
    FROM user_recipes
    WHERE user_id = ${userBId}
    ON CONFLICT (user_id, recipe_id) DO NOTHING
  `);
}

export async function createOrGetHouseholdInvite(userId: string): Promise<{ inviteCode: string }> {
  const ctx = await getHouseholdContext(userId);
  if (ctx.householdId && ctx.partnerId) {
    throw new AppError('ALREADY_IN_HOUSEHOLD');
  }
  if (ctx.cooldownUntil) {
    throw new AppError('HOUSEHOLD_COOLDOWN', { params: { until: ctx.cooldownUntil } });
  }

  if (ctx.status === 'pending' && ctx.inviteCode) {
    return { inviteCode: ctx.inviteCode };
  }

  // Generate 8-char uppercase hex code
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const inviteCode = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  await db
    .insert(households)
    .values({
      userAId: userId,
      inviteCode,
      status: 'pending',
    });

  invalidateHouseholdCache(userId);
  return { inviteCode };
}

export async function acceptHouseholdInvite(userId: string, codeOrPartnerId: string): Promise<HouseholdContext> {
  const myCtx = await getHouseholdContext(userId);
  if (myCtx.householdId && myCtx.partnerId) {
    throw new AppError('ALREADY_IN_HOUSEHOLD');
  }
  if (myCtx.cooldownUntil) {
    throw new AppError('HOUSEHOLD_COOLDOWN', { params: { until: myCtx.cooldownUntil } });
  }

  const trimmed = codeOrPartnerId.trim().toUpperCase();

  // Try finding by invite code first, or by userAId if friend ID was passed
  const [row] = await db
    .select()
    .from(households)
    .where(
      and(
        or(eq(households.inviteCode, trimmed), eq(households.userAId, codeOrPartnerId.trim())),
        eq(households.status, 'pending')
      )
    )
    .limit(1);

  if (!row || row.userAId === userId) {
    throw new AppError('HOUSEHOLD_INVITE_INVALID');
  }

  const trialHours = await getHouseholdTrialHours();
  const trialEndsAt = new Date(Date.now() + trialHours * 3600 * 1000);

  // Activate household
  await db
    .update(households)
    .set({
      userBId: userId,
      status: 'active',
      trialStartsAt: new Date(),
      trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(households.id, row.id));

  // Cancel any pending invites created by userB
  await db
    .update(households)
    .set({ status: 'unlinked', unlinkedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(households.userAId, userId), eq(households.status, 'pending')));

  // Mirror cookbooks between userA and userB
  await syncHouseholdCookbooks(row.userAId, userId);

  invalidateHouseholdCache(row.userAId, userId);
  return getHouseholdContext(userId);
}

export async function unlinkHousehold(userId: string): Promise<void> {
  const ctx = await getHouseholdContext(userId);
  if (!ctx.householdId || !ctx.partnerId) {
    throw new AppError('HOUSEHOLD_NOT_FOUND');
  }

  const cooldownDays = await getHouseholdSwitchCooldownDays();
  const cooldownUntil = new Date(Date.now() + cooldownDays * 24 * 3600 * 1000);

  await db
    .update(households)
    .set({
      status: 'unlinked',
      unlinkedAt: new Date(),
      cooldownUntil,
      updatedAt: new Date(),
    })
    .where(eq(households.id, ctx.householdId));

  invalidateHouseholdCache(userId, ctx.partnerId);
}

export async function recordHouseholdNudge(userId: string): Promise<{ partnerId: string }> {
  const ctx = await getHouseholdContext(userId);
  if (!ctx.householdId || !ctx.partnerId) {
    throw new AppError('HOUSEHOLD_NOT_FOUND');
  }

  if (ctx.hasPaidPro) {
    throw new AppError('HOUSEHOLD_ALREADY_PRO');
  }

  const [row] = await db
    .select({ lastNudgedAt: households.lastNudgedAt })
    .from(households)
    .where(eq(households.id, ctx.householdId))
    .limit(1);

  if (row?.lastNudgedAt) {
    const elapsedMs = Date.now() - new Date(row.lastNudgedAt).getTime();
    if (elapsedMs < 24 * 3600 * 1000) {
      throw new AppError('NUDGE_RATE_LIMITED');
    }
  }

  await db
    .update(households)
    .set({ lastNudgedAt: new Date(), updatedAt: new Date() })
    .where(eq(households.id, ctx.householdId));

  return { partnerId: ctx.partnerId };
}
