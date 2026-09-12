import type { MouseEvent } from 'react';
import { Star, Clock, Sparkles, BookmarkPlus, Check } from 'lucide-react';
import type { SavedRecipe, Recipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { getHealthScoreLetter, getHealthScoreColor } from '../RecipeDetails/HealthScoreBadge';

export interface RecipeHeroCardProps {
  job?: SavedRecipe;
  recipe?: Recipe;
  totalTime: string | null;
  badgeText?: string;
  badgeVariant?: 'emerald' | 'indigo' | 'amber';
  isCommunity?: boolean;
  isSaved?: boolean;
  onSaveCommunity?: (e: MouseEvent, recipe: Recipe) => void;
  onOpenRecipe: (e: MouseEvent, recipe: Recipe, job?: SavedRecipe) => void;
}

/**
 * Cinematic 16:10 Hero Card for the cookbook magazine feed.
 * Highlights the daily spotlight recipe with appetizing edge-to-edge photography,
 * subtle gradient scrim, quiet luxury typography and integrated health score badge.
 */
export default function RecipeHeroCard({
  job,
  recipe,
  totalTime,
  badgeText,
  badgeVariant = 'emerald',
  isCommunity = false,
  isSaved = false,
  onSaveCommunity,
  onOpenRecipe,
}: RecipeHeroCardProps) {
  const { t } = useI18n();
  const r = recipe || job?.recipe;
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
        onOpenRecipe(e, r, job);
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
          <span
            className={`px-2.5 py-1 rounded-full ${
              badgeVariant === 'indigo'
                ? 'bg-indigo-600/90 text-white'
                : badgeVariant === 'amber'
                ? 'bg-amber-500/90 text-white'
                : 'bg-emerald-500/90 text-white'
            } backdrop-blur-md text-[11px] font-bold shadow-sm flex items-center gap-1`}
          >
            {isCommunity && <Sparkles className="w-3 h-3 text-indigo-200" />}
            {badgeText || t('catalog.magazine.heroHighlight')}
          </span>

          {/* Right Action: Bookmark/Save for Community or Favorite Star for own */}
          {isCommunity ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticMedium();
                onSaveCommunity?.(e, r);
              }}
              className={`pointer-events-auto h-8 px-2.5 rounded-full backdrop-blur-md flex items-center gap-1.5 font-bold text-[11px] shadow-md transition-all active:scale-90 border-none cursor-pointer ${
                isSaved
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title={isSaved ? t('catalog.magazine.alreadySaved') : t('catalog.magazine.saveToCookbook')}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">{t('catalog.magazine.alreadySaved')}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5 text-indigo-200" />
                  <span>{t('catalog.magazine.saveToCookbook')}</span>
                </>
              )}
            </button>
          ) : job?.isFavorite ? (
            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-amber-400 shadow-md">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          ) : null}
        </div>

        {/* Bottom Content Container */}
        <div className="absolute bottom-3 inset-x-3 text-white flex flex-col gap-1.5">
          {/* Punchy Info Pills - Crisp White & High Legibility */}
          <div className="flex items-center gap-2 text-xs font-semibold text-white/95 flex-wrap drop-shadow-xs">
            {totalTime && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white font-bold text-[11px] shadow-xs">
                <Clock className="w-3 h-3 text-white shrink-0" />
                <span>{totalTime}</span>
              </span>
            )}

            {/* Health Score direkt hinter Dauer mit Punkt-Separator */}
            {score !== null && scoreLetter && scoreColors && (
              <>
                {totalTime && <span className="text-white/40">•</span>}
                <span
                  className={`w-4.5 h-4.5 rounded-full ${scoreColors.pillBg} text-white font-black text-[10px] flex items-center justify-center leading-none shadow-md shrink-0 select-none`}
                  title={`Health Score: ${scoreLetter} (${score}/100)`}
                >
                  {scoreLetter}
                </span>
              </>
            )}

            {protein && protein > 0 && (
              <>
                {(totalTime || score !== null) && <span className="text-white/40">•</span>}
                <span className="text-white font-medium">
                  {Math.round(protein)}g Protein
                </span>
              </>
            )}
            {vegGrams && vegGrams > 0 && (
              <>
                {(totalTime || score !== null || (protein && protein > 0)) && <span className="text-white/40">•</span>}
                <span className="text-white font-medium">
                  {t('catalog.magazine.vegGrams', { grams: vegGrams })}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug line-clamp-2 font-heading">
            {r.title}
          </h3>

          {/* Creator handle & Cook CTA (ohne Pfeil) */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-300 font-medium truncate">
              {r.sourceHandle ? `@${r.sourceHandle.replace(/^@/, '')}` : ''}
            </span>
            <span className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white text-gray-950 font-bold text-xs group-hover:bg-gray-100 active:scale-95 transition-all shadow-md">
              {t('catalog.magazine.heroCookNow')}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
