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
    <section className="relative p-4 sm:p-5 my-5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/[0.08] via-teal-500/[0.05] to-emerald-500/[0.02] dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-transparent ring-1 ring-emerald-500/20 dark:ring-emerald-500/20 flex flex-col gap-3.5 shadow-xs">
      {/* Soft ambient mint glow in background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-0.5">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0 flex items-center justify-center shadow-xs">
              <Globe className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-950 dark:text-white tracking-tight truncate">
              {t('catalog.publicDiscovery.title')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {t('catalog.publicDiscovery.subtitle')}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0 self-center">
          {t('catalog.publicDiscovery.badge')}
        </span>
      </div>

      <div className="relative z-10 flex items-stretch gap-3 overflow-x-auto scrollbar-none -mx-4 sm:-mx-5 px-4 sm:px-5 py-1 scroll-smooth">
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
              className="w-40 shrink-0 flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 border-none group cursor-pointer active:scale-[0.96] transition-transform duration-150 ease-out select-none"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
                <CachedImage
                  src={imageUrl}
                  emoji={recipe.emoji}
                  alt={recipe.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                />
                {isSaved && (
                  <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-xs">
                    <Check className="w-3 h-3" />
                    <span>{t('catalog.publicDiscovery.savedAction')}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col p-2.5 sm:p-3 flex-1 justify-start gap-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                  {recipe.title}
                </h4>
                {(timeDisplay || caloriesFormatted || (recipe.servings && recipe.servings > 0)) && (
                  <div className="flex items-center gap-1 text-[11px] font-medium mt-1">
                    {timeDisplay && (
                      <span className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                        <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{timeDisplay}</span>
                      </span>
                    )}
                    {caloriesFormatted ? (
                      <span className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                        {caloriesFormatted}
                      </span>
                    ) : recipe.servings && recipe.servings > 0 ? (
                      <span className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
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
