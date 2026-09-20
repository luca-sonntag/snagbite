import type { MouseEvent } from 'react';
import { Star, Clock, BookmarkPlus, Check, ChevronRight } from 'lucide-react';
import type { SavedRecipe, Recipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCalories } from '../../utils/formatNutrition';
import { getHealthScoreLetter, getHealthScoreColor } from '../RecipeDetails/HealthScoreBadge';

export type HeroBadgeVariant = 'amber' | 'emerald' | 'indigo' | 'blue' | 'rose' | 'teal';

const BADGE_VARIANT_STYLES: Record<HeroBadgeVariant, string> = {
  amber: 'bg-amber-500/90 text-white shadow-amber-500/20',
  emerald: 'bg-emerald-600/90 text-white shadow-emerald-600/20',
  indigo: 'bg-indigo-600/90 text-white shadow-indigo-600/20',
  blue: 'bg-blue-600/90 text-white shadow-blue-600/20',
  teal: 'bg-teal-600/90 text-white shadow-teal-600/20',
  rose: 'bg-rose-500/90 text-white shadow-rose-500/20',
};

export interface RecipeHeroCardProps {
  job?: SavedRecipe;
  recipe?: Recipe;
  totalTime: string | null;
  badgeText?: string;
  badgeVariant?: HeroBadgeVariant;
  themeRecipeCount?: number;
  onOpenTheme?: (e: MouseEvent) => void;
  isCommunity?: boolean;
  isSaved?: boolean;
  isVital?: boolean;
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
  badgeVariant = 'amber',
  themeRecipeCount,
  onOpenTheme,
  isCommunity = false,
  isSaved = false,
  isVital = false,
  onSaveCommunity,
  onOpenRecipe,
}: RecipeHeroCardProps) {
  const { t } = useI18n();
  const r = recipe || job?.recipe;
  if (!r) return null;

  const score = r.healthScore ?? null;
  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;
  const scoreColors = score !== null ? getHealthScoreColor(score) : null;
  const calories = getRecipeCalories(r);
  const vegGrams = r.healthScoreBreakdown?.metrics?.vegetableGramsPerServing;
  const protein = r.nutritionalValues?.protein;

  const hasMultipleThemeRecipes = Boolean(themeRecipeCount && themeRecipeCount >= 2 && onOpenTheme);

  return (
    <article
      onClick={(e) => {
        hapticLight();
        onOpenRecipe(e, r, job);
      }}
      className="relative group rounded-3xl overflow-hidden bg-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-none select-none cursor-pointer active:scale-[0.98] transition-transform duration-200"
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden">
        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
        />
        {/* Soft Ambient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 via-45% to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex items-center justify-between pointer-events-none">
          {hasMultipleThemeRecipes ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                onOpenTheme?.(e);
              }}
              className={`pointer-events-auto px-2.5 py-1 rounded-full ${
                BADGE_VARIANT_STYLES[badgeVariant] ?? BADGE_VARIANT_STYLES.amber
              } backdrop-blur-md text-[10.5px] sm:text-[11px] font-bold shadow-md flex items-center gap-1.5 tracking-tight active:scale-95 transition-transform border-none cursor-pointer select-none`}
              aria-label={`${badgeText || t('catalog.magazine.heroHighlight')} - ${t('catalog.magazine.heroThemeRecipesCount', { count: themeRecipeCount ?? 0 })}`}
            >
              <span>{badgeText || t('catalog.magazine.heroHighlight')}</span>
              <span className="opacity-60 font-normal">•</span>
              <span className="font-semibold text-white/95">
                {t('catalog.magazine.heroThemeRecipesCount', { count: themeRecipeCount ?? 0 })}
              </span>
              <ChevronRight className="w-3 h-3 stroke-[2.5] text-white/85 shrink-0" />
            </button>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full ${
                BADGE_VARIANT_STYLES[badgeVariant] ?? BADGE_VARIANT_STYLES.amber
              } backdrop-blur-md text-[10px] sm:text-[10.5px] font-bold shadow-sm flex items-center tracking-tight`}
            >
              {badgeText || t('catalog.magazine.heroHighlight')}
            </span>
          )}

          {/* Right Action: Bookmark/Save for Community or Favorite Star for own */}
          {isCommunity ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticMedium();
                onSaveCommunity?.(e, r);
              }}
              className={`pointer-events-auto w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-md transition-all active:scale-90 border-none cursor-pointer ${
                isSaved
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title={isSaved ? t('catalog.magazine.alreadySaved') : t('catalog.magazine.saveToCookbook')}
              aria-label={isSaved ? t('catalog.magazine.alreadySaved') : t('catalog.magazine.saveToCookbook')}
            >
              {isSaved ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <BookmarkPlus className="w-4 h-4 text-indigo-200" />
              )}
            </button>
          ) : job?.isFavorite ? (
            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-amber-400 shadow-md">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          ) : null}
        </div>

        {/* Bottom Content Container */}
        <div className="absolute bottom-3 inset-x-3 text-white flex flex-col">
          {/* Punchy Info Pills - Crisp, compact & high legibility */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-white/90 flex-wrap drop-shadow-xs mb-1.5">
            {totalTime && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10px] shadow-xs shrink-0">
                <Clock className="w-2.5 h-2.5 text-white shrink-0" />
                <span>{totalTime}</span>
              </span>
            )}

            {/* Calories vor Health Score direkt nebeneinander */}
            {(calories !== undefined && calories !== null) || (score !== null && scoreLetter && scoreColors) ? (
              <div className="flex items-center gap-1 shrink-0">
                {totalTime && <span className="text-white/30 text-[9px] mr-0.5">•</span>}
                {calories !== undefined && calories !== null && (
                  <span className="text-white/90 font-medium">
                    {Math.round(calories)} kcal
                  </span>
                )}
                {score !== null && scoreLetter && scoreColors && (
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${scoreColors.pillBg} text-white font-black text-[9px] flex items-center justify-center leading-none shadow-md shrink-0 select-none`}
                    title={`Health Score: ${scoreLetter} (${score}/100)`}
                  >
                    {scoreLetter}
                  </span>
                )}
              </div>
            ) : null}

            {isVital && protein && protein > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {(totalTime || calories !== undefined || score !== null) && (
                  <span className="text-white/30 text-[9px]">•</span>
                )}
                <span className="text-white/90 font-medium">
                  {Math.round(protein)}g Protein
                </span>
              </div>
            )}
            {isVital && vegGrams && vegGrams > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {(totalTime || calories !== undefined || score !== null || (protein && protein > 0)) && (
                  <span className="text-white/30 text-[9px]">•</span>
                )}
                <span className="text-white/90 font-medium">
                  {t('catalog.magazine.vegGrams', { grams: Math.round(vegGrams) })}
                </span>
              </div>
            )}
          </div>

          {/* Title - 100% full width, up to 2 lines without horizontal crunch */}
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight line-clamp-2 font-heading drop-shadow-xs">
            {r.title}
          </h3>

          {/* Bottom Bar: Author Handle & Cook CTA - Snug directly under title */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {r.sourceHandle ? (
              <p className="text-[10.5px] text-gray-300/85 font-medium truncate leading-none">
                {`@${r.sourceHandle.replace(/^@/, '')}`}
              </p>
            ) : (
              <span />
            )}
            <span className="shrink-0 px-2.5 py-1 rounded-xl bg-white text-gray-950 font-bold text-xs group-hover:bg-gray-100 active:scale-95 transition-all shadow-md">
              {t('catalog.magazine.heroCookNow')}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
