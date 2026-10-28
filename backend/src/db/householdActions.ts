import { randomBytes } from 'node:crypto';
import { db } from './drizzle.js';
import { households } from './schema/household.js';
import { user as userTable } from './schema/auth.js';
import { eq, and, sql } from 'drizzle-orm';
import {
  getHouseholdTrialHours,
  getHouseholdSwitchCooldownDays,
} from './settingsDb.js';
import { AppError } from '../errors.js';
import type { HouseholdContext } from './householdTypes.js';
import { getHouseholdContext, invalidateHouseholdCache } from './householdDb.js';

export async function syncHouseholdCookbooks(userAId: string, userBId: string): Promise<void> {
  // Mirror recipes from A to B as 'household' source
  await db.execute(sql`
    INSERT INTO user_recipes (user_id, recipe_id, source)
    SELECT ${userBId}, recipe_id, 'household'
    FROM user_recipes
    WHERE user_id = ${userAId}
    ON CONFLICT (user_id, recipe_id) DO NOTHING;
  `);

  // Mirror recipes from B to A as 'household' source
  await db.execute(sql`
    INSERT INTO user_recipes (user_id, recipe_id, source)
    SELECT ${userAId}, recipe_id, 'household'
    FROM user_recipes
    WHERE user_id = ${userBId}
    ON CONFLICT (user_id, recipe_id) DO NOTHING;
  `);
}

export async function createOrGetHouseholdInvite(userId: string): Promise<{ inviteCode: string }> {
  const ctx = await getHouseholdContext(userId);
  if (ctx.status === 'active' || ctx.status === 'paused') {
    return { inviteCode: ctx.inviteCode! };
  }
  if (ctx.status === 'pending' && ctx.inviteCode) {
    return { inviteCode: ctx.inviteCode };
  }
  if (ctx.cooldownUntil && new Date(ctx.cooldownUntil) > new Date()) {
    throw new AppError('HOUSEHOLD_COOLDOWN', { params: { until: ctx.cooldownUntil } });
  }

  const code = randomBytes(4).toString('hex').toUpperCase();
  const [row] = await db
    .insert(households)
    .values({
      userAId: userId,
      inviteCode: code,
      status: 'pending',
    })
    .returning();

  invalidateHouseholdCache(userId);
  return { inviteCode: row.inviteCode };
}

export async function acceptHouseholdInvite(userId: string, codeOrPartnerId: string): Promise<HouseholdContext> {
  const trimmed = codeOrPartnerId.trim().toUpperCase();
  const myCtx = await getHouseholdContext(userId);
  if (myCtx.status === 'active' || myCtx.status === 'paused') {
    throw new AppError('ALREADY_IN_HOUSEHOLD');
  }
  if (myCtx.cooldownUntil && new Date(myCtx.cooldownUntil) > new Date()) {
    throw new AppError('HOUSEHOLD_COOLDOWN', { params: { until: myCtx.cooldownUntil } });
  }

  const [row] = await db
    .select()
    .from(households)
    .where(
      and(
        eq(households.inviteCode, trimmed),
        eq(households.status, 'pending')
      )
    )
    .limit(1);

  if (!row || row.userAId === userId) {
    throw new AppError('HOUSEHOLD_INVITE_INVALID');
  }

  const [inviterUser, acceptorUser] = await Promise.all([
    db.select({ tier: userTable.tier }).from(userTable).where(eq(userTable.id, row.userAId)).limit(1),
    db.select({ tier: userTable.tier }).from(userTable).where(eq(userTable.id, userId)).limit(1),
  ]);

  const hasPaidPro =
    inviterUser[0]?.tier === 'premium' ||
    inviterUser[0]?.tier === 'alpha' ||
    acceptorUser[0]?.tier === 'premium' ||
    acceptorUser[0]?.tier === 'alpha';

  const trialHours = await getHouseholdTrialHours();
  const trialStartsAt = new Date();
  const trialEndsAt = hasPaidPro ? null : new Date(Date.now() + trialHours * 3600 * 1000);

  await db
    .update(households)
    .set({
      userBId: userId,
      status: 'active',
      trialStartsAt,
      trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(households.id, row.id));

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
  const cooldownUntil = new Date(Date.now() + cooldownDays * 86400 * 1000);

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
