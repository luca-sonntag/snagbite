import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Eye } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { fetchPublicDemoRecipes } from '../../api/publicRecipesApi';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import CachedImage from '../CachedImage';
import PublicRecipePreviewModal from '../PublicRecipe/PublicRecipePreviewModal';
import type { Recipe } from '../../types';
import type { ExtractDemoRecipesProps } from './types';

export const ExtractDemoRecipes: React.FC<ExtractDemoRecipesProps> = ({
  onDemoClick,
  savedRecipeIds,
  className = '',
}) => {
  const { t } = useI18n();
  const { getAccessToken } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedPreviewRecipe, setSelectedPreviewRecipe] = useState<Recipe | null>(null);

  const checkIsSaved = (recipeId?: string) => {
    if (!recipeId) return false;
    return savedIds.has(recipeId) || (savedRecipeIds?.has(recipeId) ?? false);
  };

  useEffect(() => {
    let cancelled = false;
    const loadDemoRecipes = async () => {
      try {
        const fetched = await fetchPublicDemoRecipes(getAccessToken);
        if (!cancelled && fetched.length > 0) {
          setRecipes(fetched);
        }
      } catch (err) {
        console.warn('[ExtractDemoRecipes] Failed to fetch dynamic demo recipes:', err);
      }
    };

    loadDemoRecipes();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  if (recipes.length === 0) {
    return null;
  }

  const handleCardClick = (recipe: Recipe) => {
    if (!recipe.id) return;
    hapticLight();
    if (checkIsSaved(recipe.id)) {
      window.location.hash = `/recipe/${recipe.id}`;
      return;
    }
    setSelectedPreviewRecipe(recipe);
  };

  const handleSavePreviewRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return;
    await onDemoClick(recipe.sourceUrl || '', recipe);
    setSavedIds((prev) => new Set(prev).add(recipe.id!));
    hapticMedium();
  };

  return (
    <div className={`flex flex-col gap-2.5 pt-3 ${className}`}>
      <div className="flex flex-col px-1 gap-0.5">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white">{t('form.demoTitle')}</h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
          {t('form.demoSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {recipes.map((recipe, idx) => {
          const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          const timeDisplay = totalMin > 0 ? `${totalMin} Min.` : null;
          const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0] || '';
          const isSaved = checkIsSaved(recipe.id);
          const calories = getRecipeCalories(recipe);
          const caloriesFormatted = formatCalories(calories);

          return (
            <div
              key={recipe.id || idx}
              onClick={() => handleCardClick(recipe)}
              className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200 ease-out select-none flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none group"
            >
              <div className="relative w-full aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
                <CachedImage
                  src={imageUrl}
                  emoji={recipe.emoji}
                  alt={recipe.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  fallbackComponent={
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ChefHat className="w-8 h-8 opacity-40" />
                    </div>
                  }
                />
              </div>

              <div className="flex flex-col gap-2.5 p-3 flex-1 justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {recipe.title}
                  </h4>
                  {(timeDisplay || caloriesFormatted || (recipe.servings && recipe.servings > 0)) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-1">
                      {timeDisplay && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{timeDisplay}</span>
                        </span>
                      )}
                      {timeDisplay && (caloriesFormatted || (recipe.servings && recipe.servings > 0)) && (
                        <span className="text-gray-300 dark:text-gray-600 shrink-0">·</span>
                      )}
                      {caloriesFormatted ? (
                        <span className="shrink-0 whitespace-nowrap">{caloriesFormatted}</span>
                      ) : recipe.servings && recipe.servings > 0 ? (
                        <span className="shrink-0 whitespace-nowrap">{recipe.servings} Port.</span>
                      ) : null}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(recipe);
                  }}
                  className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.97] select-none cursor-pointer border-none ${
                    isSaved
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-xs'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/15 active:bg-emerald-500/25 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {isSaved ? (
                    <span className="whitespace-nowrap">{t('form.demoSavedAction')}</span>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                      <span className="whitespace-nowrap">{t('form.demoViewAction')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <PublicRecipePreviewModal
        isOpen={Boolean(selectedPreviewRecipe)}
        onClose={() => setSelectedPreviewRecipe(null)}
        recipe={selectedPreviewRecipe}
        isSaved={checkIsSaved(selectedPreviewRecipe?.id)}
        onSave={handleSavePreviewRecipe}
      />
    </div>
  );
};

export default ExtractDemoRecipes;
