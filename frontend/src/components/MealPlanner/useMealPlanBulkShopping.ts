import { useState, useCallback, useEffect, useRef } from 'react';
import type { MealPlanEntry, SavedRecipe, Ingredient, Recipe, MealPlanRecipeSummary } from '../../types';
import type { BulkShoppingItem } from './types';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { formatDateIso, sortIngredientGroupsByCategory } from './mealPlannerUtils';

interface UseMealPlanBulkShoppingOptions {
  mealPlans: MealPlanEntry[];
  currentWeekStart: Date;
  weekEnd: Date;
  history: SavedRecipe[];
  addRecipeIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  onNavigateToShoppingList?: () => void;
}

export function useMealPlanBulkShopping({
  mealPlans,
  currentWeekStart,
  weekEnd,
  history,
  addRecipeIngredients,
  onNavigateToShoppingList,
}: UseMealPlanBulkShoppingOptions) {
  const toast = useToast();
  const { t } = useI18n();

  const [queue, setQueue] = useState<BulkShoppingItem[]>([]);
  const [bulkShoppingTotal, setBulkShoppingTotal] = useState(0);
  const [addedRecipesCount, setAddedRecipesCount] = useState(0);
  const [addedItemsCount, setAddedItemsCount] = useState(0);
  const [isShopAdded, setIsShopAdded] = useState(false);

  const currentBulkItem = queue[0] ?? null;

  // Build the bulk shopping queue for the current viewed week
  const startBulkShopping = useCallback(() => {
    if (!addRecipeIngredients) return;

    const todayStr = formatDateIso(new Date());
    const weekStartStr = formatDateIso(currentWeekStart);
    const weekEndStr = formatDateIso(weekEnd);

    // If viewing current week, start from today. If future week, start from week start.
    const effectiveStart = weekStartStr > todayStr ? weekStartStr : todayStr;

    // Filter recipes for this week that are not in the past
    const weekEntries = mealPlans.filter(
      (p) => p.planDate >= effectiveStart && p.planDate <= weekEndStr,
    );

    if (weekEntries.length === 0) {
      toast.info(t('mealPlanner.noPlannedRecipes'));
      return;
    }

    // Filter out already cooked recipes
    const unCookedEntries = weekEntries.filter((p) => !p.isCooked);
    if (unCookedEntries.length === 0) {
      toast.info(t('mealPlanner.allCooked'));
      return;
    }

    // Consolidate entries by recipeId (in case same recipe planned multiple days)
    const recipeMap = new Map<
      string,
      {
        entry: MealPlanEntry;
        recipe: Recipe | MealPlanRecipeSummary;
        totalServings: number;
        baseServings: number;
      }
    >();

    for (const entry of unCookedEntries) {
      const fullRecipe =
        history.find((h) => h.recipeId === entry.recipeId)?.recipe || entry.recipe;

      if (!fullRecipe || !fullRecipe.ingredients || fullRecipe.ingredients.length === 0) {
        continue;
      }

      const baseServings = fullRecipe.servings ? Number(fullRecipe.servings) : 2;
      const plannedServings = entry.servings || baseServings;

      const existing = recipeMap.get(entry.recipeId);
      if (existing) {
        existing.totalServings += plannedServings;
      } else {
        recipeMap.set(entry.recipeId, {
          entry,
          recipe: fullRecipe,
          totalServings: plannedServings,
          baseServings,
        });
      }
    }

    const items: BulkShoppingItem[] = [];
    const recipeList = Array.from(recipeMap.values());
    const totalCount = recipeList.length;

    recipeList.forEach(({ entry, recipe, totalServings, baseServings }, index) => {
      const scaleFactor = totalServings / baseServings;
      const sortedIngredients = sortIngredientGroupsByCategory(recipe.ingredients);
      const pos = index + 1;
      const recipeLabel =
        totalCount > 1
          ? `${recipe.title} (${pos}/${totalCount})`
          : recipe.title;

      items.push({
        entry,
        recipe,
        targetServings: totalServings,
        baseServings,
        scaleFactor,
        sortedIngredients,
        recipeLabel,
      });
    });

    if (items.length === 0) {
      toast.info(t('mealPlanner.noPlannedRecipes'));
      return;
    }

    hapticMedium();
    setAddedRecipesCount(0);
    setAddedItemsCount(0);
    setBulkShoppingTotal(items.length);
    setQueue(items);
  }, [addRecipeIngredients, currentWeekStart, weekEnd, mealPlans, history, toast, t]);

  const handleBulkShoppingConfirm = useCallback(
    (selectedIngredients: Ingredient[]) => {
      if (!currentBulkItem || !addRecipeIngredients) return;

      if (selectedIngredients.length > 0) {
        const recipeId = currentBulkItem.recipe.id || currentBulkItem.entry.recipeId;
        const recipeTitle = currentBulkItem.recipe.title || 'Rezept';
        addRecipeIngredients(
          selectedIngredients,
          recipeId,
          recipeTitle,
        );
        setAddedItemsCount((prev) => prev + selectedIngredients.length);
        setAddedRecipesCount((prev) => prev + 1);
      }
      // Note: ShoppingConfirmSheet invokes onClose() right after onConfirm().
      // Advancing the queue is therefore performed in handleBulkShoppingClose.
    },
    [currentBulkItem, addRecipeIngredients],
  );

  const handleBulkShoppingClose = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const cancelBulkShopping = useCallback(() => {
    hapticLight();
    setQueue([]);
  }, []);

  // When queue finishes, trigger completion toast and state
  const prevQueueLenRef = useRef(0);
  useEffect(() => {
    if (prevQueueLenRef.current > 0 && queue.length === 0 && addedRecipesCount > 0) {
      setIsShopAdded(true);
      toast.success(t('mealPlanner.addedToShoppingList'), {
        action: onNavigateToShoppingList
          ? { label: t('toast.viewShoppingList'), onClick: onNavigateToShoppingList }
          : undefined,
      });
    }
    prevQueueLenRef.current = queue.length;
  }, [queue.length, addedRecipesCount, addedItemsCount, onNavigateToShoppingList, toast, t]);

  return {
    isAddingToShopping: queue.length > 0,
    isShopAdded,
    startBulkShopping,
    currentBulkItem,
    bulkShoppingTotal,
    bulkShoppingQueueLength: queue.length,
    handleBulkShoppingConfirm,
    handleBulkShoppingClose,
    cancelBulkShopping,
  };
}
