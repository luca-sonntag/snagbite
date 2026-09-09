import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Check, Eye } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { fetchPublicDemoRecipes } from '../../api/publicRecipesApi';
import { PublicRecipePreviewModal } from '../PublicRecipe';
import type { Recipe } from '../../types';
import type { ExtractDemoRecipesProps } from './types';

export const ExtractDemoRecipes: React.FC<ExtractDemoRecipesProps> = ({ onDemoClick, className = '' }) => {
  const { t } = useI18n();
  const { getAccessToken } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedPreviewRecipe, setSelectedPreviewRecipe] = useState<Recipe | null>(null);

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
    if (savedIds.has(recipe.id)) {
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
          const timeDisplay = totalMin > 0 ? totalMin + ' Min.' : '15 Min.';
          const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0] || '';
          const isSaved = recipe.id ? savedIds.has(recipe.id) : false;

          return (
            <div
              key={recipe.id || idx}
              onClick={() => handleCardClick(recipe)}
              className={`rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200 ease-out select-none flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none group ${
                isSaved ? 'ring-1 ring-emerald-500/30 dark:ring-emerald-400/30' : ''
              }`}
            >
              <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ChefHat className="w-8 h-8 opacity-40" />
                  </div>
                )}
                {/* Subtle bottom vignette for natural badge contrast */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-black/55 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1 shadow-sm ring-1 ring-white/15 pointer-events-none">
                  <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">{timeDisplay}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-3 flex-1 justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[2rem] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {recipe.title}
                </h4>

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
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                      <span className="whitespace-nowrap">{t('form.demoSavedAction')}</span>
                    </>
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
        isSaved={selectedPreviewRecipe?.id ? savedIds.has(selectedPreviewRecipe.id) : false}
        onSave={handleSavePreviewRecipe}
      />
    </div>
  );
};

export default ExtractDemoRecipes;
