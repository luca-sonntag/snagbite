import { Share } from '@capacitor/share';
import { stripInlineIngredientTags } from './ingredientMatch';
import {
  hasRecipeComponents,
  groupIngredientsByComponent,
  groupInstructionsByComponent,
} from './recipeComponents';
import { prepareShareableImage } from './shareImageHelper';
import { getInviteUrl, getInviteBaseUrl } from './invite';
import type { Recipe, Ingredient } from '../types';

export interface BuildShareTextOptions {
  recipe: Recipe;
  reelUrl?: string;
  friendCode?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function formatIng(ing: Ingredient): string {
  const amountStr = ing.amount ? `${ing.amount} ` : '';
  const unitStr = ing.unit ? `${ing.unit} ` : '';
  const modStr = ing.modifier ? ` (${ing.modifier})` : '';
  const noteStr = ing.notes ? ` (${ing.notes})` : '';
  return `${amountStr}${unitStr}${ing.name}${modStr}${noteStr}`;
}

export function buildRecipeShareText({
  recipe,
  reelUrl,
  friendCode,
  t,
}: BuildShareTextOptions): string {
  const parts: string[] = [];

  // 1. Title + Emoji
  const emoji = recipe.emoji || '🍽️';
  parts.push(`${emoji} ${recipe.title}`);

  // 2. Meta (Time + Servings)
  const metaItems: string[] = [];
  const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  if (totalMin > 0) metaItems.push(`⏱️ ${totalMin} Min.`);
  if (recipe.servings) {
    metaItems.push(`👥 ${recipe.servings} ${t('recipe.serves') || 'Portionen'}`);
  }
  if (metaItems.length > 0) {
    parts.push(metaItems.join(' · '));
  }

  // 3. Description
  if (recipe.description) {
    parts.push(stripInlineIngredientTags(recipe.description));
  }

  // 4. Ingredients
  const isMultiComponent = hasRecipeComponents(recipe);
  let ingText = `🛒 ${t('recipe.tabIngredients') || 'Zutaten'}:`;
  if (isMultiComponent) {
    const groups = groupIngredientsByComponent(recipe.ingredients || []);
    groups.forEach((g) => {
      if (g.sectionName) ingText += `\n\n${g.sectionName}:`;
      g.items.forEach((item) => {
        ingText += `\n• ${formatIng(item)}`;
      });
    });
  } else {
    (recipe.ingredients || []).forEach((item) => {
      ingText += `\n• ${formatIng(item)}`;
    });
  }
  parts.push(ingText);

  // 5. Steps / Instructions
  let stepsText = `👩‍🍳 ${t('recipe.tabInstructions') || 'Zubereitung'}:`;
  if (isMultiComponent) {
    const groups = groupInstructionsByComponent(recipe.instructions || []);
    groups.forEach((g) => {
      if (g.sectionName) stepsText += `\n\n${g.sectionName}:`;
      g.steps.forEach((s) => {
        stepsText += `\n${s.step}. ${stripInlineIngredientTags(s.description)}`;
      });
    });
  } else {
    (recipe.instructions || []).forEach((s) => {
      stepsText += `\n${s.step}. ${stripInlineIngredientTags(s.description)}`;
    });
  }
  parts.push(stepsText);

  // 6. Original Video URL
  const videoUrl = reelUrl || recipe.sourceUrl;
  if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
    parts.push(`📹 ${t('app.social.share.originalVideo') || 'Original-Video'}:\n${videoUrl}`);
  }

  // 7. Snagbite App Promo & Personal Invite Link
  const inviteUrl = friendCode ? getInviteUrl(friendCode) : getInviteBaseUrl();
  parts.push(
    `✨ ${t('app.social.share.promoTagline') || 'Automatisch strukturiert mit Snagbite – der KI-Rezept-App für Instagram & TikTok Reels'}:\n👉 ${inviteUrl}`
  );

  return parts.join('\n\n');
}

export async function shareRecipeExternally(params: BuildShareTextOptions): Promise<'shared' | 'copied' | 'dismissed'> {
  const text = buildRecipeShareText(params);
  const title = params.recipe.title;
  const imageUrl = params.recipe.imageUrl || params.recipe.imageUrls?.[0];

  const preparedImage = await prepareShareableImage(imageUrl, title);

  // 1. Try Capacitor native share first
  try {
    const can = await Share.canShare();
    if (can.value) {
      const shareOptions: any = {
        title,
        text,
        dialogTitle: title,
      };

      if (preparedImage?.fileUri) {
        shareOptions.files = [preparedImage.fileUri];
      }

      await Share.share(shareOptions);
      return 'shared';
    }
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('canceled') || msg.includes('dismissed') || msg.includes('cancel')) {
      return 'dismissed';
    }
    // Fallback: If sharing with files failed, try text-only native share
    if (preparedImage?.fileUri) {
      try {
        await Share.share({ title, text, dialogTitle: title });
        return 'shared';
      } catch (fallbackErr: any) {
        const fallbackMsg = (fallbackErr?.message || '').toLowerCase();
        if (fallbackMsg.includes('canceled') || fallbackMsg.includes('dismissed') || fallbackMsg.includes('cancel')) {
          return 'dismissed';
        }
      }
    }
  }

  // 2. Web Share API fallback
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (preparedImage?.webFile && navigator.canShare && navigator.canShare({ files: [preparedImage.webFile] })) {
        await navigator.share({
          title,
          text,
          files: [preparedImage.webFile],
        });
        return 'shared';
      }

      await navigator.share({
        title,
        text,
      });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'dismissed';
    }
  }

  // 3. Clipboard fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }

  return 'dismissed';
}
