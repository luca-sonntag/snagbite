import { useState, useEffect } from 'react';
import { Globe, Clock, Plus, Check } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { fetchPublicRecipeRecommendations, savePublicRecipeToCookbook } from '../../api/publicRecipesApi';

interface PublicRecipeRecommendationsShelfProps {
  onRecipeSaved: (savedId: string) => void;
}

export default function PublicRecipeRecommendationsShelf({
  onRecipeSaved,
}: PublicRecipeRecommendationsShelfProps) {
  const { language } = useI18n();
  const { getAccessToken } = useAuth();
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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

  const handleSave = async (recipe: Recipe) => {
    if (!recipe.id || savingIds.has(recipe.id) || savedIds.has(recipe.id)) return;
    hapticLight();
    setSavingIds((prev) => new Set(prev).add(recipe.id!));

    try {
      await savePublicRecipeToCookbook(recipe.id, getAccessToken);
      hapticMedium();
      setSavedIds((prev) => new Set(prev).add(recipe.id!));
      onRecipeSaved(recipe.id);
    } catch (err) {
      console.error('[PublicRecipeRecommendationsShelf] Save failed:', err);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(recipe.id!);
        return next;
      });
    }
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex flex-col min-w-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
            {language === 'de' ? 'Öffentliche Entdeckungen' : 'Community Discoveries'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
            {language === 'de' ? 'Ausgewählte Rezepte für dein Kochbuch' : 'Curated recipes for your cookbook'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
        {recommendations.map((recipe) => {
          const totalMin = (recipe.prepTime || 0) + (recipe.cookTime || 0);
          const timeDisplay = totalMin > 0 ? totalMin + ' Min.' : null;
          const isSaved = recipe.id ? savedIds.has(recipe.id) : false;
          const isSaving = recipe.id ? savingIds.has(recipe.id) : false;
          const imageUrl = recipe.imageUrl || recipe.imageUrls?.[0];

          return (
            <div
              key={recipe.id}
              className="w-[10rem] shrink-0 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none select-none"
            >
              <div className="relative w-full aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover object-center pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {recipe.emoji || '🍲'}
                  </div>
                )}
                <div className="absolute top-2 left-2 p-1 rounded-md bg-black/50 backdrop-blur-xs text-white">
                  <Globe className="w-3 h-3" />
                </div>
              </div>

              <div className="flex flex-col gap-1 p-2.5 flex-1 justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {recipe.title}
                  </h4>
                  {timeDisplay && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                      {timeDisplay}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(recipe)}
                  disabled={isSaved || isSaving}
                  className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border-none outline-none cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'de' ? 'Gespeichert' : 'Saved'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'de' ? 'Speichern' : 'Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
