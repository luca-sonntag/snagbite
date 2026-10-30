import { isFcmConfigured, sendToToken, type FcmMessage } from './fcm.js';
import {
  getActivePushTokens,
  disablePushToken,
  insertNotificationLog,
} from '../db/pushNotificationDb.js';
import { getProfilesByIds } from '../db/socialDb.js';
import {
  getHouseholdPushDebounceSeconds,
  getHouseholdPushCooldownMinutes,
} from '../db/settingsDb.js';

interface BatchItem {
  count: number;
  senderName: string;
  firstTitle?: string;
  imageUrl?: string | null;
  recipeId?: string;
  timer: NodeJS.Timeout;
}

const pendingBatches = new Map<string, BatchItem>();
const lastSentAt = new Map<string, number>();
const proposalCooldowns = new Map<string, number>();

async function deliverHouseholdPush(
  recipientUserId: string,
  message: FcmMessage,
  type: string,
  recipeId?: string,
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
      recipeId,
      title: message.title,
    });
  } catch (err) {
    console.warn(`[householdPush] Delivery error for user ${recipientUserId}:`, err);
  }
}

export async function notifyHouseholdLinked(partnerId: string, linkerName: string): Promise<void> {
  const message: FcmMessage = {
    title: '🎉 Haushalt verbunden!',
    body: `Du bist jetzt mit ${linkerName} in einem gemeinsamen Haushalt!`,
    data: { type: 'household_linked', route: 'history' },
  };
  await deliverHouseholdPush(partnerId, message, 'household_linked');
}

export async function notifyPartnerNudge(partnerId: string, nudgerName: string): Promise<void> {
  const message: FcmMessage = {
    title: '👫 Snagbite PRO für euren Haushalt',
    body: `${nudgerName} möchte euer gemeinsames Kochbuch & alle PRO-Features freischalten!`,
    data: { type: 'household_nudge', route: 'premium' },
  };
  await deliverHouseholdPush(partnerId, message, 'household_nudge');
}

export async function notifyCookProposal(
  partnerId: string,
  proposerName: string,
  recipe: { id: string; title: string; imageUrl?: string | null },
): Promise<boolean> {
  const cooldownKey = `${partnerId}:${recipe.id}`;
  const lastTime = proposalCooldowns.get(cooldownKey) || 0;
  if (Date.now() - lastTime < 120_000) {
    return false; // 2 min cooldown per recipe
  }
  proposalCooldowns.set(cooldownKey, Date.now());

  const message: FcmMessage = {
    title: `😋 ${proposerName} hat Lust auf ein Rezept!`,
    body: `Wollen wir heute „${recipe.title}“ kochen?`,
    ...(recipe.imageUrl && /^https?:\/\//i.test(recipe.imageUrl) ? { imageUrl: recipe.imageUrl } : {}),
    data: {
      type: 'cook_proposal',
      recipeId: recipe.id,
      route: 'recipe',
      collapseTag: 'household_propose',
    },
  };

  await deliverHouseholdPush(partnerId, message, 'cook_proposal', recipe.id);
  return true;
}

export function queueHouseholdDebouncedPush(
  recipientId: string,
  senderName: string,
  category: 'recipe_added' | 'meal_planned' | 'shopping_added',
  details: { count?: number; title?: string; imageUrl?: string | null; recipeId?: string } = {},
): void {
  const batchKey = `${recipientId}:${category}`;
  const existing = pendingBatches.get(batchKey);
  const addCount = details.count ?? 1;

  if (existing) {
    clearTimeout(existing.timer);
    existing.count += addCount;
    if (!existing.firstTitle && details.title) existing.firstTitle = details.title;
    if (!existing.imageUrl && details.imageUrl) existing.imageUrl = details.imageUrl;
    if (!existing.recipeId && details.recipeId) existing.recipeId = details.recipeId;
  } else {
    pendingBatches.set(batchKey, {
      count: addCount,
      senderName,
      firstTitle: details.title,
      imageUrl: details.imageUrl,
      recipeId: details.recipeId,
      timer: null as any,
    });
  }

  void (async () => {
    const debounceSec = await getHouseholdPushDebounceSeconds();
    const item = pendingBatches.get(batchKey);
    if (!item) return;

    item.timer = setTimeout(() => {
      void sendBatchedHouseholdPush(recipientId, category);
    }, debounceSec * 1000);
  })();
}

async function sendBatchedHouseholdPush(
  recipientId: string,
  category: 'recipe_added' | 'meal_planned' | 'shopping_added',
): Promise<void> {
  const batchKey = `${recipientId}:${category}`;
  const item = pendingBatches.get(batchKey);
  if (!item) return;
  pendingBatches.delete(batchKey);

  const cooldownMinutes = await getHouseholdPushCooldownMinutes();
  const lastSent = lastSentAt.get(batchKey) || 0;
  if (Date.now() - lastSent < cooldownMinutes * 60_000) {
    return;
  }
  lastSentAt.set(batchKey, Date.now());

  let title = 'Snagbite Haushalt';
  let body = '';
  let collapseTag = 'household_update';

  if (category === 'recipe_added') {
    title = '🍽️ Neues Rezept im Kochbuch';
    collapseTag = 'household_recipe';
    body =
      item.count === 1 && item.firstTitle
        ? `${item.senderName} hat „${item.firstTitle}“ zu eurem Kochbuch hinzugefügt.`
        : `${item.senderName} hat ${item.count} neue Rezepte zu eurem Kochbuch hinzugefügt.`;
  } else if (category === 'meal_planned') {
    title = '📅 Wochenplaner aktualisiert';
    collapseTag = 'household_mealplan';
    body =
      item.count === 1 && item.firstTitle
        ? `${item.senderName} hat „${item.firstTitle}“ für die Woche eingeplant.`
        : `${item.senderName} hat ${item.count} Gerichte für eure Woche eingeplant.`;
  } else if (category === 'shopping_added') {
    title = '🛒 Einkaufsliste ergänzt';
    collapseTag = 'household_shopping';
    body =
      item.count === 1 && item.firstTitle
        ? `${item.senderName} hat „${item.firstTitle}“ auf die Einkaufsliste gesetzt.`
        : `${item.senderName} hat ${item.count} Artikel auf eure Einkaufsliste gesetzt.`;
  }

  const message: FcmMessage = {
    title,
    body,
    ...(item.imageUrl && /^https?:\/\//i.test(item.imageUrl) ? { imageUrl: item.imageUrl } : {}),
    data: {
      type: category,
      collapseTag,
      route: category === 'shopping_added' ? 'shopping' : category === 'meal_planned' ? 'meal-planner' : 'history',
      ...(item.recipeId ? { recipeId: item.recipeId } : {}),
    },
  };

  await deliverHouseholdPush(recipientId, message, category, item.recipeId);
}
