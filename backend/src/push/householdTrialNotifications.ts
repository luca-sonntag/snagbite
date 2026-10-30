import { isFcmConfigured, sendToToken, type FcmMessage } from './fcm.js';
import {
  getActivePushTokens,
  disablePushToken,
  insertNotificationLog,
  hasRecentNotificationType,
} from '../db/pushNotificationDb.js';
import { db } from '../db/drizzle.js';
import { households } from '../db/schema/household.js';
import { user as userTable } from '../db/schema/auth.js';
import { getProfilesByIds } from '../db/socialDb.js';
import { and, eq, isNotNull, inArray, or } from 'drizzle-orm';

async function deliverTrialPush(
  recipientUserId: string,
  message: FcmMessage,
  type: string
): Promise<void> {
  if (!isFcmConfigured()) return;
  try {
    const tokens = await getActivePushTokens(recipientUserId);
    if (tokens.length === 0) return;

    for (const token of tokens) {
      const res = await sendToToken(token, message);
      if (res.unregistered) {
        await disablePushToken(token).catch(() => {});
      }
    }

    await insertNotificationLog({
      userId: recipientUserId,
      category: 'household',
      type,
      title: message.title,
    });
  } catch (err) {
    console.warn(`[householdPush] Delivery error for user ${recipientUserId}:`, err);
  }
}

export async function notifyHouseholdTrialEnding(
  recipientId: string,
  partnerName: string,
  daysLeft = 1
): Promise<void> {
  const message: FcmMessage = {
    title: '⏳ Haushalts-Testphase endet bald',
    body: `Eure gemeinsame Testphase mit ${partnerName} endet in ${daysLeft === 1 ? '1 Tag' : `${daysLeft} Tagen`}. Sichere dir Snagbite PRO für unterbrechungsfreies Kochen!`,
    data: { type: 'household_trial_ending', route: 'premium' },
  };
  await deliverTrialPush(recipientId, message, 'household_trial_ending');
}

export async function notifyHouseholdTrialExpired(
  recipientId: string,
  partnerName: string
): Promise<void> {
  const message: FcmMessage = {
    title: '⏸️ Haushalts-Testphase beendet',
    body: `Die Testphase für euren gemeinsamen Haushalt mit ${partnerName} ist abgelaufen. Aktiviere Snagbite PRO, um weiter synchron zu bleiben!`,
    data: { type: 'household_trial_expired', route: 'premium' },
  };
  await deliverTrialPush(recipientId, message, 'household_trial_expired');
}

export async function checkAndNotifyHouseholdTrialStatus(): Promise<{ expiredSent: number; endingSent: number }> {
  let expiredSent = 0;
  let endingSent = 0;

  try {
    const now = new Date();
    const activeHouseholds = await db
      .select({
        id: households.id,
        userAId: households.userAId,
        userBId: households.userBId,
        trialEndsAt: households.trialEndsAt,
      })
      .from(households)
      .where(
        and(
          eq(households.status, 'active'),
          isNotNull(households.userBId),
          isNotNull(households.trialEndsAt)
        )
      );

    if (activeHouseholds.length === 0) {
      return { expiredSent: 0, endingSent: 0 };
    }

    const allUserIds = new Set<string>();
    for (const h of activeHouseholds) {
      allUserIds.add(h.userAId);
      if (h.userBId) allUserIds.add(h.userBId);
    }

    const profiles = await getProfilesByIds([...allUserIds]);
    const userTiers = await db
      .select({ id: userTable.id, tier: userTable.tier })
      .from(userTable)
      .where(inArray(userTable.id, [...allUserIds]));

    const tierMap = new Map(userTiers.map((u) => [u.id, u.tier || 'free']));

    for (const h of activeHouseholds) {
      if (!h.userBId || !h.trialEndsAt) continue;

      const userATier = tierMap.get(h.userAId) || 'free';
      const userBTier = tierMap.get(h.userBId) || 'free';
      const hasPaidPro = userATier === 'premium' || userBTier === 'premium';
      if (hasPaidPro) continue;

      const trialEnds = new Date(h.trialEndsAt);
      const isExpired = trialEnds <= now;
      const isEndingSoon = !isExpired && trialEnds.getTime() - now.getTime() <= 24 * 3600 * 1000;

      const nameA = profiles.get(h.userAId)?.displayName || 'Partner';
      const nameB = profiles.get(h.userBId)?.displayName || 'Partner';

      if (isExpired) {
        const aSent = await hasRecentNotificationType(h.userAId, 'household_trial_expired', 60);
        if (!aSent) {
          await notifyHouseholdTrialExpired(h.userAId, nameB);
          expiredSent++;
        }
        const bSent = await hasRecentNotificationType(h.userBId, 'household_trial_expired', 60);
        if (!bSent) {
          await notifyHouseholdTrialExpired(h.userBId, nameA);
          expiredSent++;
        }
      } else if (isEndingSoon) {
        const aSent = await hasRecentNotificationType(h.userAId, 'household_trial_ending', 7);
        if (!aSent) {
          await notifyHouseholdTrialEnding(h.userAId, nameB, 1);
          endingSent++;
        }
        const bSent = await hasRecentNotificationType(h.userBId, 'household_trial_ending', 7);
        if (!bSent) {
          await notifyHouseholdTrialEnding(h.userBId, nameA, 1);
          endingSent++;
        }
      }
    }
  } catch (err) {
    console.error('[householdPush] Error checking trial status:', err);
  }

  return { expiredSent, endingSent };
}

export async function checkAndNotifySingleHouseholdTrialExpired(
  userAId: string,
  userBId: string
): Promise<void> {
  try {
    const [profiles, userTiers] = await Promise.all([
      getProfilesByIds([userAId, userBId]),
      db
        .select({ id: userTable.id, tier: userTable.tier })
        .from(userTable)
        .where(or(eq(userTable.id, userAId), eq(userTable.id, userBId))),
    ]);

    const tierMap = new Map(userTiers.map((u) => [u.id, u.tier || 'free']));
    if (tierMap.get(userAId) === 'premium' || tierMap.get(userBId) === 'premium') {
      return;
    }

    const nameA = profiles.get(userAId)?.displayName || 'Partner';
    const nameB = profiles.get(userBId)?.displayName || 'Partner';

    const aSent = await hasRecentNotificationType(userAId, 'household_trial_expired', 60);
    if (!aSent) {
      await notifyHouseholdTrialExpired(userAId, nameB);
    }

    const bSent = await hasRecentNotificationType(userBId, 'household_trial_expired', 60);
    if (!bSent) {
      await notifyHouseholdTrialExpired(userBId, nameA);
    }
  } catch (err) {
    console.warn('[householdPush] Single trial expired check failed:', err);
  }
}
