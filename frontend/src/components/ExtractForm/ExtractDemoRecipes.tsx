import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Check, Loader2, Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { InstagramIcon } from '../ShareMockups';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { fetchPublicDemoRecipes } from '../../api/publicRecipesApi';
import type { Recipe } from '../../types';
import type { ExtractDemoRecipesProps } from './types';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

export const ExtractDemoRecipes: React.FC<ExtractDemoRecipesProps> = ({ onDemoClick }) => {
  const { t } = useI18n();
  const { getAccessToken } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

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

  const handleCardClick = async (recipe: Recipe) => {
    if (!recipe.id) return;
    const isSaved = savedIds.has(recipe.id);
    const isSaving = savingIds.has(recipe.id);

    if (isSaving) return;

    if (isSaved) {
      hapticLight();
      window.location.hash = `/recipe/${recipe.id}`;
      return;
    }

    hapticLight();
    setSavingIds((prev) => new Set(prev).add(recipe.id!));
    try {
      await onDemoClick(recipe.sourceUrl || '', recipe);
      setSavedIds((prev) => new Set(prev).add(recipe.id!));
      hapticMedium();
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(recipe.id!);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
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
          const isTikTok = recipe.sourceUrl?.includes('tiktok');
          const isInstagram = recipe.sourceUrl?.includes('instagram');
          const isSaved = recipe.id ? savedIds.has(recipe.id) : false;
          const isSaving = recipe.id ? savingIds.has(recipe.id) : false;

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
                <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/45 backdrop-blur-md text-white">
                  {isTikTok ? (
                    <TikTokIcon className="w-3.5 h-3.5" />
                  ) : isInstagram ? (
                    <InstagramIcon className="w-3.5 h-3.5" />
                  ) : (
                    <ChefHat className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1 shadow-xs pointer-events-none">
                  <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">{timeDisplay}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-3 flex-1 justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {recipe.title}
                </h4>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(recipe);
                  }}
                  disabled={isSaving}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.97] select-none cursor-pointer ${
                    isSaved
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-xs'
                      : isSaving
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 opacity-80 cursor-wait'
                      : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)]'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="whitespace-nowrap">{t('form.demoSavingAction')}</span>
                    </>
                  ) : isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                      <span className="whitespace-nowrap">{t('form.demoSavedAction')}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                      <span className="whitespace-nowrap">{t('form.demoSaveAction')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExtractDemoRecipes;
