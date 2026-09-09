import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Plus, Check, Loader2, ChefHat, ExternalLink } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useRecipeScaling } from '../../hooks/useRecipeScaling';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import PreviewIngredientsList from './PreviewIngredientsList';
import PreviewNutritionRow from './PreviewNutritionRow';

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
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const scaling = useRecipeScaling(recipe || ({} as Recipe));

  if (!isOpen || !recipe) return null;

  const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const timeDisplay = totalMin > 0 ? `${totalMin} Min.` : null;
  const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0] || null;

  const calories =
    recipe.nutritionalValues?.calories ?? recipe.sourceNutritionalValues?.calories ?? null;
  const protein =
    recipe.nutritionalValues?.protein ?? recipe.sourceNutritionalValues?.protein ?? null;
  const carbs =
    recipe.nutritionalValues?.carbs ?? recipe.sourceNutritionalValues?.carbs ?? null;
  const fat =
    recipe.nutritionalValues?.fat ?? recipe.sourceNutritionalValues?.fat ?? null;
  const hasNutrition = calories !== null || protein !== null || carbs !== null || fat !== null;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] max-w-lg max-h-[85vh] rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col border-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media / Hero Header */}
        <div className="relative w-full aspect-[16/10] bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover object-center pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <ChefHat className="w-14 h-14 opacity-40" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Close Floating Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md active:scale-95 transition-all border-none cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Meta Badges on Hero */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 flex-wrap pointer-events-none">
            {timeDisplay && (
              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm ring-1 ring-white/15">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{timeDisplay}</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm ring-1 ring-white/15">
              <span>
                {scaling.servings} {scaling.servings === 1 ? t('recipe.serves') : t('recipe.serves')}
              </span>
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
          <div className="flex flex-col gap-1">
            <h3
              id="preview-modal-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug"
            >
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Nutrition Summary Strip */}
          {hasNutrition && (
            <PreviewNutritionRow
              calories={calories}
              protein={protein}
              carbs={carbs}
              fat={fat}
            />
          )}

          {/* Ingredients Section */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <PreviewIngredientsList
              ingredients={recipe.ingredients}
              servings={scaling.servings}
              onDecreaseServings={() => scaling.setServings((s) => Math.max(1, s - 1))}
              onIncreaseServings={() => scaling.setServings((s) => s + 1)}
              formatAmount={scaling.formatAmount}
            />
          )}
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
