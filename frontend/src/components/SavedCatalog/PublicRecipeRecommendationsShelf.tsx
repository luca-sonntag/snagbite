import { useState, useEffect } from 'react';
import { Globe, Clock, Check } from 'lucide-react';
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
    <section className="relative -mx-4 md:-mx-6 px-4 md:px-6 py-6 my-2 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-xl shadow-emerald-950/20 flex flex-col gap-3">
      {/* Decorative Wave Currents & Ambient Light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-56 h-56 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

      {/* Subtle Animated Wave Ribbon in Section Background */}
      <svg
        className="absolute -bottom-1 inset-x-0 w-full h-12 opacity-15 pointer-events-none animate-wave-drift-1 fill-white"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,18 C240,42 480,-4 720,24 C960,48 1080,10 1200,18 L1200,60 L0,60 Z" />
      </svg>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-0.5">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/15 text-emerald-200 backdrop-blur-md shrink-0 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight truncate">
              {t('catalog.publicDiscovery.title')}
            </h3>
          </div>
          <p className="text-xs text-emerald-200/80 font-medium mt-1">
            {t('catalog.publicDiscovery.subtitle')}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1 scroll-smooth">
        {recommendations.map((recipe, index) => {
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
              className="w-40 shrink-0 flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 border-none group cursor-pointer active:scale-[0.97] transition-transform"
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
                {isSaved && (
                  <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-xs">
                    <Check className="w-3 h-3" />
                    <span>{t('catalog.publicDiscovery.savedAction')}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 flex flex-col justify-between flex-1 gap-1">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                  {recipe.title}
                </h4>
                {(timeDisplay || caloriesFormatted || (recipe.servings && recipe.servings > 0)) && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium truncate mt-0.5">
                    {timeDisplay && (
                      <span className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                        <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{timeDisplay}</span>
                      </span>
                    )}
                    {caloriesFormatted ? (
                      <span className="truncate px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                        {caloriesFormatted}
                      </span>
                    ) : recipe.servings && recipe.servings > 0 ? (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                        {recipe.servings} Port.
                      </span>
                    ) : null}
                  </div>
                )}
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
