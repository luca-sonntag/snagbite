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
  addRecipeIngredients?: (
    ingredients: Ingredient[],
    recipeId: string,
    recipeTitle: string
  ) => Promise<boolean> | boolean | void;
  onNavigateToShoppingList?: () => void;
}

function createBulkShoppingItem(
  entry: MealPlanEntry,
  recipe: Recipe | MealPlanRecipeSummary,
  servings: number,
  baseServings: number,
  labelSuffix?: string,
): BulkShoppingItem {
  return {
    entry,
    recipe,
    targetServings: servings,
    baseServings,
    scaleFactor: servings / baseServings,
    sortedIngredients: sortIngredientGroupsByCategory(recipe.ingredients),
    recipeLabel: labelSuffix ? `${recipe.title} ${labelSuffix}` : recipe.title,
  };
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
    const effectiveStart = weekStartStr > todayStr ? weekStartStr : todayStr;

    const weekEntries = mealPlans.filter(
      (p) => p.planDate >= effectiveStart && p.planDate <= weekEndStr && !p.isCooked,
    );

    if (weekEntries.length === 0) {
      toast.info(t('mealPlanner.noPlannedRecipes'));
      return;
    }

    const recipeMap = new Map<
      string,
      {
        entry: MealPlanEntry;
        recipe: Recipe | MealPlanRecipeSummary;
        totalServings: number;
        baseServings: number;
      }
    >();

    for (const entry of weekEntries) {
      const fullRecipe =
        history.find((h) => h.recipeId === entry.recipeId)?.recipe || entry.recipe;
      if (!fullRecipe?.ingredients || fullRecipe.ingredients.length === 0) continue;

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

    const recipeList = Array.from(recipeMap.values());
    const totalCount = recipeList.length;
    const items: BulkShoppingItem[] = recipeList.map(
      ({ entry, recipe, totalServings, baseServings }, index) =>
        createBulkShoppingItem(
          entry,
          recipe,
          totalServings,
          baseServings,
          totalCount > 1 ? `(${index + 1}/${totalCount})` : undefined,
        ),
    );

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

  // Start single recipe shopping flow from card action menu
  const startSingleShopping = useCallback(
    (entry: MealPlanEntry) => {
      if (!addRecipeIngredients) return;

      const fullRecipe =
        history.find((h) => h.recipeId === entry.recipeId)?.recipe || entry.recipe;

      if (!fullRecipe?.ingredients || fullRecipe.ingredients.length === 0) {
        toast.info(t('mealPlanner.noIngredients') || 'Keine Zutaten gefunden');
        return;
      }

      const baseServings = fullRecipe.servings ? Number(fullRecipe.servings) : 2;
      const plannedServings = entry.servings || baseServings;
      const item = createBulkShoppingItem(entry, fullRecipe, plannedServings, baseServings);

      hapticLight();
      setAddedRecipesCount(0);
      setAddedItemsCount(0);
      setBulkShoppingTotal(1);
      setQueue([item]);
    },
    [addRecipeIngredients, history, toast, t],
  );

  const handleBulkShoppingConfirm = useCallback(
    async (selectedIngredients: Ingredient[]) => {
      if (!currentBulkItem || !addRecipeIngredients) return;

      if (selectedIngredients.length > 0) {
        const recipeId = currentBulkItem.recipe.id || currentBulkItem.entry.recipeId;
        const recipeTitle = currentBulkItem.recipe.title || 'Rezept';
        const result = await addRecipeIngredients(
          selectedIngredients,
          recipeId,
          recipeTitle,
        );
        if (result === false) {
          setQueue([]);
          return;
        }
        setAddedItemsCount((prev) => prev + selectedIngredients.length);
        setAddedRecipesCount((prev) => prev + 1);
      }
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
    startSingleShopping,
    currentBulkItem,
    bulkShoppingTotal,
    bulkShoppingQueueLength: queue.length,
    handleBulkShoppingConfirm,
    handleBulkShoppingClose,
    cancelBulkShopping,
  };
}
