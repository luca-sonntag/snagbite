import { useState, useMemo, useEffect } from 'react';
import type { Recipe, Ingredient } from '../../types';
import { useRecipeScaling } from '../../hooks/useRecipeScaling';
import { useRecipeProgress } from '../../hooks/useRecipeProgress';
import { useRecipeNutrition } from '../../hooks/useRecipeNutrition';
import { categoryOrder, legacyCategoryMap } from '../../i18n';
import { useI18n } from '../../context/I18nContext';
import { useTimerManager } from '../../hooks/useTimerManager';
import { useGamification } from '../../context/GamificationContext';
import { useCookHistory } from '../../hooks/useCookHistory';

// Import subcomponents
import RecipeHeader from './RecipeHeader';
import RecipeInfoSection from './RecipeInfoSection';
import RecipeStickyBar from './RecipeStickyBar';
import RecipeIngredients from './RecipeIngredients';
import RecipeInstructions from './RecipeInstructions';
import RecipeActionDock from './RecipeActionDock';
import CookingMode from '../CookingMode';
import CookedButton from '../CookedButton';
import CookHistoryTimeline from '../CookHistoryTimeline';
import RecipeCopilot from './RecipeCopilot';
import { useAuth } from '../../context/AuthContext';
import PremiumModal from '../PremiumModal';
import ShoppingConfirmSheet from './ShoppingConfirmSheet';
import { stripInlineIngredientTags } from '../../utils/ingredientMatch';

interface RecipeDetailsProps {
  recipe: Recipe;
  onAddIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  onDelete?: () => void;
  reelUrl?: string;
  createdAt?: string;
  onBack?: () => void;
  onNavigateToShoppingList?: () => void;
  shoppingListCount?: number;
  onRemixSuccess?: (newRecipe: Recipe, newJobId: string) => void;
  onReplaceCurrent?: (newRecipe: Recipe) => void;
  isParentAvailable?: boolean;
  onNavigateToRecipe?: (recipeId: string) => void;
  parentRecipeTitle?: string | null;
  onAssignCollections?: () => void;
  onManageFlags?: () => void;
  flags?: string[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function RecipeDetails({
  recipe,
  onAddIngredients,
  onDelete,
  reelUrl,
  createdAt,
  onBack,
  onNavigateToShoppingList,
  onRemixSuccess,
  onReplaceCurrent,
  isParentAvailable,
  onNavigateToRecipe,
  parentRecipeTitle,
  onAssignCollections,
  onManageFlags,
  flags,
  isFavorite = false,
  onToggleFavorite
}: RecipeDetailsProps) {
  const { t, translateCategory } = useI18n();

  // Checklists state (persisted in localStorage)
  const {
    checkedSteps,
    toggleStep
  } = useRecipeProgress(recipe);

  // Configurable servings & scaling hook
  const {
    servings,
    setServings,
    scaleFactor,
    formatAmount
  } = useRecipeScaling(recipe);

  // Local UI states
  const [isCopied, setIsCopied] = useState(false);
  const { isPremium } = useAuth();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [initialStepOverride, setInitialStepOverride] = useState<number | undefined>(undefined);
  const { pendingNavigation, setPendingNavigation } = useTimerManager();
  const { snapshot } = useGamification();
  // Bump the cook-history refresh whenever a cook is recorded (totalCooks grows).
  const cookRefreshKey = snapshot?.stats?.totalCooks ?? 0;
  const { history: cookHistory } = useCookHistory(recipe.id, cookRefreshKey);
  const [isShoppingConfirmOpen, setIsShoppingConfirmOpen] = useState(false);
  const [shouldNavigateAfterAdd, setShouldNavigateAfterAdd] = useState(false);

  const [activeSection, setActiveSection] = useState<'ingredients' | 'instructions' | 'details'>('details');

  // Drives the compact title row inside the sticky tab bar: a zero-height
  // sentinel sits right below the title block, so as soon as it leaves the
  // viewport the header has scrolled away and the bar takes over the title.
  const [collapseSentinel, setCollapseSentinel] = useState<HTMLDivElement | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  useEffect(() => {
    if (!collapseSentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderCollapsed(!entry.isIntersecting),
      // Trip once the sentinel passes under the app's sticky top region.
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(collapseSentinel);
    return () => observer.disconnect();
  }, [collapseSentinel]);

  // Track scroll position to update the active navigation section (scroll spy)
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['ingredients', 'instructions', 'details'] as const;

      const stickyTopHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
        10
      );
      // Offset corresponds to status bar/timers + sub-navigation (48px) + offset buffer.
      // The extra buffer (120 px instead of 64 px) makes the tab switch earlier so
      // that it already highlights the incoming section while its heading is still
      // slightly below the sticky bar — prevents the "tab doesn't switch on click" feel.
      const offset = stickyTopHeight + 48 + 120;
      const scrollPosition = window.scrollY + offset;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initialize
    return () => window.removeEventListener('scroll', handleScroll);
  }, [recipe]);

  const scrollToSection = (sectionId: 'ingredients' | 'instructions' | 'details') => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const stickyTopHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
      10
    );

    // The sticky sub-nav is ~44px on its own, but grows to reveal the compact
    // title row (~95px total) once the hero has scrolled away.
    const bar = document.getElementById('recipe-sticky-bar');
    const barHeight = bar?.offsetHeight ?? 44;
    const reserved = Math.max(barHeight, 96);
    // Extra padding so the section heading lands below the sticky bar with
    // a comfortable gap — keeps the tab switch and the visual starting point in sync.
    const offset = stickyTopHeight + reserved + 20;

    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
  };

  // Listen to state-based pending navigation (handles timing/mount delays)
  useEffect(() => {
    if (
      pendingNavigation &&
      pendingNavigation.stepNum !== undefined &&
      (pendingNavigation.recipeId === recipe.id || pendingNavigation.recipeId === recipe.title)
    ) {
      setInitialStepOverride(pendingNavigation.stepNum - 1);
      setIsCookingMode(true);
      // Consume the navigation state
      setPendingNavigation(null);
    }
  }, [pendingNavigation, recipe.id, recipe.title, setPendingNavigation]);

  // Listen to timer click navigation events to open cooking mode at the correct step
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ recipeId: string; stepNum: number }>;
      if (
        customEvent.detail &&
        customEvent.detail.stepNum !== undefined &&
        (customEvent.detail.recipeId === recipe.id || customEvent.detail.recipeId === recipe.title)
      ) {
        setInitialStepOverride(customEvent.detail.stepNum - 1);
        setIsCookingMode(true);
      }
    };
    window.addEventListener('app:navigate-to-timer-step', handleNavigate);
    return () => window.removeEventListener('app:navigate-to-timer-step', handleNavigate);
  }, [recipe.id, recipe.title]);

  // Show ingredient nutrition state (persisted in localStorage)
  const [showIngredientNutrition, setShowIngredientNutrition] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('recipe_show_ingredient_nutrition');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Show total or per portion nutrition (persisted in localStorage)
  const [showTotalNutrition, setShowTotalNutrition] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('recipe_show_total_nutrition');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Format prep and cook time helper supporting both legacy string values and new number values
  const formatTimeValue = (time: any) => {
    if (time === undefined || time === null || time === '') return 'N/A';
    if (typeof time === 'number') {
      return t('recipe.minutes', { count: time });
    }
    const strTime = String(time).trim();
    const match = strTime.match(/\d+/);
    if (match) {
      return t('recipe.minutes', { count: match[0] });
    }
    return strTime;
  };

  // Helper to format nutrition values, optionally scaling them and appending units
  const getNutritionDisplayValue = (val: any, unit: string = 'g', isTotal: boolean = false, includeUnit: boolean = true) => {
    if (val === undefined || val === null || val === '') return '—';

    let numericVal: number;
    let originalUnit = '';

    if (typeof val === 'number') {
      numericVal = val;
    } else {
      const match = String(val).trim().match(/^([\d.,]+)\s*([a-zA-Z%]*)$/);
      if (!match) return String(val);
      numericVal = parseFloat(match[1].replace(',', '.'));
      originalUnit = match[2] || '';
      if (isNaN(numericVal)) return String(val);
    }

    if (numericVal === 0) return '—';

    // Scale value if total is requested: multiply the per-serving value by the selected servings
    const finalVal = isTotal ? numericVal * servings : numericVal;

    const displayUnit = originalUnit || unit;

    const rounded = Math.round(finalVal);

    if (includeUnit) {
      return `${rounded}${displayUnit}`;
    }
    return String(rounded);
  };

  const handleToggleTotalNutrition = (isTotal: boolean) => {
    setShowTotalNutrition(isTotal);
    try {
      localStorage.setItem('recipe_show_total_nutrition', JSON.stringify(isTotal));
    } catch (e) {
      console.error('Error saving showTotalNutrition to localStorage', e);
    }
  };

  // Cooking mode is premium-gated: free users are steered to the upsell modal.
  const handleStartCooking = () => {
    if (isPremium) {
      setIsCookingMode(true);
    } else {
      setIsPremiumModalOpen(true);
    }
  };

  const handleToggleIngredientNutrition = () => {
    // Per-ingredient nutrition is a premium feature (advertised alongside the
    // nutrition card). Free users get the upsell instead of toggling it on.
    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }
    setShowIngredientNutrition(prev => {
      const next = !prev;
      try {
        localStorage.setItem('recipe_show_ingredient_nutrition', JSON.stringify(next));
      } catch (e) {
        console.error('Error saving showIngredientNutrition to localStorage', e);
      }
      return next;
    });
  };

  // Check if at least one ingredient has nutrition values estimated/defined
  const hasIngredientNutrition = useMemo(() => {
    if (!recipe.ingredients) return false;
    return recipe.ingredients.some(group =>
      group.items.some(ing =>
        (ing.calories !== undefined && ing.calories !== null && ing.calories > 0) ||
        (ing.protein !== undefined && ing.protein !== null && ing.protein > 0) ||
        (ing.carbs !== undefined && ing.carbs !== null && ing.carbs > 0) ||
        (ing.fat !== undefined && ing.fat !== null && ing.fat > 0)
      )
    );
  }, [recipe.ingredients]);

  // Find the first uncompleted step to highlight it
  const activeStepNum = useMemo(() => {
    if (!recipe.instructions) return null;
    const activeStep = recipe.instructions.find(s => !checkedSteps[s.step]);
    return activeStep ? activeStep.step : null;
  }, [recipe.instructions, checkedSteps]);

  // Steps progress calculations
  const totalStepsCount = recipe.instructions ? recipe.instructions.length : 0;
  const completedStepsCount = useMemo(() => {
    if (!recipe.instructions) return 0;
    return recipe.instructions.filter(s => !!checkedSteps[s.step]).length;
  }, [recipe.instructions, checkedSteps]);
  const progressPercent = totalStepsCount > 0 ? (completedStepsCount / totalStepsCount) * 100 : 0;

  // Get nutritional info (either reel-level or aggregated per-ingredient AI estimates)
  const { nutritionalValues, isAiEstimated, isVerified, hasNutritionInfo } = useRecipeNutrition(recipe);

  // Prep + cook collapsed into the single figure shown in the meta strip. Both
  // fields may be legacy strings ("20 Min."), so pull the leading number out.
  const totalTimeLabel = useMemo(() => {
    const minutesOf = (time: any): number | null => {
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

  // Per-serving calories for the meta strip; the full table lives in the sheet.
  const metaCalories = useMemo(() => {
    const raw = nutritionalValues?.calories;
    if (raw === undefined || raw === null) return null;
    return raw > 0 ? Math.round(raw) : null;
  }, [nutritionalValues]);

  // Sort ingredient groups based on categoryOrder
  const sortedIngredients = useMemo(() => {
    if (!recipe.ingredients) return [];

    // Map each group to include its original index for correct checklist progress tracking
    const mapped = recipe.ingredients.map((group, originalIdx) => ({
      group,
      originalIdx
    }));

    return mapped.sort((a, b) => {
      const getCategoryIndex = (name: string) => {
        const cleanName = name.trim().toUpperCase();
        let idx = categoryOrder.indexOf(cleanName as any);
        if (idx !== -1) return idx;

        const lowerName = name.trim().toLowerCase();
        const enumKey = legacyCategoryMap[lowerName];
        if (enumKey) {
          return categoryOrder.indexOf(enumKey);
        }
        return 999;
      };

      return getCategoryIndex(a.group.name) - getCategoryIndex(b.group.name);
    });
  }, [recipe.ingredients]);

  const handleAddToShoppingList = () => {
    setShouldNavigateAfterAdd(false);
    setIsShoppingConfirmOpen(true);
  };

  const handleAddAndNavigateToShoppingList = () => {
    setShouldNavigateAfterAdd(true);
    setIsShoppingConfirmOpen(true);
  };

  const handleConfirmShoppingListSelection = (itemsToAdd: Ingredient[]) => {
    if (!onAddIngredients) return;
    if (itemsToAdd.length === 0) return;

    const recipeId = recipe.id || recipe.title;
    onAddIngredients(itemsToAdd, recipeId, recipe.title);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);

    if (shouldNavigateAfterAdd) {
      onNavigateToShoppingList?.();
    }
  };

  // Build a human-readable ingredient line, e.g. "200 g Mehl (gesiebt) (Bio)"
  const formatIngredientLine = (ing: Ingredient) => {
    const scaledAmount = formatAmount(ing.amount, ing.unit);
    const amountStr = scaledAmount ? `${scaledAmount} ` : '';
    const unitStr = ing.unit ? `${ing.unit} ` : '';
    const modifierStr = ing.modifier ? ` (${ing.modifier})` : '';
    const noteStr = ing.notes ? ` (${ing.notes})` : '';
    return `${amountStr}${unitStr}${ing.name}${modifierStr}${noteStr}`;
  };

  // Escape user-provided text so it is safe/well-formed inside the rich-text (HTML) clipboard payload
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Copy the recipe to the clipboard in two shapes at once:
  //  - text/plain: clean, readable text (no markdown symbols) for WhatsApp, notes, e-mail
  //  - text/html: real headings/bold/lists that paste formatted into Word, Google Docs, Gmail
  const copyRecipe = () => {
    const hasGroups = recipe.ingredients.length > 1;
    const metaLine = `${t('recipe.prep')}: ${formatTimeValue(recipe.prepTime)} · ${t('recipe.cook')}: ${formatTimeValue(recipe.cookTime)} · ${t('recipe.serves')}: ${servings}`;

    // --- Plain text ---
    let text = `${recipe.title}\n\n`;
    if (recipe.description) text += `${stripInlineIngredientTags(recipe.description)}\n\n`;
    text += `${metaLine}\n\n`;

    text += `${t('recipe.tabIngredients')}\n`;
    sortedIngredients.forEach(({ group }) => {
      if (hasGroups) text += `${translateCategory(group.name)}\n`;
      group.items.forEach((ing: Ingredient) => {
        text += `• ${formatIngredientLine(ing)}\n`;
      });
      if (hasGroups) text += `\n`;
    });
    if (!hasGroups) text += `\n`;

    text += `${t('recipe.tabInstructions')}\n`;
    recipe.instructions.forEach((step) => {
      text += `${step.step}. ${stripInlineIngredientTags(step.description)}\n`;
    });
    text += `\n`;

    if (recipe.equipment && recipe.equipment.length > 0) {
      text += `${t('recipe.requiredEquipment')}\n`;
      recipe.equipment.forEach((item) => {
        text += `• ${stripInlineIngredientTags(item)}\n`;
      });
      text += `\n`;
    }

    if (recipe.tips && recipe.tips.length > 0) {
      text += `${t('recipe.tipsTitle')}\n`;
      recipe.tips.forEach((tip) => {
        text += `• ${stripInlineIngredientTags(tip)}\n`;
      });
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
      group.items.forEach((ing: Ingredient) => {
        html += `<li>${escapeHtml(formatIngredientLine(ing))}</li>`;
      });
      html += `</ul>`;
    });

    html += `<h2>${escapeHtml(t('recipe.tabInstructions'))}</h2><ol>`;
    recipe.instructions.forEach((step) => {
      html += `<li>${escapeHtml(stripInlineIngredientTags(step.description))}</li>`;
    });
    html += `</ol>`;

    if (recipe.equipment && recipe.equipment.length > 0) {
      html += `<h2>${escapeHtml(t('recipe.requiredEquipment'))}</h2><ul>`;
      recipe.equipment.forEach((item) => {
        html += `<li>${escapeHtml(stripInlineIngredientTags(item))}</li>`;
      });
      html += `</ul>`;
    }

    if (recipe.tips && recipe.tips.length > 0) {
      html += `<h2>${escapeHtml(t('recipe.tipsTitle'))}</h2><ul>`;
      recipe.tips.forEach((tip) => {
        html += `<li>${escapeHtml(stripInlineIngredientTags(tip))}</li>`;
      });
      html += `</ul>`;
    }

    const markCopied = () => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    // Prefer writing both HTML + plain text; fall back to plain text where
    // ClipboardItem is unavailable (e.g. some Android WebViews).
    const writeRichText = async () => {
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
    };

    writeRichText().then(markCopied).catch(() => {
      // Last resort: plain text only
      navigator.clipboard.writeText(text).then(markCopied).catch(() => { });
    });
  };

  return (
    <article className="flex flex-col">
      {/* Recipe Title & Gallery */}
      <RecipeHeader
        recipe={recipe}
        reelUrl={reelUrl}
        createdAt={createdAt}
        onBack={onBack}
        onNavigateToShoppingList={onAddIngredients ? handleAddAndNavigateToShoppingList : onNavigateToShoppingList}
        onDelete={onDelete}
        onCopyRecipe={copyRecipe}
        isCopied={isCopied}
        isParentAvailable={isParentAvailable}
        onNavigateToRecipe={onNavigateToRecipe}
        parentRecipeTitle={parentRecipeTitle}
        onAssignCollections={onAssignCollections}
        onManageFlags={onManageFlags}
        flags={flags}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        cookRefreshKey={cookRefreshKey}
      />

      {/* Sentinel for the sticky bar's collapsed title row (see effect above). */}
      <div ref={setCollapseSentinel} aria-hidden="true" className="h-px mb-4" />

      {/* Smart Sticky Sub-navigation */}
      <RecipeStickyBar
        recipeTitle={recipe.title}
        isCollapsed={isHeaderCollapsed}
        onBack={onBack}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        totalTimeLabel={totalTimeLabel}
        servings={servings}
        calories={hasNutritionInfo ? metaCalories : null}
        isPremium={isPremium}
      />

      {/* Single scrollable layout containing all sections */}
      <div className="flex flex-col gap-8 mt-5 pb-16">
        {/* Info & Nutrition Details section */}
        <section
          id="details"
          style={{ scrollMarginTop: 'calc(var(--app-sticky-top) + 60px)' }}
        >
          <RecipeInfoSection
            prepTime={recipe.prepTime}
            cookTime={recipe.cookTime}
            formatTimeValue={formatTimeValue}
            servings={servings}
            onDecreaseServings={() => setServings(s => Math.max(1, s - 1))}
            onIncreaseServings={() => setServings(s => s + 1)}
            nutritionalValues={hasNutritionInfo ? nutritionalValues : null}
            isAiEstimated={isAiEstimated}
            isVerified={isVerified}
            showTotalNutrition={showTotalNutrition}
            onToggleTotalNutrition={handleToggleTotalNutrition}
            getNutritionDisplayValue={getNutritionDisplayValue}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Ingredients section */}
        <section
          id="ingredients"
          style={{ scrollMarginTop: 'calc(var(--app-sticky-top) + 60px)' }}
        >
          <RecipeIngredients
            recipe={recipe}
            sortedIngredients={sortedIngredients}
            showIngredientNutrition={isPremium && showIngredientNutrition}
            onToggleIngredientNutrition={handleToggleIngredientNutrition}
            hasIngredientNutrition={hasIngredientNutrition}
            isPremium={isPremium}
            scaleFactor={scaleFactor}
            formatAmount={formatAmount}
            onAddIngredients={onAddIngredients ? handleAddToShoppingList : undefined}
            isAdded={isAdded}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Instructions section */}
        <section
          id="instructions"
          style={{ scrollMarginTop: 'calc(var(--app-sticky-top) + 60px)' }}
        >
          <RecipeInstructions
            recipe={recipe}
            checkedSteps={checkedSteps}
            toggleStep={toggleStep}
            activeStepNum={activeStepNum}
            completedStepsCount={completedStepsCount}
            totalStepsCount={totalStepsCount}
            progressPercent={progressPercent}
            onStartCooking={handleStartCooking}
            formatAmount={formatAmount}
          />
        </section>

        {/* "I cooked this" — gamification CTA card with photo verification */}
        {recipe.id && (
          <div className="mt-4 mb-2">
            <CookedButton jobId={recipe.id} recipeTitle={recipe.title} variant="card" />
          </div>
        )}

        {/* Cook history timeline (count + past cooks) */}
        {recipe.id && (
          <div id="cook-history" className="mt-2 mb-2 scroll-mt-24">
            <CookHistoryTimeline history={cookHistory} />
          </div>
        )}

        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-normal select-none mt-2">
          {t('recipe.aiGeneratedDisclaimer')}
        </p>
      </div>

      {/* Unified Floating Action Dock (Bottom-Center) */}
      {!isCookingMode && (totalStepsCount > 0 || onAddIngredients || onNavigateToShoppingList) && (
        <RecipeActionDock
          totalStepsCount={totalStepsCount}
          onAddToCart={onAddIngredients ? handleAddToShoppingList : undefined}
          isAdded={isAdded}
          onStartCooking={handleStartCooking}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          onRemixClick={() => {
            if (isPremium) {
              setIsCopilotOpen(true);
            } else {
              setIsPremiumModalOpen(true);
            }
          }}
        />
      )}

      {/* Cooking Mode Fullscreen Overlay */}
      {isCookingMode && (
        <CookingMode
          recipe={recipe}
          onClose={() => {
            setIsCookingMode(false);
            setInitialStepOverride(undefined);
          }}
          checkedSteps={checkedSteps}
          toggleStep={toggleStep}
          formatAmount={formatAmount}
          initialStepOverride={initialStepOverride}
          onRemixSuccess={onRemixSuccess}
          onReplaceCurrent={onReplaceCurrent}
        />
      )}

      {/* Recipe Copilot Chatbot */}
      {recipe.id && onRemixSuccess && (
        <RecipeCopilot
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          recipe={recipe}
          onRemixSuccess={onRemixSuccess}
          onReplaceCurrent={onReplaceCurrent!}
        />
      )}

      {/* Premium Upgrade Modal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />

      {/* Shopping Confirm Drawer */}
      <ShoppingConfirmSheet
        isOpen={isShoppingConfirmOpen}
        onClose={() => setIsShoppingConfirmOpen(false)}
        recipe={recipe}
        sortedIngredients={sortedIngredients}
        scaleFactor={scaleFactor}
        formatAmount={formatAmount}
        onConfirm={handleConfirmShoppingListSelection}
      />
    </article>
  );
}
