import type { MouseEvent } from 'react';
import type { SavedRecipe, Recipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { getRecipeCalories } from '../../utils/formatNutrition';
import { getHealthScoreLetter, getHealthScoreColor } from '../RecipeDetails/HealthScoreBadge';
import { useCachedImage } from '../../hooks/useCachedImage';
import HeroTopBadges, { type HeroBadgeVariant } from './HeroTopBadges';
import HeroInfoPills from './HeroInfoPills';
import { resolveHeroAuthorHandle } from './heroAuthorUtils';

export type { HeroBadgeVariant };

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
  isSelected?: boolean;
  isSelectMode?: boolean;
  bindLongPress?: any;
}

/**
 * Cinematic 16:10 Hero Card for the cookbook magazine feed.
 * Highlights the daily spotlight recipe with appetizing edge-to-edge photography,
 * subtle gradient scrim, quiet luxury typography, author handle, and health score badge.
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
  isSelected = false,
  isSelectMode = false,
  bindLongPress,
}: RecipeHeroCardProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const r = recipe || job?.recipe;
  if (!r) return null;

  const coverUrl = r.imageUrl || r.imageUrls?.[0];
  const { src: imageSrc } = useCachedImage(coverUrl);
  const hasImage = Boolean(imageSrc || coverUrl);

  const score = r.healthScore ?? null;
  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;
  const scoreColors = score !== null ? getHealthScoreColor(score) : null;
  const calories = getRecipeCalories(r);
  const vegGrams = r.healthScoreBreakdown?.metrics?.vegetableGramsPerServing;
  const protein = r.nutritionalValues?.protein;

  const hasMultipleThemeRecipes = Boolean(themeRecipeCount && themeRecipeCount >= 2 && onOpenTheme);

  const byYouLabel = t('catalog.magazine.heroAuthorByYou') || 'Von dir';
  const authorHandle = resolveHeroAuthorHandle({
    sourceHandle: r.sourceHandle,
    createdBy: r.createdBy,
    isCommunity,
    jobSource: job?.source,
    currentUserId: user?.id,
    byYouLabel,
  });

  return (
    <article
      onClick={(e) => {
        hapticLight();
        onOpenRecipe(e, r, job);
      }}
      className={`relative group rounded-3xl overflow-hidden border-none select-none cursor-pointer active:scale-[0.98] transition-transform duration-200 ${
        hasImage
          ? 'bg-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
          : 'bg-white dark:bg-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10'
      } ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
      {...(!isCommunity ? (bindLongPress ?? {}) : {})}
    >
      <div className={`relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden ${hasImage ? '' : 'bg-black/5 dark:bg-white/5'}`}>
        <CachedImage
          src={coverUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
        />
        {/* Soft Ambient Scrim */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            hasImage
              ? 'bg-gradient-to-t from-black/95 via-black/30 via-45% to-transparent'
              : 'bg-gradient-to-t from-white via-white/80 via-45% to-transparent dark:from-gray-950 dark:via-gray-950/70 dark:via-45% dark:to-transparent'
          }`}
        />

        {/* Top Badges */}
        <HeroTopBadges
          isSelectMode={isSelectMode}
          isCommunity={isCommunity}
          isSelected={isSelected}
          hasImage={hasImage}
          hasMultipleThemeRecipes={hasMultipleThemeRecipes}
          badgeVariant={badgeVariant}
          badgeText={badgeText}
          themeRecipeCount={themeRecipeCount}
          onOpenTheme={onOpenTheme}
          isSaved={isSaved}
          onSaveCommunity={onSaveCommunity}
          recipe={r}
          isFavorite={job?.isFavorite}
        />

        {/* Bottom Content Container */}
        <div className={`absolute bottom-3 inset-x-3 flex flex-col ${hasImage ? 'text-white' : ''}`}>
          {/* Punchy Info Pills */}
          <HeroInfoPills
            totalTime={totalTime}
            calories={calories}
            score={score}
            scoreLetter={scoreLetter}
            scoreColors={scoreColors}
            isVital={isVital}
            protein={protein}
            vegGrams={vegGrams}
            hasImage={hasImage}
          />

          {/* Title - 100% full width, up to 2 lines without horizontal crunch */}
          <h3
            className={`text-base sm:text-lg font-bold tracking-tight leading-tight line-clamp-2 font-heading ${
              hasImage ? 'text-white drop-shadow-xs' : 'text-gray-900 dark:text-white'
            }`}
          >
            {r.title}
          </h3>

          {/* Bottom Bar: Author Handle & Cook CTA - Snug directly under title */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {authorHandle ? (
              <p
                className={`text-[10.5px] font-medium truncate leading-none ${
                  hasImage ? 'text-gray-300/85' : 'text-gray-500 dark:text-gray-300/85'
                }`}
              >
                {authorHandle}
              </p>
            ) : (
              <span />
            )}
            <span
              className={`shrink-0 px-2.5 py-1 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-md ${
                hasImage
                  ? 'bg-white text-gray-950 hover:bg-gray-100'
                  : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100 group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-500 dark:group-hover:text-white'
              }`}
            >
              {t('catalog.magazine.heroCookNow')}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
