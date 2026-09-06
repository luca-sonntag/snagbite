import { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, Clock, Plus } from 'lucide-react';
import { apiUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import CachedImage from '../CachedImage';
import type { Recipe } from '../../types';

interface RecipeRemixListProps {
  parentRecipeId: string;
  onNavigateToRecipe?: (recipeId: string, remixRecipe?: Recipe) => void;
  onRemixClick?: () => void;
}

function formatRemixPrompt(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, '')
    .replace(/\s*\([A-Z_]+\)/g, '')
    .replace(/\s*(hinzufügen|ersetzen|austauschen|ergänzen)\s*$/i, '')
    .trim();
}

export default function RecipeRemixList({
  parentRecipeId,
  onNavigateToRecipe,
  onRemixClick,
}: RecipeRemixListProps) {
  const { getAccessToken } = useAuth();
  const { t } = useI18n();
  const [remixes, setRemixes] = useState<Recipe[]>([]);

  useEffect(() => {
    let isCancelled = false;
    async function loadRemixes() {
      if (!parentRecipeId) return;
      try {
        const token = await getAccessToken();
        if (!token || isCancelled) return;
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
      }
    }

    void loadRemixes();
    return () => {
      isCancelled = true;
    };
  }, [parentRecipeId, getAccessToken]);

  if (remixes.length === 0) {
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
          const promptText = formatRemixPrompt(remix.remixPrompt);

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
              className="h-[76px] w-64 shrink-0 p-2.5 rounded-2xl bg-white dark:bg-zinc-850/90 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center gap-3 text-left border border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/40 shadow-xs cursor-pointer outline-none group"
            >
              <div className="w-13 h-13 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
                <CachedImage
                  src={remix.imageUrl}
                  emoji={remix.emoji}
                  alt={remix.title}
                  className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug">
                  {remix.title}
                </h5>
                {promptText ? (
                  <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 italic truncate block bg-purple-500/10 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-md mt-0.5 max-w-full">
                    „{promptText}“
                  </span>
                ) : (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                    {t('remix.customVariation') || 'Individuelle Variante'}
                  </p>
                )}
                {totalTime && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                    <Clock className="w-2.5 h-2.5 text-emerald-500" />
                    <span>{totalTime}</span>
                  </div>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-purple-400/80 group-hover:text-purple-600 dark:group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}

        {/* Quick Action: + Neuer Remix Button */}
        {onRemixClick && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onRemixClick();
            }}
            className="h-[76px] w-32 shrink-0 p-2.5 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 dark:border-purple-500/40 dark:hover:border-purple-500/70 bg-purple-500/5 hover:bg-purple-500/10 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all active:scale-[0.98] outline-none"
          >
            <div className="w-7 h-7 rounded-full bg-purple-500/15 dark:bg-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 line-clamp-1">
              {t('remix.newRemixBtn') || 'Neuer Remix'}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}