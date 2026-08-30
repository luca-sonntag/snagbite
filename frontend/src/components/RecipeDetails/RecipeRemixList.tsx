import { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, Clock } from 'lucide-react';
import { apiUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import CachedImage from '../CachedImage';
import type { Recipe } from '../../types';

interface RecipeRemixListProps {
  parentRecipeId: string;
  onNavigateToRecipe?: (recipeId: string, remixRecipe?: Recipe) => void;
}

export default function RecipeRemixList({
  parentRecipeId,
  onNavigateToRecipe,
}: RecipeRemixListProps) {
  const { getAccessToken } = useAuth();
  const { t } = useI18n();
  const [remixes, setRemixes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadRemixes() {
      if (!parentRecipeId) return;
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/recipes/${parentRecipeId}/remixes`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (Array.isArray(data.remixes)) {
            setRemixes(data.remixes);
          }
        }
      } catch (err) {
        console.warn('[RecipeRemixList] Failed to fetch remixes:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    void loadRemixes();
    return () => {
      isCancelled = true;
    };
  }, [parentRecipeId, getAccessToken]);

  if (!loading && remixes.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
          <Sparkles className="w-3.5 h-3.5 fill-purple-500/20" />
          <span>{t('remix.yourRemixes') || 'Deine Remixes'} ({remixes.length})</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {remixes.map((remix) => {
          const totalTime = (remix.prepTime || remix.cookTime)
            ? `${(remix.prepTime || 0) + (remix.cookTime || 0)} Min.`
            : null;

          return (
            <button
              key={remix.id}
              type="button"
              onClick={() => {
                hapticLight();
                if (remix.id) {
                  onNavigateToRecipe?.(remix.id, remix);
                }
              }}
              className="w-56 shrink-0 p-2.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 hover:bg-purple-500/20 active:scale-[0.98] transition-all flex items-center gap-2.5 text-left border-none cursor-pointer outline-none shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/10 dark:bg-white/10 shrink-0">
                <CachedImage
                  src={remix.imageUrl}
                  emoji={remix.emoji}
                  alt={remix.title}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                  {remix.title}
                </h5>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 line-clamp-1">
                  {remix.remixPrompt || t('remix.customVariation') || 'Individuelle Variante'}
                </p>
                {totalTime && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <Clock className="w-2.5 h-2.5 text-emerald-500" />
                    <span>{totalTime}</span>
                  </div>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}