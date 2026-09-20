import type { Ingredient, Recipe } from '../../types';
import type { SortedIngredientGroup } from './types';
import { stripInlineIngredientTags } from '../../utils/ingredientMatch';

/**
 * Build a human-readable ingredient line, e.g. "200 g Mehl (gesiebt) (Bio)"
 */
const formatIngredientLine = (
  ing: Ingredient,
  formatAmount: (amount: number | undefined, unit: string | undefined) => string
): string => {
  const scaledAmount = formatAmount(ing.amount, ing.unit);
  const amountStr = scaledAmount ? `${scaledAmount} ` : '';
  const unitStr = ing.unit ? `${ing.unit} ` : '';
  const modifierStr = ing.modifier ? ` (${ing.modifier})` : '';
  const noteStr = ing.notes ? ` (${ing.notes})` : '';
  return `${amountStr}${unitStr}${ing.name}${modifierStr}${noteStr}`;
};

/** Escape user-provided text for the HTML clipboard payload */
const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface BuildClipboardParams {
  recipe: Recipe;
  sortedIngredients: SortedIngredientGroup[];
  servings: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  formatTimeValue: (time: string | number | null | undefined) => string;
  translateCategory: (name: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Builds plain-text and HTML clipboard payloads for a recipe and writes them
 * to the system clipboard. Returns a promise that resolves when the write
 * succeeds.
 */
export async function copyRecipeToClipboard({
  recipe,
  sortedIngredients,
  servings,
  formatAmount,
  formatTimeValue,
  translateCategory,
  t,
}: BuildClipboardParams): Promise<void> {
  const hasGroups = recipe.ingredients.length > 1;
  const metaLine = `${t('recipe.prep')}: ${formatTimeValue(recipe.prepTime)} · ${t('recipe.cook')}: ${formatTimeValue(recipe.cookTime)} · ${t('recipe.serves')}: ${servings}`;

  // --- Plain text ---
  let text = `${recipe.title}\n\n`;
  if (recipe.description) text += `${stripInlineIngredientTags(recipe.description)}\n\n`;
  text += `${metaLine}\n\n`;
  text += `${t('recipe.tabIngredients')}\n`;
  sortedIngredients.forEach(({ group }) => {
    if (hasGroups) text += `${translateCategory(group.name)}\n`;
    group.items.forEach((ing) => { text += `• ${formatIngredientLine(ing, formatAmount)}\n`; });
    if (hasGroups) text += `\n`;
  });
  if (!hasGroups) text += `\n`;
  text += `${t('recipe.tabInstructions')}\n`;
  recipe.instructions.forEach((step) => { text += `${step.step}. ${stripInlineIngredientTags(step.description)}\n`; });
  text += `\n`;
  if (recipe.equipment && recipe.equipment.length > 0) {
    text += `${t('recipe.requiredEquipment')}\n`;
    recipe.equipment.forEach((item) => { text += `• ${stripInlineIngredientTags(item)}\n`; });
    text += `\n`;
  }
  if (recipe.tips && recipe.tips.length > 0) {
    text += `${t('recipe.tipsTitle')}\n`;
    recipe.tips.forEach((tip) => { text += `• ${stripInlineIngredientTags(tip)}\n`; });
    text += `\n`;
  }

  // --- Rich text (HTML) ---
  let html = `<h1>${escapeHtml(recipe.title)}</h1>`;
  if (recipe.description) html += `<p>${escapeHtml(stripInlineIngredientTags(recipe.description))}</p>`;
  html += `<p><strong>${escapeHtml(t('recipe.prep'))}:</strong> ${escapeHtml(formatTimeValue(recipe.prepTime))} · <strong>${escapeHtml(t('recipe.cook'))}:</strong> ${escapeHtml(formatTimeValue(recipe.cookTime))} · <strong>${escapeHtml(t('recipe.serves'))}:</strong> ${servings}</p>`;
  html += `<h2>${escapeHtml(t('recipe.tabIngredients'))}</h2>`;
  sortedIngredients.forEach(({ group }) => {
    if (hasGroups) html += `<h3>${escapeHtml(translateCategory(group.name))}</h3>`;
    html += `<ul>`;
    group.items.forEach((ing) => { html += `<li>${escapeHtml(formatIngredientLine(ing, formatAmount))}</li>`; });
    html += `</ul>`;
  });
  html += `<h2>${escapeHtml(t('recipe.tabInstructions'))}</h2><ol>`;
  recipe.instructions.forEach((step) => { html += `<li>${escapeHtml(stripInlineIngredientTags(step.description))}</li>`; });
  html += `</ol>`;
  if (recipe.equipment && recipe.equipment.length > 0) {
    html += `<h2>${escapeHtml(t('recipe.requiredEquipment'))}</h2><ul>`;
    recipe.equipment.forEach((item) => { html += `<li>${escapeHtml(stripInlineIngredientTags(item))}</li>`; });
    html += `</ul>`;
  }
  if (recipe.tips && recipe.tips.length > 0) {
    html += `<h2>${escapeHtml(t('recipe.tipsTitle'))}</h2><ul>`;
    recipe.tips.forEach((tip) => { html += `<li>${escapeHtml(stripInlineIngredientTags(tip))}</li>`; });
    html += `</ul>`;
  }

  // Prefer writing both HTML + plain text; fall back to plain text
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
      return;
    }
  } catch {
    // fall through to plain-text write
  }

  await navigator.clipboard.writeText(text);
}
