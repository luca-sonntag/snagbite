import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Recipe, Ingredient } from '../../types';
import type { SortedIngredientGroup } from './types';
import { useRecipeScaling } from '../../hooks/useRecipeScaling';
import { useRecipeProgress } from '../../hooks/useRecipeProgress';
import { useRecipeNutrition } from '../../hooks/useRecipeNutrition';
import { categoryOrder, legacyCategoryMap } from '../../i18n';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useTimerManager } from '../../hooks/useTimerManager';
import { useGamification } from '../../context/GamificationContext';
import { useCookHistory } from '../../hooks/useCookHistory';
import { useAuth } from '../../context/AuthContext';
import { useScrollSpy } from './useScrollSpy';
import { copyRecipeToClipboard } from './copyRecipeToClipboard';

interface UseRecipeDetailsOptions {
  recipe: Recipe;
  onAddIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  onNavigateToShoppingList?: () => void;
}

export function useRecipeDetails({ recipe, onAddIngredients, onNavigateToShoppingList }: UseRecipeDetailsOptions) {
  const { t, translateCategory } = useI18n();
  const toast = useToast();
  const { isPremium } = useAuth();

  // Checklists & scaling
  const { checkedSteps, toggleStep } = useRecipeProgress(recipe);
  const { servings, setServings, scaleFactor, formatAmount } = useRecipeScaling(recipe);

  // Scroll spy (delegated hook)
  const { activeSection, isHeaderCollapsed, setCollapseSentinel, scrollToSection } = useScrollSpy(recipe);

  // Local UI states
  const [isCopied, setIsCopied] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCopilotForceNewRemix, setIsCopilotForceNewRemix] = useState(false);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [isCookedModalOpen, setIsCookedModalOpen] = useState(false);
  const [initialStepOverride, setInitialStepOverride] = useState<number | undefined>(undefined);
  const [isShoppingConfirmOpen, setIsShoppingConfirmOpen] = useState(false);
  const [isAddToPlanOpen, setIsAddToPlanOpen] = useState(false);
  const [shouldNavigateAfterAdd, setShouldNavigateAfterAdd] = useState(false);

  const openCopilot = useCallback((forceNewRemix = false) => {
    if (isPremium) {
      setIsCopilotForceNewRemix(forceNewRemix);
      setIsCopilotOpen(true);
    } else {
      setIsPremiumModalOpen(true);
    }
  }, [isPremium]);

  // Timer & gamification
  const { pendingNavigation, setPendingNavigation } = useTimerManager();
  const { snapshot } = useGamification();
  const cookRefreshKey = snapshot?.stats?.totalCooks ?? 0;
  const { history: cookHistory } = useCookHistory(recipe.id, cookRefreshKey);

  // Nutrition
  const [showTotalNutrition, setShowTotalNutrition] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('recipe_show_total_nutrition');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const { nutritionalValues, sourceNutritionalValues, isAiEstimated, isVerified, hasNutritionInfo } =
    useRecipeNutrition(recipe);

  // Dev mode logging
  useEffect(() => {
    if (import.meta.env.DEV) console.log('🍳 [DevMode] Full Recipe Model:', recipe);
  }, [recipe]);

  // --- Timer navigation effects ---
  useEffect(() => {
    if (
      pendingNavigation &&
      pendingNavigation.stepNum !== undefined &&
      (pendingNavigation.recipeId === recipe.id || pendingNavigation.recipeId === recipe.title)
    ) {
      setInitialStepOverride(pendingNavigation.stepNum - 1);
      setIsCookingMode(true);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, recipe.id, recipe.title, setPendingNavigation]);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId: string; stepNum: number }>;
      if (
        customEvent.detail?.stepNum !== undefined &&
        (customEvent.detail.recipeId === recipe.id || customEvent.detail.recipeId === recipe.title)
      ) {
        setInitialStepOverride(customEvent.detail.stepNum - 1);
        setIsCookingMode(true);
      }
    };
    window.addEventListener('app:navigate-to-timer-step', handleNavigate);
    return () => window.removeEventListener('app:navigate-to-timer-step', handleNavigate);
  }, [recipe.id, recipe.title]);

  // --- Step toggle handler ---
  const handleToggleStep = useCallback((stepNum: number) => {
    const instructions = recipe.instructions ?? [];
    const isCurrentlyChecked = !!checkedSteps[stepNum];
    const currentIdx = instructions.findIndex((s) => s.step === stepNum);
    toggleStep(stepNum);
    if (!isCurrentlyChecked && instructions.length > 0 && currentIdx === instructions.length - 1 && recipe.id) {
      setIsCookedModalOpen(true);
    }
  }, [recipe.instructions, recipe.id, checkedSteps, toggleStep]);

  // --- Steps progress ---
  const activeStepNum = useMemo(() => {
    if (!recipe.instructions) return null;
    const activeStep = recipe.instructions.find(s => !checkedSteps[s.step]);
    return activeStep ? activeStep.step : null;
  }, [recipe.instructions, checkedSteps]);

  const totalStepsCount = recipe.instructions ? recipe.instructions.length : 0;
  const completedStepsCount = useMemo(() => {
    if (!recipe.instructions) return 0;
    return recipe.instructions.filter(s => !!checkedSteps[s.step]).length;
  }, [recipe.instructions, checkedSteps]);
  const progressPercent = totalStepsCount > 0 ? (completedStepsCount / totalStepsCount) * 100 : 0;

  // --- Time & nutrition helpers ---
  const formatTimeValue = useCallback((time: string | number | null | undefined) => {
    if (time === undefined || time === null || time === '') return 'N/A';
    if (typeof time === 'number') return t('recipe.minutes', { count: time });
    const strTime = String(time).trim();
    const match = strTime.match(/\d+/);
    if (match) return t('recipe.minutes', { count: match[0] });
    return strTime;
  }, [t]);

  const getNutritionDisplayValue = useCallback((
    val: string | number | null | undefined, unit: string = 'g',
    isTotal: boolean = false, includeUnit: boolean = true
  ) => {
    if (val === undefined || val === null || val === '') return '—';
    let numericVal: number;
    let originalUnit = '';
    if (typeof val === 'number') { numericVal = val; }
    else {
      const match = String(val).trim().match(/^([\d.,]+)\s*([a-zA-Z%]*)$/);
      if (!match) return String(val);
      numericVal = parseFloat(match[1].replace(',', '.'));
      originalUnit = match[2] || '';
      if (isNaN(numericVal)) return String(val);
    }
    if (numericVal === 0) return '—';
    const finalVal = isTotal ? numericVal * servings : numericVal;
    return includeUnit ? `${Math.round(finalVal)}${originalUnit || unit}` : String(Math.round(finalVal));
  }, [servings]);

  const totalTimeLabel = useMemo(() => {
    const minutesOf = (time: string | number | null | undefined): number | null => {
      if (time === undefined || time === null || time === '') return null;
      if (typeof time === 'number') return time;
      const match = String(time).match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };
    const total = [minutesOf(recipe.prepTime), minutesOf(recipe.cookTime)]
      .filter((v): v is number => v !== null)
      .reduce((sum, v) => sum + v, 0);
    return total > 0 ? t('recipe.minutes', { count: total }) : null;
  }, [recipe.prepTime, recipe.cookTime, t]);

  const metaCalories = useMemo(() => {
    const raw = nutritionalValues?.calories;
    if (raw === undefined || raw === null) return null;
    return raw > 0 ? Math.round(raw) : null;
  }, [nutritionalValues]);

  const handleToggleTotalNutrition = useCallback((isTotal: boolean) => {
    setShowTotalNutrition(isTotal);
    try { localStorage.setItem('recipe_show_total_nutrition', JSON.stringify(isTotal)); }
    catch (e) { console.error('Error saving showTotalNutrition to localStorage', e); }
  }, []);

  // --- Sorted ingredients ---
  const sortedIngredients: SortedIngredientGroup[] = useMemo(() => {
    if (!recipe.ingredients) return [];
    const mapped = recipe.ingredients.map((group, originalIdx) => ({ group, originalIdx }));
    return mapped.sort((a, b) => {
      const getCategoryIndex = (name: string) => {
        const cleanName = name.trim().toUpperCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let idx = categoryOrder.indexOf(cleanName as any);
        if (idx !== -1) return idx;
        const enumKey = legacyCategoryMap[name.trim().toLowerCase()];
        if (enumKey) return categoryOrder.indexOf(enumKey);
        return 999;
      };
      return getCategoryIndex(a.group.name) - getCategoryIndex(b.group.name);
    });
  }, [recipe.ingredients]);

  // --- Shopping list handlers ---
  const handleAddToShoppingList = useCallback(() => {
    setShouldNavigateAfterAdd(false);
    setIsShoppingConfirmOpen(true);
  }, []);

  const handleAddAndNavigateToShoppingList = useCallback(() => {
    setShouldNavigateAfterAdd(true);
    setIsShoppingConfirmOpen(true);
  }, []);

  const handleConfirmShoppingListSelection = useCallback((itemsToAdd: Ingredient[]) => {
    if (!onAddIngredients || itemsToAdd.length === 0) return;
    const recipeId = recipe.id || recipe.title;
    onAddIngredients(itemsToAdd, recipeId, recipe.title);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
    const title = itemsToAdd.length === 1
      ? t('toast.ingredientsAddedSingle', { name: itemsToAdd[0].name })
      : t('toast.ingredientsAddedMany', { count: itemsToAdd.length });
    toast.success(title, {
      description: recipe.title,
      action: onNavigateToShoppingList
        ? { label: t('toast.viewShoppingList'), onClick: () => onNavigateToShoppingList() }
        : undefined,
    });
    if (shouldNavigateAfterAdd) onNavigateToShoppingList?.();
  }, [onAddIngredients, recipe.id, recipe.title, t, toast, onNavigateToShoppingList, shouldNavigateAfterAdd]);

  // --- Cooking mode ---
  const handleStartCooking = useCallback(() => {
    isPremium ? setIsCookingMode(true) : setIsPremiumModalOpen(true);
  }, [isPremium]);

  // --- Clipboard copy ---
  const copyRecipe = useCallback(() => {
    copyRecipeToClipboard({
      recipe, sortedIngredients, servings, formatAmount, formatTimeValue, translateCategory, t,
    }).then(() => {
      setIsCopied(true);
      toast.success(t('toast.recipeCopied'));
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => { });
  }, [recipe, sortedIngredients, servings, formatAmount, formatTimeValue, translateCategory, t, toast]);

  return {
    isPremium, isPremiumModalOpen, setIsPremiumModalOpen,
    servings, setServings, scaleFactor, formatAmount,
    checkedSteps, toggleStep, handleToggleStep,
    activeStepNum, totalStepsCount, completedStepsCount, progressPercent,
    activeSection, isHeaderCollapsed, setCollapseSentinel, scrollToSection,
    nutritionalValues, sourceNutritionalValues, isAiEstimated, isVerified, hasNutritionInfo,
    showTotalNutrition, handleToggleTotalNutrition,
    formatTimeValue, getNutritionDisplayValue, totalTimeLabel, metaCalories,
    sortedIngredients,
    isCopied, isCopilotOpen, setIsCopilotOpen,
    isCopilotForceNewRemix, setIsCopilotForceNewRemix, openCopilot,
    isCookingMode, setIsCookingMode, initialStepOverride, setInitialStepOverride,
    isCookedModalOpen, setIsCookedModalOpen,
    isAdded, isShoppingConfirmOpen, setIsShoppingConfirmOpen,
    isAddToPlanOpen, setIsAddToPlanOpen,
    handleStartCooking, handleAddToShoppingList,
    handleAddAndNavigateToShoppingList, handleConfirmShoppingListSelection,
    copyRecipe, cookRefreshKey, cookHistory,
  };
}
