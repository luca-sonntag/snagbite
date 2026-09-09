import { useState, useEffect } from 'react';
import { Globe, Clock, Eye, Check } from 'lucide-react';
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
}

export default function PublicRecipeRecommendationsShelf({
  onRecipeSaved,
}: PublicRecipeRecommendationsShelfProps) {
  const { t } = useI18n();
  const { getAccessToken } = useAuth();
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPreviewRecipe, setSelectedPreviewRecipe] = useState<Recipe | null>(null);

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
    if (savedIds.has(recipe.id)) {
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
          const isSaved = recipe.id ? savedIds.has(recipe.id) : false;
          const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0];
          const calories = getRecipeCalories(recipe);
          const caloriesFormatted = formatCalories(calories);

          return (
            <div
              key={recipe.id}
              onClick={() => handleCardClick(recipe)}
              className="w-[10rem] shrink-0 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none select-none cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="relative w-full aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
                <CachedImage
                  src={imageUrl}
                  emoji={recipe.emoji}
                  alt={recipe.title}
                  className="w-full h-full object-cover object-center pointer-events-none select-none"
                />
                <div className="absolute top-2 left-2 p-1 rounded-md bg-black/50 backdrop-blur-xs text-white">
                  <Globe className="w-3 h-3" />
                </div>
              </div>

              <div className="flex flex-col gap-1 p-2.5 flex-1 justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {recipe.title}
                  </h4>
                  {(timeDisplay || caloriesFormatted || (recipe.servings && recipe.servings > 0)) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-1">
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
                        <span className="truncate">{caloriesFormatted}</span>
                      ) : recipe.servings && recipe.servings > 0 ? (
                        <span className="shrink-0">{recipe.servings} Port.</span>
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
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{t('catalog.publicDiscovery.savedAction')}</span>
                    </>
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
        isSaved={selectedPreviewRecipe?.id ? savedIds.has(selectedPreviewRecipe.id) : false}
        onSave={handleSavePreviewRecipe}
        onOpenRecipe={(id) => {
          window.location.hash = `/recipe/${id}`;
        }}
      />
    </section>
  );
}
