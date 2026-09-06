import React, { useState, useEffect } from 'react';
import { Clock, ChefHat } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { InstagramIcon } from '../ShareMockups';
import { hapticLight } from '../../utils/haptics';
import { fetchPublicDemoRecipes } from '../../api/publicRecipesApi';
import type { Recipe } from '../../types';
import type { ExtractDemoRecipesProps } from './types';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

export const ExtractDemoRecipes: React.FC<ExtractDemoRecipesProps> = ({ onDemoClick }) => {
  const { t, language } = useI18n();
  const { getAccessToken } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white">{t('form.demoTitle')}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {recipes.map((recipe, idx) => {
          const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          const timeDisplay = totalMin > 0 ? totalMin + ' Min.' : '15 Min.';
          const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0] || '';
          const isTikTok = recipe.sourceUrl?.includes('tiktok');
          const isInstagram = recipe.sourceUrl?.includes('instagram');

          return (
            <div
              key={recipe.id || idx}
              onClick={() => {
                hapticLight();
                onDemoClick(recipe.sourceUrl || '', recipe);
              }}
              className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all select-none flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none group"
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
              </div>

              <div className="flex flex-col gap-1 p-3 flex-1">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {recipe.title}
                </h4>
                <div className="mt-auto pt-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                    {timeDisplay}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {language === 'de' ? 'Speichern →' : 'Save →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ExtractDemoRecipes;
