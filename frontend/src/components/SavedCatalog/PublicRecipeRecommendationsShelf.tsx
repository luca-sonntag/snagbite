import { useState, useEffect } from 'react';
import { Globe, Clock, Eye } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { fetchPublicRecipeRecommendations, savePublicRecipeToCookbook } from '../../api/publicRecipesApi';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import CachedImage from '../CachedImage';
import PublicRecipePreviewModal from '../PublicRecipe/PublicRecipePreviewModal';
interface PublicRecipeRecommendationsShelfProps {
  onRecipeSaved: (savedId: string) => void;
  savedRecipeIds?: Set<string>;
}

export default function PublicRecipeRecommendationsShelf({
  onRecipeSaved,
  savedRecipeIds,
}: PublicRecipeRecommendationsShelfProps) {
  const { t } = useI18n();
  const { getAccessToken } = useAuth();
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPreviewRecipe, setSelectedPreviewRecipe] = useState<Recipe | null>(null);

  const checkIsSaved = (recipeId?: string) => {
    if (!recipeId) return false;
    return savedIds.has(recipeId) || (savedRecipeIds?.has(recipeId) ?? false);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const items = await fetchPublicRecipeRecommendations(getAccessToken, 6);
        if (!cancelled && items.length > 0) {
          setRecommendations(items);
        }
      } catch (err) {
        console.warn('[PublicRecipeRecommendationsShelf] Error loading recommendations:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  if (loading || recommendations.length === 0) return null;

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
    try {
      await savePublicRecipeToCookbook(recipe.id, getAccessToken);
      hapticMedium();
      setSavedIds((prev) => new Set(prev).add(recipe.id!));
      onRecipeSaved(recipe.id);
      window.location.hash = `/recipe/${recipe.id}`;
    } catch (err) {
      console.error('[PublicRecipeRecommendationsShelf] Save failed:', err);
      throw err;
    }
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex flex-col min-w-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
            {t('catalog.publicDiscovery.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
            {t('catalog.publicDiscovery.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
        {recommendations.map((recipe) => {
          const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          const timeDisplay = totalMin > 0 ? `${totalMin} Min.` : null;
          const isSaved = checkIsSaved(recipe.id);
          const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0];
          const calories = getRecipeCalories(recipe);
          const caloriesFormatted = formatCalories(calories);

          return (
            <div
              key={recipe.id || index}
              onClick={() => handleCardClick(recipe)}
              className="w-44 shrink-0 flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 border-none group cursor-pointer active:scale-[0.98] transition-transform"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <CachedImage
                  src={imageUrl}
                  emoji={recipe.emoji}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                />
                <div className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-black/40 backdrop-blur-md text-white">
                  <Globe className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {recipe.title}
                  </h4>
                  {(timeDisplay || caloriesFormatted || (recipe.servings && recipe.servings > 0)) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium truncate mt-1">
                      {timeDisplay && (
                        <span className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                          <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{timeDisplay}</span>
                        </span>
                      )}
                      {caloriesFormatted ? (
                        <span className="truncate px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                          {caloriesFormatted}
                        </span>
                      ) : recipe.servings && recipe.servings > 0 ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                          {recipe.servings} Port.
                        </span>
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
                  className={`mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border-none outline-none ${
                    isSaved
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isSaved ? (
                    <span>{t('catalog.publicDiscovery.savedAction')}</span>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('catalog.publicDiscovery.viewAction')}</span>
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
        onOpenRecipe={(id) => {
          window.location.hash = `/recipe/${id}`;
        }}
      />
    </section>
  );
}
