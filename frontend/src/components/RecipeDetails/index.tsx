import type { RecipeDetailsProps } from './types';
import { useRecipeDetails } from './useRecipeDetails';

import RecipeHeader from './RecipeHeader';
import RecipeInfoSection from './RecipeInfoSection';
import RecipeStickyBar from './RecipeStickyBar';
import RecipeIngredients from './RecipeIngredients';
import RecipeInstructions from './RecipeInstructions';
import RecipeActionDock from './RecipeActionDock';
import CookingMode from '../CookingMode';
import CookedButton from '../CookedButton';
import CookedModal from '../CookedModal';
import CookHistoryTimeline from '../CookHistoryTimeline';
import RecipeCopilot from './RecipeCopilot';
import PremiumModal from '../PremiumModal';
import ShoppingConfirmSheet from './ShoppingConfirmSheet';
import AddToMealPlanSheet from '../MealPlanner/AddToMealPlanSheet';
import { useI18n } from '../../context/I18nContext';

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
  onToggleFavorite,
}: RecipeDetailsProps) {
  const { t } = useI18n();

  const {
    isPremium,
    isPremiumModalOpen,
    setIsPremiumModalOpen,
    servings,
    setServings,
    scaleFactor,
    formatAmount,
    checkedSteps,
    toggleStep,
    handleToggleStep,
    activeStepNum,
    totalStepsCount,
    completedStepsCount,
    progressPercent,
    activeSection,
    isHeaderCollapsed,
    setCollapseSentinel,
    scrollToSection,
    nutritionalValues,
    sourceNutritionalValues,
    isAiEstimated,
    isVerified,
    hasNutritionInfo,
    showTotalNutrition,
    handleToggleTotalNutrition,
    formatTimeValue,
    getNutritionDisplayValue,
    totalTimeLabel,
    metaCalories,
    sortedIngredients,
    isCopied,
    isCopilotOpen,
    setIsCopilotOpen,
    isCookingMode,
    setIsCookingMode,
    initialStepOverride,
    setInitialStepOverride,
    isCookedModalOpen,
    setIsCookedModalOpen,
    isAdded,
    isShoppingConfirmOpen,
    setIsShoppingConfirmOpen,
    isAddToPlanOpen,
    setIsAddToPlanOpen,
    handleStartCooking,
    handleAddToShoppingList,
    handleAddAndNavigateToShoppingList,
    handleConfirmShoppingListSelection,
    copyRecipe,
    cookRefreshKey,
    cookHistory,
  } = useRecipeDetails({ recipe, onAddIngredients, onNavigateToShoppingList });

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
        onRemixClick={() => {
          if (isPremium) {
            setIsCopilotOpen(true);
          } else {
            setIsPremiumModalOpen(true);
          }
        }}
      />

      {/* Sentinel for the sticky bar's collapsed title row */}
      <div ref={setCollapseSentinel} aria-hidden="true" className="h-px mb-4" />

      {/* Smart Sticky Sub-navigation */}
      <RecipeStickyBar
        recipeTitle={recipe.title}
        imageUrl={recipe.imageUrl}
        emoji={recipe.emoji}
        isCollapsed={isHeaderCollapsed}
        onBack={onBack}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        totalTimeLabel={totalTimeLabel}
        servings={servings}
        calories={hasNutritionInfo ? metaCalories : null}
      />

      {/* Single scrollable layout containing all sections */}
      <div className="flex flex-col gap-8 mt-5 pb-16">
        {/* Info & Nutrition Details section */}
        <section id="details" style={{ scrollMarginTop: 'calc(var(--app-sticky-top) + 60px)' }}>
          <RecipeInfoSection
            prepTime={recipe.prepTime}
            cookTime={recipe.cookTime}
            formatTimeValue={formatTimeValue}
            servings={servings}
            nutritionalValues={hasNutritionInfo ? nutritionalValues : null}
            sourceNutritionalValues={sourceNutritionalValues}
            isAiEstimated={isAiEstimated}
            isVerified={isVerified}
            showTotalNutrition={showTotalNutrition}
            onToggleTotalNutrition={handleToggleTotalNutrition}
            getNutritionDisplayValue={getNutritionDisplayValue}
          />
        </section>

        {/* Ingredients section */}
        <section id="ingredients" style={{ scrollMarginTop: 'calc(var(--app-sticky-top) + 60px)' }}>
          <RecipeIngredients
            recipe={recipe}
            sortedIngredients={sortedIngredients}
            isPremium={isPremium}
            scaleFactor={scaleFactor}
            formatAmount={formatAmount}
            onAddIngredients={onAddIngredients ? handleAddToShoppingList : undefined}
            isAdded={isAdded}
            servings={servings}
            onDecreaseServings={() => setServings(s => Math.max(1, s - 1))}
            onIncreaseServings={() => setServings(s => s + 1)}
          />
        </section>

        {/* Instructions section */}
        <section id="instructions" style={{ scrollMarginTop: 'calc(var(--app-sticky-top) + 60px)' }}>
          <RecipeInstructions
            recipe={recipe}
            checkedSteps={checkedSteps}
            toggleStep={handleToggleStep}
            activeStepNum={activeStepNum}
            completedStepsCount={completedStepsCount}
            totalStepsCount={totalStepsCount}
            progressPercent={progressPercent}
            onStartCooking={handleStartCooking}
            formatAmount={formatAmount}
          />
        </section>

        {/* "I cooked this" — gamification CTA card */}
        {recipe.id && (
          <div className="mt-4 mb-2">
            <CookedButton recipeId={recipe.id} recipeTitle={recipe.title} variant="card" />
          </div>
        )}

        {/* Cook history timeline */}
        {recipe.id && (
          <div id="cook-history" className="mt-2 mb-2 scroll-mt-24">
            <CookHistoryTimeline history={cookHistory} />
          </div>
        )}

        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-normal select-none mt-2">
          {t('recipe.aiGeneratedDisclaimer')}
        </p>
      </div>

      {/* Unified Floating Action Dock */}
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
          onPlanClick={() => setIsAddToPlanOpen(true)}
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

      {/* Add To Meal Plan Drawer */}
      {recipe.id && (
        <AddToMealPlanSheet
          isOpen={isAddToPlanOpen}
          onClose={() => setIsAddToPlanOpen(false)}
          recipeId={recipe.id}
          recipe={recipe}
          initialServings={servings}
        />
      )}

      {/* Cooked Modal */}
      {recipe.id && (
        <CookedModal
          isOpen={isCookedModalOpen}
          onClose={() => setIsCookedModalOpen(false)}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
        />
      )}
    </article>
  );
}
