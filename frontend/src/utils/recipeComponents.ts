import type { Ingredient, InstructionStep, Recipe } from '../types';

const GENERIC_SECTIONS = new Set([
  'zutaten',
  'hauptzutaten',
  'ingredients',
  'main',
  'general',
  'basis',
  'default',
  'allgemein',
]);

/**
 * Normalizes a section name: trims whitespace and returns undefined if empty or generic.
 */
export function sanitizeSectionName(section?: string | null): string | undefined {
  if (!section || typeof section !== 'string') return undefined;
  const trimmed = section.trim();
  if (trimmed.length === 0 || GENERIC_SECTIONS.has(trimmed.toLowerCase())) {
    return undefined;
  }
  return trimmed;
}

/**
 * Checks if a recipe contains at least 2 distinct culinary components across ingredients or instructions.
 */
export function hasRecipeComponents(
  recipe?: Pick<Recipe, 'ingredients' | 'instructions'> | null
): boolean {
  if (!recipe) return false;
  const sections = new Set<string>();

  for (const ing of recipe.ingredients ?? []) {
    const s = sanitizeSectionName(ing.section);
    if (s) sections.add(s.toLowerCase());
  }

  for (const step of recipe.instructions ?? []) {
    const s = sanitizeSectionName(step.section);
    if (s) sections.add(s.toLowerCase());
  }

  return sections.size >= 2;
}

export interface IngredientComponentGroup {
  sectionName: string;
  items: Ingredient[];
}

/**
 * Groups ingredients by their component section, maintaining original order.
 * Ingredients without a section are grouped under an empty string sectionName.
 */
export function groupIngredientsByComponent(
  ingredients: Ingredient[] | undefined
): IngredientComponentGroup[] {
  if (!ingredients || ingredients.length === 0) return [];

  const groups: IngredientComponentGroup[] = [];
  const groupMap = new Map<string, IngredientComponentGroup>();

  for (const ing of ingredients) {
    const rawSection = sanitizeSectionName(ing.section) ?? '';
    let group = groupMap.get(rawSection);
    if (!group) {
      group = { sectionName: rawSection, items: [] };
      groupMap.set(rawSection, group);
      groups.push(group);
    }
    group.items.push(ing);
  }

  return groups;
}

export interface InstructionComponentGroup {
  sectionName: string;
  steps: InstructionStep[];
}

/**
 * Groups instruction steps into consecutive blocks by component section.
 */
export function groupInstructionsByComponent(
  instructions: InstructionStep[] | undefined
): InstructionComponentGroup[] {
  if (!instructions || instructions.length === 0) return [];

  const groups: InstructionComponentGroup[] = [];
  let currentGroup: InstructionComponentGroup | null = null;

  for (const step of instructions) {
    const sectionName = sanitizeSectionName(step.section) ?? '';
    if (!currentGroup || currentGroup.sectionName !== sectionName) {
      currentGroup = { sectionName, steps: [] };
      groups.push(currentGroup);
    }
    currentGroup.steps.push(step);
  }

  return groups;
}

export interface ComponentBreakdownItem {
  section?: string;
  amount: number;
}

export interface ConsolidatedShoppingIngredient extends Ingredient {
  breakdown: ComponentBreakdownItem[];
  originalIndices: number[];
}

/**
 * Consolidates duplicate ingredients (e.g. same baseName or name + unit across multiple components)
 * for clean shopping list display and export.
 */
export function consolidateIngredientsForShopping(
  ingredients: Ingredient[] | undefined
): ConsolidatedShoppingIngredient[] {
  if (!ingredients || ingredients.length === 0) return [];

  const map = new Map<string, ConsolidatedShoppingIngredient>();
  const result: ConsolidatedShoppingIngredient[] = [];

  ingredients.forEach((ing, idx) => {
    const identityKey = `${(ing.baseName || ing.name).toLowerCase().trim()}|${(ing.unit || '').toLowerCase().trim()}`;

    const existing = map.get(identityKey);
    const sectionName = sanitizeSectionName(ing.section);

    if (existing) {
      existing.amount = (existing.amount || 0) + (ing.amount || 0);
      existing.breakdown.push({
        section: sectionName,
        amount: ing.amount || 0,
      });
      existing.originalIndices.push(idx);
    } else {
      const consolidated: ConsolidatedShoppingIngredient = {
        ...ing,
        breakdown: [
          {
            section: sectionName,
            amount: ing.amount || 0,
          },
        ],
        originalIndices: [idx],
      };
      map.set(identityKey, consolidated);
      result.push(consolidated);
    }
  });

  return result;
}
