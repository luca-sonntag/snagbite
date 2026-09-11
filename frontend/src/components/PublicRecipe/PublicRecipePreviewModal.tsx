import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, Loader2, ExternalLink } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useRecipeScaling } from '../../hooks/useRecipeScaling';
import { useRecipeNutrition } from '../../hooks/useRecipeNutrition';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { useModalOverlay } from '../../context/OverlayStackContext';
import RecipeInfoSection from '../RecipeDetails/RecipeInfoSection';
import PreviewHeroHeader from './PreviewHeroHeader';
import PreviewIngredientsCard from './PreviewIngredientsCard';

export interface PublicRecipePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  isSaved?: boolean;
  onSave: (recipe: Recipe) => Promise<void> | void;
  onOpenRecipe?: (recipeId: string) => void;
}

export const PublicRecipePreviewModal: React.FC<PublicRecipePreviewModalProps> = ({
  isOpen,
  onClose,
  recipe,
  isSaved = false,
  onSave,
  onOpenRecipe,
}) => {
  const { t, language } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const [showTotalNutrition, setShowTotalNutrition] = useState(false);

  // Register with overlay stack to lock body scroll and hide AdMob banners while open
  useModalOverlay(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const scaling = useRecipeScaling(recipe || ({} as Recipe));
  const { servings, scaleFactor, formatAmount } = scaling;

  const {
    nutritionalValues,
    sourceNutritionalValues,
    isAiEstimated,
    isVerified,
    hasNutritionInfo,
  } = useRecipeNutrition(recipe || ({} as Recipe));

  const formatTimeValue = useCallback(
    (time: string | number | null | undefined) => {
      if (time === undefined || time === null || time === '') return '—';
      if (typeof time === 'number') return t('recipe.minutes', { count: time });
      const strTime = String(time).trim();
      const match = strTime.match(/\d+/);
      if (match) return t('recipe.minutes', { count: match[0] });
      return strTime;
    },
    [t]
  );

  const getNutritionDisplayValue = useCallback(
    (
      val: string | number | null | undefined,
      unit: string = 'g',
      isTotal: boolean = false,
      includeUnit: boolean = true
    ) => {
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
      const finalVal = isTotal ? numericVal * servings : numericVal;
      return includeUnit
        ? `${Math.round(finalVal)}${originalUnit || unit}`
        : String(Math.round(finalVal));
    },
    [servings]
  );

  if (!isOpen || !recipe) return null;

  const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0] || null;

  const handleActionClick = async () => {
    if (isSaving) return;
    if (isSaved) {
      hapticLight();
      if (recipe.id && onOpenRecipe) {
        onOpenRecipe(recipe.id);
      } else if (recipe.id) {
        window.location.hash = `/recipe/${recipe.id}`;
      }
      onClose();
      return;
    }

    hapticLight();
    setIsSaving(true);
    try {
      await onSave(recipe);
      hapticMedium();
      onClose();
    } catch (err) {
      console.error('[PublicRecipePreviewModal] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 pt-[calc(var(--safe-area-inset-top,0px)+1.25rem)] pb-[calc(var(--safe-area-inset-bottom,0px)+1.25rem)] bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] sm:w-[440px] max-w-[440px] max-h-[calc(100dvh-var(--safe-area-inset-top,0px)-var(--safe-area-inset-bottom,0px)-3.5rem)] sm:max-h-[85vh] rounded-3xl bg-gray-50 dark:bg-gray-950 shadow-2xl overflow-hidden flex flex-col border-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
          <PreviewHeroHeader
            imageUrl={imageUrl}
            title={recipe.title}
            sourceUrl={recipe.sourceUrl}
            onClose={onClose}
          />

          <div className="p-4 sm:p-5 flex flex-col gap-4">
            {/* Title & Metadata */}
            <div className="flex flex-col gap-1.5">
              {recipe.sourceHandle && (
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 select-none leading-none">
                  {recipe.sourceHandle}
                </div>
              )}
              <h2
                id="preview-modal-title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight break-words"
              >
                {recipe.title}
              </h2>
              {recipe.description && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed break-words">
                  {recipe.description}
                </p>
              )}
              {recipe.category && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-1.5 min-h-[34px] rounded-full select-none inline-flex items-center gap-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border-none">
                    <span className="text-base leading-none">
                      {getRecipeCategoryEmoji(recipe.category)}
                    </span>
                    <span>{getRecipeCategoryLabel(recipe.category, language)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Metrics Row & Nutrition Card (RecipeDetails Info Section) */}
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
              onToggleTotalNutrition={setShowTotalNutrition}
              getNutritionDisplayValue={getNutritionDisplayValue}
            />

            {/* Ingredients Card (RecipeDetails Ingredients Card) */}
            <PreviewIngredientsCard
              recipe={recipe}
              servings={servings}
              scaleFactor={scaleFactor}
              formatAmount={formatAmount}
            />
          </div>
        </div>

        {/* Sticky Action Dock */}
        <div className="shrink-0 p-4 pt-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={handleActionClick}
            disabled={isSaving}
            className={`w-full min-h-[48px] px-4 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-200 ease-out active:scale-[0.98] select-none cursor-pointer border-none shadow-sm ${
              isSaved
                ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                : isSaving
                ? 'bg-emerald-600 text-white opacity-80 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{t('recipe.preview.savingAction')}</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                <span>{t('recipe.preview.alreadySavedAction')}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{t('recipe.preview.saveAction')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PublicRecipePreviewModal;
