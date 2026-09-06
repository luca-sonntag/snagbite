import type {
  Recipe,
  RecipeOperation,
  Ingredient,
  IngredientGroup,
  InstructionStep,
} from './types.js';

function normalizeWord(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // ä -> a, ö -> o, ü -> u, é -> e etc.
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function getStems(normalized: string): string[] {
  if (!normalized || normalized.length < 3) return [normalized];
  const stems = new Set<string>([normalized]);

  if (normalized.endsWith('en') && normalized.length > 4) {
    stems.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith('n') && normalized.length > 3) {
    stems.add(normalized.slice(0, -1));
  }
  if (normalized.endsWith('e') && normalized.length > 3) {
    stems.add(normalized.slice(0, -1));
  }
  if (normalized.endsWith('s') && normalized.length > 3) {
    stems.add(normalized.slice(0, -1));
  }
  return Array.from(stems);
}

function matchesIngredientName(ing: Ingredient, targetName: string): boolean {
  if (!targetName) return false;
  const rawTarget = targetName.trim().toLowerCase();
  const rawName = (ing.name || '').trim().toLowerCase();
  const rawBase = (ing.baseName || '').trim().toLowerCase();
  const rawMatched = (ing.matchedName || '').trim().toLowerCase();

  // 1. Direct string or substring match
  if (
    rawName === rawTarget ||
    rawBase === rawTarget ||
    rawMatched === rawTarget ||
    rawName.includes(rawTarget) ||
    rawTarget.includes(rawName)
  ) {
    return true;
  }

  // 2. Normalized diacritics / umlauts (e.g. "Äpfel" -> "apfel" matches "Apfel" -> "apfel")
  const normTarget = normalizeWord(targetName);
  const candidateNorms = [rawName, rawBase, rawMatched].filter(Boolean).map(normalizeWord);

  for (const c of candidateNorms) {
    if (!c) continue;
    if (c === normTarget || c.includes(normTarget) || normTarget.includes(c)) {
      return true;
    }
  }

  // 3. Stem matching (e.g. "Birnen" vs "Birne", "Tomaten" vs "Tomate")
  const targetStems = getStems(normTarget);
  for (const c of candidateNorms) {
    const cStems = getStems(c);
    for (const tStem of targetStems) {
      for (const cs of cStems) {
        if (cs === tStem || cs.includes(tStem) || tStem.includes(cs)) {
          return true;
        }
      }
    }
  }

  // 4. Word-by-word token overlap (e.g. "Boskoop Äpfel" vs "Apfel")
  const targetTokens = targetName
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeWord)
    .filter((t) => t.length >= 3);

  for (const cand of [rawName, rawBase, rawMatched]) {
    const candTokens = cand
      .toLowerCase()
      .split(/\s+/)
      .map(normalizeWord)
      .filter((t) => t.length >= 3);

    for (const tt of targetTokens) {
      const ttStems = getStems(tt);
      for (const ct of candTokens) {
        const ctStems = getStems(ct);
        if (ttStems.some((ts) => ctStems.some((cs) => cs === ts || cs.includes(ts) || ts.includes(cs)))) {
          return true;
        }
      }
    }
  }

  return false;
}

function replaceInTextPreservingCase(text: string, targetName: string, replacementName: string): string {
  if (!text || !targetName || !replacementName) return text;

  const normTarget = normalizeWord(targetName);
  const targetStems = getStems(normTarget);

  const words = text.split(/([^\p{L}\p{N}]+)/u);
  let hasModified = false;

  const replacedWords = words.map((word) => {
    const norm = normalizeWord(word);
    if (!norm) return word;

    const wordStems = getStems(norm);
    const matches = targetStems.some((ts) => wordStems.some((ws) => ws === ts));

    if (matches) {
      hasModified = true;
      const isAllUpper = word === word.toUpperCase() && word.length > 1;
      const isCapitalized = word[0] === word[0].toUpperCase();
      let res = replacementName;
      if (isAllUpper) {
        res = replacementName.toUpperCase();
      } else if (isCapitalized) {
        res = replacementName[0].toUpperCase() + replacementName.slice(1);
      } else {
        res = replacementName.toLowerCase();
      }
      return res;
    }
    return word;
  });

  return hasModified ? replacedWords.join('') : text;
}

/**
 * Pure, deterministic function to apply structured recipe operations to a base recipe.
 * Deep-clones the recipe so the original is never mutated.
 */
export function applyRecipeOperations(baseRecipe: Recipe, operations: RecipeOperation[]): Recipe {
  if (!operations || operations.length === 0) {
    return structuredClone(baseRecipe);
  }

  const recipe: Recipe = structuredClone(baseRecipe);
  recipe.origin = 'remix';
  recipe.parentRecipeId = baseRecipe.id ?? recipe.parentRecipeId ?? null;
  recipe.parentRecipeTitle = baseRecipe.title;

  for (const op of operations) {
    switch (op.type) {
      case 'REPLACE_INGREDIENT': {
        if (!op.newIngredient || !op.targetIngredientName) break;
        let replaced = false;

        const newIng: Ingredient = {
          ...op.newIngredient,
          replacedOriginal: op.targetIngredientName,
        };

        for (const group of recipe.ingredients) {
          const idx = group.items.findIndex((item) => matchesIngredientName(item, op.targetIngredientName!));
          if (idx !== -1) {
            group.items[idx] = newIng;
            replaced = true;
            break;
          }
        }

        // If target was not found in existing groups, add as new ingredient
        if (!replaced) {
          const targetCategory = newIng.category || 'OTHER';
          let targetGroup = recipe.ingredients.find((g) => g.name.toUpperCase() === targetCategory.toUpperCase());
          if (!targetGroup) {
            targetGroup = { name: targetCategory, items: [] };
            recipe.ingredients.push(targetGroup);
          }
          targetGroup.items.push(newIng);
        }
        break;
      }

      case 'ADD_INGREDIENTS': {
        const toAdd = op.newIngredients || (op.newIngredient ? [op.newIngredient] : []);
        if (toAdd.length === 0) break;

        for (const newIng of toAdd) {
          const targetCategory = op.groupName || newIng.category || 'OTHER';
          let targetGroup = recipe.ingredients.find(
            (g) => g.name.toUpperCase() === targetCategory.toUpperCase()
          );

          if (!targetGroup) {
            targetGroup = { name: targetCategory, items: [] };
            recipe.ingredients.push(targetGroup);
          }

          // Avoid duplicate exact ingredient additions
          const exists = targetGroup.items.some(
            (i) => i.name.trim().toLowerCase() === newIng.name.trim().toLowerCase()
          );
          if (!exists) {
            targetGroup.items.push({ ...newIng });
          }
        }
        break;
      }

      case 'REMOVE_INGREDIENT': {
        if (!op.removeIngredientName) break;
        const target = op.removeIngredientName;

        for (const group of recipe.ingredients) {
          group.items = group.items.filter((item) => !matchesIngredientName(item, target));
        }
        // Remove empty groups
        recipe.ingredients = recipe.ingredients.filter((g) => g.items.length > 0);
        break;
      }

      case 'SCALE_SERVINGS': {
        if (!op.newServings || op.newServings <= 0 || !recipe.servings || recipe.servings <= 0) break;
        const scaleFactor = op.newServings / recipe.servings;
        recipe.servings = op.newServings;

        for (const group of recipe.ingredients) {
          for (const item of group.items) {
            if (typeof item.amount === 'number' && item.amount > 0) {
              const scaled = item.amount * scaleFactor;
              item.amount = Math.round(scaled * 100) / 100;
            }
          }
        }
        break;
      }

      case 'UPDATE_INSTRUCTION': {
        if (op.stepUpdates && op.stepUpdates.length > 0) {
          for (const update of op.stepUpdates) {
            const stepObj = recipe.instructions.find((s) => s.step === update.step);
            if (stepObj) {
              stepObj.description = update.description;
              if (update.parallelPrepHint !== undefined) {
                stepObj.parallelPrepHint = update.parallelPrepHint;
              }
            }
          }
        }
        break;
      }

      case 'ADD_INSTRUCTION_STEP': {
        const stepsToAdd = op.newSteps || [];
        for (const stepInfo of stepsToAdd) {
          const nextStepNum = recipe.instructions.length + 1;
          const newStep: InstructionStep = {
            step: nextStepNum,
            description: stepInfo.description,
            ...(stepInfo.parallelPrepHint ? { parallelPrepHint: stepInfo.parallelPrepHint } : {}),
          };
          recipe.instructions.push(newStep);
        }
        break;
      }

      case 'UPDATE_TITLE': {
        if (op.newTitle?.trim()) {
          recipe.title = op.newTitle.trim();
        }
        break;
      }

      default:
        break;
    }
  }

  // Auto-adapt instructions if a core ingredient was replaced
  for (const op of operations) {
    if (op.type === 'REPLACE_INGREDIENT' && op.targetIngredientName && op.newIngredient?.name) {
      const target = op.targetIngredientName;
      const replacement = op.newIngredient.name;

      for (const step of recipe.instructions) {
        step.description = replaceInTextPreservingCase(step.description, target, replacement);
      }
    }
  }

  return recipe;
}
