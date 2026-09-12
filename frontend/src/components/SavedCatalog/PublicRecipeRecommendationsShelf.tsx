import { useState, useEffect } from 'react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { fetchPublicRecipeRecommendations, savePublicRecipeToCookbook } from '../../api/publicRecipesApi';
import RecipePosterCard from './RecipePosterCard';
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
    <section className="space-y-3 pt-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight font-heading">
            {t('catalog.publicDiscovery.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('catalog.publicDiscovery.subtitle')}
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[11px] font-bold shrink-0 self-center">
          {t('catalog.publicDiscovery.badge')}
        </span>
      </div>

      {/* Horizontal Recipe Shelf */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {recommendations.map((recipe, index) => {
          const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          const timeDisplay = totalMin > 0 ? `${totalMin} Min.` : null;
          const isSaved = checkIsSaved(recipe.id);

          return (
            <RecipePosterCard
              key={recipe.id || index}
              recipe={recipe}
              variant="shelf"
              totalTime={timeDisplay}
              isSaved={isSaved}
              onClick={() => handleCardClick(recipe)}
            />
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
