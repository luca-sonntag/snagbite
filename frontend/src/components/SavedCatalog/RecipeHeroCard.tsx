import type { MouseEvent } from 'react';
import { Star, Clock } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { getHealthScoreLetter, getHealthScoreColor } from '../RecipeDetails/HealthScoreBadge';

interface RecipeHeroCardProps {
  job: SavedRecipe;
  totalTime: string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
}

/**
 * Cinematic 16:10 Hero Card for the cookbook magazine feed.
 * Highlights the daily spotlight recipe with appetizing edge-to-edge photography,
 * subtle gradient scrim, quiet luxury typography and integrated health score badge.
 */
export default function RecipeHeroCard({
  job,
  totalTime,
  onOpenRecipe,
}: RecipeHeroCardProps) {
  const { t } = useI18n();
  const r = job.recipe;
  if (!r) return null;

  const score = r.healthScore ?? null;
  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;
  const scoreColors = score !== null ? getHealthScoreColor(score) : null;
  const vegGrams = r.healthScoreBreakdown?.metrics?.vegetableGramsPerServing;
  const protein = r.nutritionalValues?.protein;

  return (
    <article
      onClick={(e) => {
        hapticLight();
        onOpenRecipe(e, job);
      }}
      className="relative group rounded-3xl overflow-hidden bg-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-none select-none cursor-pointer active:scale-[0.98] transition-transform duration-200"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
        />
        {/* Soft Ambient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-sm">
              <span>🔥</span>
              <span>{t('catalog.magazine.heroHighlight')}</span>
            </span>

            {/* Health Score Pill */}
            {score !== null && scoreLetter && scoreColors && (
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${scoreColors.badgeBg} backdrop-blur-md text-[11px] font-extrabold shadow-sm ${scoreColors.badgeText}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${scoreColors.pillBg}`} />
                <span>{t('catalog.magazine.scoreBadge', { score, letter: scoreLetter })}</span>
              </span>
            )}
          </div>

          {/* Favorite Star */}
          {job.isFavorite && (
            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-amber-400 shadow-md">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          )}
        </div>

        {/* Bottom Content Container */}
        <div className="absolute bottom-3 inset-x-3 text-white flex flex-col gap-1.5">
          {/* Punchy Info Pills */}
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-300 flex-wrap">
            {totalTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{totalTime}</span>
              </span>
            )}
            {protein && protein > 0 && (
              <>
                <span>•</span>
                <span>💪 {Math.round(protein)}g Protein</span>
              </>
            )}
            {vegGrams && vegGrams > 0 && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">🥗 {t('catalog.magazine.vegGrams', { grams: vegGrams })}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug line-clamp-2 font-heading">
            {r.title}
          </h3>

          {/* Creator handle & Cook CTA */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-300 font-medium truncate">
              {r.sourceHandle ? `@${r.sourceHandle.replace(/^@/, '')}` : (r.category ? r.category.toLowerCase() : '')}
            </span>
            <span className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white text-gray-950 font-bold text-xs group-hover:bg-gray-100 active:scale-95 transition-all shadow-md">
              {t('catalog.magazine.heroCookNow')} →
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
