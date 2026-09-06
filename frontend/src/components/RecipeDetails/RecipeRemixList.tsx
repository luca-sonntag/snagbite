import { useState, useEffect } from 'react';
import { Layers, ChevronRight, Clock, Plus } from 'lucide-react';
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
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <Layers className="w-3.5 h-3.5" />
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
              className="h-[76px] w-64 shrink-0 p-2.5 rounded-2xl bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/80 active:scale-[0.98] transition-all flex items-center gap-3 text-left border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] cursor-pointer outline-none group"
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
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {promptText}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {t('remix.customVariation') || 'Individuelle Variante'}
                  </p>
                )}
                {totalTime && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                    <Clock className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500" />
                    <span>{totalTime}</span>
                  </div>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0" />
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
            className="h-[76px] w-28 shrink-0 p-2.5 rounded-2xl border-none bg-gray-100/70 hover:bg-gray-200/70 dark:bg-gray-900/70 dark:hover:bg-gray-800/70 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all active:scale-[0.98] outline-none group"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 line-clamp-1">
              {t('remix.newRemixBtn') || 'Neuer Remix'}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}